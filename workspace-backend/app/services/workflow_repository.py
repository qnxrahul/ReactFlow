from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from ..models_workflow import WorkflowDefinition


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
*** End of File