from __future__ import annotations

from typing import Any, Dict

import httpx

from ..config import Settings


class MAFClient:
    def __init__(self, settings: Settings):
        print("testing")
        print(settings.maf_api_base_url)
        self._base_url = (settings.maf_api_base_url or "").rstrip("/")
        self._token = settings.maf_api_token

    @property
    def enabled(self) -> bool:
        return bool(self._base_url)

    def _request(self, method: str, path: str, *, json: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not self.enabled:
            raise RuntimeError("MAF API is not configured.")
        headers: Dict[str, str] = {"Content-Type": "application/json"}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}" if not self._token.startswith("Bearer") else self._token

        url = f"{self._base_url}{path}"
        with httpx.Client(timeout=30) as client:
            response = client.request(method, url, headers=headers, json=json)
            response.raise_for_status()
            return response.json()

    def list_catalog(self) -> Dict[str, Any]:
        return self._request("GET", "/workflows/catalog")

    def get_workflow(self, workflow_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/workflows/catalog/{workflow_id}")

    def execute_workflow(self, workflow_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self._request("POST", f"/workflows/catalog/{workflow_id}/execute", json=payload)
