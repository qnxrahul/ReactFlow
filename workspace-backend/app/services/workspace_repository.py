from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List
from uuid import uuid4

from azure.cosmos import CosmosClient, PartitionKey
from azure.cosmos.exceptions import CosmosResourceNotFoundError

from ..config import Settings
from ..models import Workspace, WorkspaceCreateRequest, WorkspaceFile, WorkspaceUpdateRequest


class WorkspaceRepository:
    def list_workspaces(self) -> List[Workspace]:
        raise NotImplementedError

    def get_workspace(self, workspace_id: str) -> Workspace:
        raise NotImplementedError

    def create_workspace(self, payload: WorkspaceCreateRequest) -> Workspace:
        raise NotImplementedError

    def update_workspace(self, workspace_id: str, payload: WorkspaceUpdateRequest) -> Workspace:
        raise NotImplementedError

    def append_file(self, workspace_id: str, file: WorkspaceFile) -> Workspace:
        raise NotImplementedError


class CosmosWorkspaceRepository(WorkspaceRepository):
    def __init__(self, settings: Settings):
        if not settings.azure_cosmos_endpoint or not settings.azure_cosmos_key:
            raise ValueError("Cosmos DB endpoint and key must be provided.")

        self._client = CosmosClient(settings.azure_cosmos_endpoint, credential=settings.azure_cosmos_key)
        self._database_name = settings.azure_cosmos_database
        self._container_name = settings.azure_cosmos_container
        self._partition_key = PartitionKey(path="/id")

        self._database = self._client.create_database_if_not_exists(id=self._database_name)
        self._container = self._database.create_container_if_not_exists(
            id=self._container_name,
            partition_key=self._partition_key,
            offer_throughput=settings.azure_cosmos_throughput,
        )

    def _to_workspace(self, raw: Dict) -> Workspace:
        return Workspace.model_validate(raw)

    def list_workspaces(self) -> List[Workspace]:
        query = "SELECT * FROM c ORDER BY c.createdAt DESC"
        items = list(self._container.query_items(query=query, enable_cross_partition_query=True))
        return [self._to_workspace(item) for item in items]

    def get_workspace(self, workspace_id: str) -> Workspace:
        try:
            item = self._container.read_item(item=workspace_id, partition_key=workspace_id)
        except CosmosResourceNotFoundError as exc:
            raise KeyError(workspace_id) from exc
        return self._to_workspace(item)

    def create_workspace(self, payload: WorkspaceCreateRequest) -> Workspace:
        workspace_id = f"workspace-{uuid4()}"
        now = datetime.utcnow()
        workspace = Workspace(
            id=workspace_id,
            title=payload.title,
            template=payload.template,
            meta=payload.meta,
            color=payload.color,
            position=payload.position,
            lanes=payload.lanes,
            tasksCount=payload.tasks_count,
            filesCount=payload.files_count,
            files=[],
            createdAt=now,
            updatedAt=now,
        )
        self._container.create_item(workspace.model_dump(by_alias=True))
        return workspace

    def update_workspace(self, workspace_id: str, payload: WorkspaceUpdateRequest) -> Workspace:
        workspace = self.get_workspace(workspace_id)
        data = workspace.model_dump(by_alias=True)

        if payload.title is not None:
            data["title"] = payload.title
        if payload.template is not None:
            data["template"] = payload.template
        if payload.meta is not None:
            data["meta"] = payload.meta
        if payload.color is not None:
            data["color"] = payload.color
        if payload.position is not None:
            data["position"] = payload.position.model_dump()
        if payload.lanes is not None:
            data["lanes"] = [lane.model_dump() for lane in payload.lanes]
        if payload.tasks_count is not None:
            data["tasksCount"] = payload.tasks_count
        if payload.files_count is not None:
            data["filesCount"] = payload.files_count

        data["updatedAt"] = datetime.utcnow().isoformat()

        self._container.replace_item(item=workspace_id, body=data)
        return self.get_workspace(workspace_id)

    def append_file(self, workspace_id: str, file: WorkspaceFile) -> Workspace:
        workspace = self.get_workspace(workspace_id)
        data = workspace.model_dump(by_alias=True)
        files = data.get("files", [])
        files.append(file.model_dump(by_alias=True))
        data["files"] = files
        data["filesCount"] = (data.get("filesCount") or 0) + 1
        data["updatedAt"] = datetime.utcnow().isoformat()
        self._container.replace_item(item=workspace_id, body=data)
        return self.get_workspace(workspace_id)


class FileBackedWorkspaceRepository(WorkspaceRepository):
    """
    Fallback repository that persists workspace data into a local JSON file.
    Meant for development when Cosmos credentials are unavailable.
    """

    def __init__(self, root: Path):
        self._path = root / "workspaces.json"
        root.mkdir(parents=True, exist_ok=True)
        if not self._path.exists():
            self._path.write_text(json.dumps({"items": []}, indent=2))

    def _load(self) -> List[Dict]:
        data = json.loads(self._path.read_text())
        return data.get("items", [])

    def _dump(self, items: List[Dict]) -> None:
        self._path.write_text(json.dumps({"items": items}, indent=2, default=str))

    def list_workspaces(self) -> List[Workspace]:
        return [Workspace.model_validate(item) for item in self._load()]

    def get_workspace(self, workspace_id: str) -> Workspace:
        for item in self._load():
            if item["id"] == workspace_id:
                return Workspace.model_validate(item)
        raise KeyError(workspace_id)

    def create_workspace(self, payload: WorkspaceCreateRequest) -> Workspace:
        workspace_id = f"workspace-{uuid4()}"
        now = datetime.utcnow().isoformat()
        workspace = Workspace(
            id=workspace_id,
            title=payload.title,
            template=payload.template,
            meta=payload.meta,
            color=payload.color,
            position=payload.position,
            lanes=payload.lanes,
            tasksCount=payload.tasks_count,
            filesCount=payload.files_count,
            files=[],
            createdAt=now,
            updatedAt=now,
        )
        items = self._load()
        items.append(workspace.model_dump(by_alias=True))
        self._dump(items)
        return workspace

    def update_workspace(self, workspace_id: str, payload: WorkspaceUpdateRequest) -> Workspace:
        items = self._load()
        for idx, item in enumerate(items):
            if item["id"] != workspace_id:
                continue
            if payload.title is not None:
                item["title"] = payload.title
            if payload.template is not None:
                item["template"] = payload.template
            if payload.meta is not None:
                item["meta"] = payload.meta
            if payload.color is not None:
                item["color"] = payload.color
            if payload.position is not None:
                item["position"] = payload.position.model_dump()
            if payload.lanes is not None:
                item["lanes"] = [lane.model_dump() for lane in payload.lanes]
            if payload.tasks_count is not None:
                item["tasksCount"] = payload.tasks_count
            if payload.files_count is not None:
                item["filesCount"] = payload.files_count
            item["updatedAt"] = datetime.utcnow().isoformat()
            items[idx] = item
            self._dump(items)
            return Workspace.model_validate(item)
        raise KeyError(workspace_id)

    def append_file(self, workspace_id: str, file: WorkspaceFile) -> Workspace:
        items = self._load()
        for idx, item in enumerate(items):
            if item["id"] != workspace_id:
                continue
            files = item.get("files", [])
            files.append(file.model_dump(by_alias=True))
            item["files"] = files
            item["filesCount"] = (item.get("filesCount") or 0) + 1
            item["updatedAt"] = datetime.utcnow().isoformat()
            items[idx] = item
            self._dump(items)
            return Workspace.model_validate(item)
        raise KeyError(workspace_id)
