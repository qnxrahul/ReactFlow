from fastapi import Depends

from .config import Settings, get_settings
from .services.blob_storage import BlobStorageService
from .services.workspace_repository import CosmosWorkspaceRepository, FileBackedWorkspaceRepository, WorkspaceRepository


def get_blob_service(settings: Settings = Depends(get_settings)) -> BlobStorageService:
    return BlobStorageService(settings)


def get_workspace_repository(settings: Settings = Depends(get_settings)) -> WorkspaceRepository:
    if settings.azure_cosmos_endpoint and settings.azure_cosmos_key:
        return CosmosWorkspaceRepository(settings)
    if not settings.enable_local_fallbacks:
        raise ValueError("Cosmos DB credentials are required when fallbacks are disabled.")
    from pathlib import Path

    return FileBackedWorkspaceRepository(Path(settings.local_blob_root))
