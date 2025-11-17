from functools import lru_cache

from fastapi import Depends

from .config import Settings, get_settings
from .services.blob_storage import BlobStorageService
from .services.workspace_repository import CosmosWorkspaceRepository, FileBackedWorkspaceRepository, WorkspaceRepository


@lru_cache
def _blob_service(settings: Settings) -> BlobStorageService:
    return BlobStorageService(settings)


@lru_cache
def _workspace_repository(settings: Settings) -> WorkspaceRepository:
    if settings.azure_cosmos_endpoint and settings.azure_cosmos_key:
        return CosmosWorkspaceRepository(settings)
    if not settings.enable_local_fallbacks:
        raise ValueError("Cosmos DB credentials are required when fallbacks are disabled.")
    from pathlib import Path

    return FileBackedWorkspaceRepository(Path(settings.local_blob_root))


def get_blob_service(settings: Settings = Depends(get_settings)) -> BlobStorageService:
    return _blob_service(settings)


def get_workspace_repository(settings: Settings = Depends(get_settings)) -> WorkspaceRepository:
    return _workspace_repository(settings)
