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

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
