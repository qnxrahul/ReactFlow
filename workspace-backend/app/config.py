from functools import lru_cache
from typing import List, Optional

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Runtime configuration for the workspace backend.

    The settings are intentionally designed to support both production (Azure-backed)
    and local development (fallback) scenarios. Provide the Azure credentials via
    environment variables or a `.env` file co-located with the project root.
    """

    # General
    app_name: str = "Workspace Service"
    environment: str = Field(default="development", description="Arbitrary environment label.")

    # CORS
    cors_origins: List[AnyHttpUrl] | List[str] = Field(
        default=["*"],
        description="Allowed origins for CORS. Use a comma-separated string or repeatable env var.",
    )

    # Azure Blob Storage
    azure_storage_connection_string: Optional[str] = Field(
        default=None,
        description="Azure Storage connection string. Preferred over account URL/key.",
    )
    azure_storage_account_url: Optional[str] = Field(
        default=None, description="Azure Storage account blob service URL (e.g. https://account.blob.core.windows.net)."
    )
    azure_storage_account_key: Optional[str] = Field(
        default=None, description="Azure Storage account key (ignored when connection string provided)."
    )
    azure_storage_sas_token: Optional[str] = Field(
        default=None, description="Optional SAS token for the storage account."
    )
    azure_storage_container: str = Field(default="workspace-files", description="Default container for workspace uploads.")

    # Cosmos DB
    azure_cosmos_endpoint: Optional[str] = Field(default=None, description="Cosmos DB endpoint URL.")
    azure_cosmos_key: Optional[str] = Field(default=None, description="Primary key for Cosmos DB.")
    azure_cosmos_database: str = Field(default="workspace", description="Cosmos DB database name.")
    azure_cosmos_container: str = Field(default="workspaces", description="Cosmos DB container name.")
    azure_cosmos_throughput: int = Field(default=400, description="Provisioned throughput when creating container.")

    # Local fallbacks
    enable_local_fallbacks: bool = Field(
        default=True,
        description="Allow in-memory/local storage when Azure credentials are missing. Useful for development.",
    )
    local_blob_root: str = Field(
        default="./.blob-data",
        description="Filesystem path used for blob persistence when fallbacks are enabled.",
    )
    registry_store_root: str = Field(
        default="./.workflow-registry",
        description="Filesystem path for workflow component/handler registry when database storage is not configured.",
    )

    # Workflow persistence + generation
    workflow_db_url: Optional[str] = Field(
        default="sqlite:///./.workflow.db",
        description="SQLAlchemy database URL for workflow definitions. Supports Postgres, SQLite, etc.",
    )
    workflow_cosmos_container: str = Field(default="workflows", description="Cosmos DB container for workflow definitions.")
    workflow_knowledge_path: str = Field(
        default="./app/data/workflow_knowledge.json", description="Path to the workflow knowledge base used for RAG."
    )
    audit_taxonomy_path: str = Field(
        default="./app/data/audit_taxonomy.json", description="Path to the audit domain taxonomy used for agent filtering."
    )

    # OpenRouter LLM
    openrouter_api_key: Optional[str] = Field(default=None, description="OpenRouter API key for LLM-backed workflow generation.")
    openrouter_model: str = Field(
        default="openai/gpt-4o-mini",
        description="OpenRouter model identifier used for workflow generation.",
    )
    openrouter_base_url: str = Field(default="https://openrouter.ai/api/v1", description="Base URL for OpenRouter API.")

    # MCP agent execution
    mcp_gateway_url: Optional[str] = Field(
        default=None,
        description="Model Context Protocol gateway base URL. When unset, agent invocations fall back to mock responses.",
    )
    mcp_api_key: Optional[str] = Field(default=None, description="Optional API key when calling the MCP gateway.")

    # MAF workflow catalog
    maf_api_base_url: Optional[AnyHttpUrl] = Field(
        default=None,
        description="Base URL of the MCP-MAF workflow catalog service.",
    )
    maf_api_token: Optional[str] = Field(
        default=None,
        description="Optional bearer token when calling the MCP-MAF workflow catalog.",
    )

    # Policy
    workflow_policy_min_nodes: int = Field(default=3, description="Minimum number of nodes enforced during validation.")
    workflow_policy_max_nodes: int = Field(default=24, description="Maximum number of nodes enforced during validation.")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
