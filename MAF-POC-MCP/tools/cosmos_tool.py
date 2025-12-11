
from typing import Dict, Any
from beartype import beartype
from pydantic import UUID4
from common_server.db.cosmos import CosmosDBStorage
from common_server.schemas.cosmos import CosmosConfigDto

class CosmosChunkRetrievalTool:
    """Tool for retrieving data chunks from Cosmos DB."""
    @classmethod
    @beartype
    async def fetch_chunks(cls, cosmos_config: CosmosConfigDto, request_id: str) -> Dict[str, Any]:
        if cosmos_config:
            cosmos = CosmosDBStorage(
                endpoint=cosmos_config.endpoint,
                key=cosmos_config.key,
                database_name=cosmos_config.database_name,
                container_name=cosmos_config.container_name,
            )
            # logger.info(f"Fetching chunks from Cosmos DB for request_id={request_id_uuid}")
            return cosmos.get_chunks_by_request_id(request_id)
        else:
            return {"items": []}