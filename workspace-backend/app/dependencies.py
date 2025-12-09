from functools import lru_cache
from pathlib import Path
from typing import Optional

from fastapi import Depends

from .config import Settings, get_settings
from .services.blob_storage import BlobStorageService
from .services.llm_client import OpenRouterClient
from .services.policy import WorkflowPolicyService
from .services.rag import RAGService
from .services.registry_store import ComponentRegistryStore
from .services.workspace_repository import CosmosWorkspaceRepository, FileBackedWorkspaceRepository, WorkspaceRepository
from .services.workflow_repository import (
    CosmosWorkflowRepository as DynamicCosmosRepository,
    FileBackedWorkflowRepository,
    SqlWorkflowRepository,
    WorkflowRepository as DynamicWorkflowRepository,
)


def get_blob_service(settings: Settings = Depends(get_settings)) -> BlobStorageService:
    return BlobStorageService(settings)


def get_workspace_repository(settings: Settings = Depends(get_settings)) -> WorkspaceRepository:
    if settings.azure_cosmos_endpoint and settings.azure_cosmos_key:
        return CosmosWorkspaceRepository(settings)
    if not settings.enable_local_fallbacks:
        raise ValueError("Cosmos DB credentials are required when fallbacks are disabled.")
    return FileBackedWorkspaceRepository(Path(settings.local_blob_root))


def get_workflow_repository(settings: Settings = Depends(get_settings)) -> DynamicWorkflowRepository:
    if settings.azure_cosmos_endpoint and settings.azure_cosmos_key:
        return DynamicCosmosRepository(settings)
    if settings.workflow_db_url:
        return SqlWorkflowRepository(settings.workflow_db_url)
    return FileBackedWorkflowRepository(Path(settings.registry_store_root))


def get_component_registry_store(settings: Settings = Depends(get_settings)) -> ComponentRegistryStore:
    return ComponentRegistryStore(Path(settings.registry_store_root))


@lru_cache
def _cached_rag(path: str) -> RAGService:
    return RAGService(Path(path))


def get_rag_service(settings: Settings = Depends(get_settings)) -> RAGService:
    return _cached_rag(settings.workflow_knowledge_path)


@lru_cache
def _cached_llm(api_key: Optional[str], model: str, base_url: str) -> OpenRouterClient:
    return OpenRouterClient(api_key=api_key, model=model, base_url=base_url)


def get_llm_client(settings: Settings = Depends(get_settings)) -> OpenRouterClient:
    return _cached_llm(settings.openrouter_api_key, settings.openrouter_model, settings.openrouter_base_url)


@lru_cache
def _cached_policy(min_nodes: int, max_nodes: int) -> WorkflowPolicyService:
    return WorkflowPolicyService(min_nodes=min_nodes, max_nodes=max_nodes)


def get_policy_service(settings: Settings = Depends(get_settings)) -> WorkflowPolicyService:
    return _cached_policy(settings.workflow_policy_min_nodes, settings.workflow_policy_max_nodes)
