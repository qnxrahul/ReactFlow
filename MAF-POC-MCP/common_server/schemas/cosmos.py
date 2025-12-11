from pydantic import BaseModel, Field
from typing import Optional
from common_server.schemas.base import BaseDto

class CosmosConfigDto(BaseDto):
    """Configuration for retrieving chunks from Cosmos DB."""
    endpoint: str = Field(..., description="Cosmos DB endpoint URL")
    key: str = Field(..., description="Primary key for Cosmos DB access")
    database_name: str = Field(..., description="Name of the database")
    container_name: str = Field(..., description="Name of the container")
    source: Optional[str] = Field(None, description="Optional: filter chunks by a specific source label")
