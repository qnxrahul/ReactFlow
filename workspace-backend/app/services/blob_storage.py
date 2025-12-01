from __future__ import annotations

import os
from pathlib import Path
from typing import Optional
from uuid import uuid4

from azure.core.exceptions import ResourceExistsError
from azure.storage.blob import BlobServiceClient, ContentSettings

from ..config import Settings
from ..models import FileUploadMetadata


def _sanitize_filename(filename: str) -> str:
    keep = [c for c in filename if c.isalnum() or c in (".", "-", "_")]
    sanitized = "".join(keep) or "file"
    return sanitized[:120]


class BlobStorageService:
    """
    Uploads files to Azure Blob Storage. Falls back to the local filesystem when
    Azure credentials are not provided and fallbacks are enabled.
    """

    def __init__(self, settings: Settings):
        self._settings = settings
        self._use_local = False
        self._container_name = settings.azure_storage_container
        self._local_root = Path(settings.local_blob_root)
        self._service_client: Optional[BlobServiceClient] = None

        if settings.azure_storage_connection_string:
            try:
                self._service_client = BlobServiceClient.from_connection_string(settings.azure_storage_connection_string)
            except ValueError:
                if not settings.enable_local_fallbacks:
                    raise
                self._use_local = True
        elif settings.azure_storage_account_url:
            credential: Optional[str] = None
            if settings.azure_storage_sas_token:
                credential = settings.azure_storage_sas_token
            elif settings.azure_storage_account_key:
                credential = settings.azure_storage_account_key
            self._service_client = BlobServiceClient(settings.azure_storage_account_url, credential=credential)
        else:
            if not settings.enable_local_fallbacks:
                raise ValueError(
                    "Azure Storage credentials are required. Provide AZURE_STORAGE_CONNECTION_STRING or "
                    "AZURE_STORAGE_ACCOUNT_URL/AZURE_STORAGE_ACCOUNT_KEY."
                )
            self._use_local = True

        if self._use_local:
            self._local_root.mkdir(parents=True, exist_ok=True)
        else:
            self._ensure_container()

    def _ensure_container(self) -> None:
        if self._use_local or not self._service_client:
            return
        container_client = self._service_client.get_container_client(self._container_name)
        try:
            container_client.create_container()
        except ResourceExistsError:
            pass

    def upload(self, workspace_id: str, filename: str, data: bytes, content_type: Optional[str]) -> FileUploadMetadata:
        safe_filename = _sanitize_filename(filename)
        blob_name = f"workspaces/{workspace_id}/{uuid4()}_{safe_filename}"

        if self._use_local:
            target_path = self._local_root / blob_name
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_bytes(data)
            return {
                "blob_url": str(target_path.resolve()),
                "blob_name": blob_name,
                "size": len(data),
                "content_type": content_type,
            }

        container_client = self._service_client.get_container_client(self._container_name)  # type: ignore[union-attr]
        blob_client = container_client.get_blob_client(blob_name)
        content_settings = ContentSettings(content_type=content_type) if content_type else None
        blob_client.upload_blob(data, overwrite=True, content_settings=content_settings)
        return {
            "blob_url": blob_client.url,
            "blob_name": blob_name,
            "size": len(data),
            "content_type": content_type,
        }
