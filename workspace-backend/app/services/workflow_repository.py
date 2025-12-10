from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from azure.cosmos import CosmosClient, PartitionKey
from azure.cosmos.exceptions import CosmosResourceNotFoundError
from sqlalchemy import Column, DateTime, MetaData, String, Table, Text, create_engine, select
from sqlalchemy.engine import Engine

from ..models_workflow import WorkflowDefinition
from ..config import Settings


class WorkflowRepository:
    def list(self) -> List[WorkflowDefinition]:
        raise NotImplementedError

    def get(self, workflow_id: str) -> WorkflowDefinition:
        raise NotImplementedError

    def save(self, workflow: WorkflowDefinition) -> WorkflowDefinition:
        raise NotImplementedError


class FileBackedWorkflowRepository(WorkflowRepository):
    def __init__(self, root: Path):
        self._path = root / "workflows.json"
        root.mkdir(parents=True, exist_ok=True)
        if not self._path.exists():
            self._path.write_text(json.dumps({"items": []}, indent=2))

    def _load(self) -> List[Dict]:
        data = json.loads(self._path.read_text())
        return data.get("items", [])

    def _dump(self, items: List[Dict]) -> None:
        self._path.write_text(json.dumps({"items": items}, indent=2, default=str))

    def list(self) -> List[WorkflowDefinition]:
        return [WorkflowDefinition.model_validate(item) for item in self._load()]

    def get(self, workflow_id: str) -> WorkflowDefinition:
        for item in self._load():
            if item["id"] == workflow_id:
                return WorkflowDefinition.model_validate(item)
        raise KeyError(workflow_id)

    def save(self, workflow: WorkflowDefinition) -> WorkflowDefinition:
        items = self._load()
        now = datetime.utcnow()
        workflow.updated_at = now
        exists = False
        for idx, item in enumerate(items):
            if item["id"] == workflow.id:
                exists = True
                items[idx] = workflow.model_dump(by_alias=True)
                break
        if not exists:
            items.append(workflow.model_dump(by_alias=True))
        self._dump(items)
        return workflow


class CosmosWorkflowRepository(WorkflowRepository):
    def __init__(self, settings: Settings):
        if not settings.azure_cosmos_endpoint or not settings.azure_cosmos_key:
            raise ValueError("Cosmos DB credentials are required for the workflow repository.")

        self._client = CosmosClient(settings.azure_cosmos_endpoint, credential=settings.azure_cosmos_key)
        self._database = self._client.create_database_if_not_exists(id=settings.azure_cosmos_database)
        self._container = self._database.create_container_if_not_exists(
            id=settings.workflow_cosmos_container,
            partition_key=PartitionKey(path="/id"),
            offer_throughput=settings.azure_cosmos_throughput,
        )

    def list(self) -> List[WorkflowDefinition]:
        query = "SELECT * FROM c ORDER BY c.updatedAt DESC"
        items = list(self._container.query_items(query=query, enable_cross_partition_query=True))
        return [WorkflowDefinition.model_validate(item) for item in items]

    def get(self, workflow_id: str) -> WorkflowDefinition:
        try:
            item = self._container.read_item(item=workflow_id, partition_key=workflow_id)
        except CosmosResourceNotFoundError as exc:
            raise KeyError(workflow_id) from exc
        return WorkflowDefinition.model_validate(item)

    def save(self, workflow: WorkflowDefinition) -> WorkflowDefinition:
        workflow.updated_at = datetime.utcnow()
        payload = workflow.model_dump(by_alias=True, mode="json")
        try:
            self._container.replace_item(item=workflow.id, body=payload)
        except CosmosResourceNotFoundError:
            self._container.create_item(payload)
        return workflow


class SqlWorkflowRepository(WorkflowRepository):
    def __init__(self, db_url: str):
        self._engine: Engine = create_engine(db_url, future=True)
        self._metadata = MetaData()
        self._table = Table(
            "workflows",
            self._metadata,
            Column("id", String, primary_key=True),
            Column("title", String, nullable=False),
            Column("domain", String, nullable=False),
            Column("intent", String),
            Column("source", String, nullable=False),
            Column("payload", Text, nullable=False),
            Column("updated_at", DateTime(timezone=True), nullable=False),
        )
        self._metadata.create_all(self._engine)

    def list(self) -> List[WorkflowDefinition]:
        stmt = select(self._table).order_by(self._table.c.updated_at.desc())
        with self._engine.begin() as conn:
            rows = conn.execute(stmt).all()
        return [WorkflowDefinition.model_validate(json.loads(row.payload)) for row in rows]

    def get(self, workflow_id: str) -> WorkflowDefinition:
        stmt = select(self._table).where(self._table.c.id == workflow_id)
        with self._engine.begin() as conn:
            row = conn.execute(stmt).first()
        if not row:
            raise KeyError(workflow_id)
        return WorkflowDefinition.model_validate(json.loads(row.payload))

    def save(self, workflow: WorkflowDefinition) -> WorkflowDefinition:
        workflow.updated_at = datetime.utcnow()
        payload = json.dumps(workflow.model_dump(by_alias=True, mode="json"), default=str)
        with self._engine.begin() as conn:
            existing = conn.execute(select(self._table.c.id).where(self._table.c.id == workflow.id)).first()
            values = {
                "title": workflow.title,
                "domain": workflow.domain,
                "intent": workflow.intent,
                "source": workflow.source,
                "payload": payload,
                "updated_at": workflow.updated_at,
            }
            if existing:
                conn.execute(self._table.update().where(self._table.c.id == workflow.id).values(**values))
            else:
                conn.execute(self._table.insert().values(id=workflow.id, **values))
        return workflow