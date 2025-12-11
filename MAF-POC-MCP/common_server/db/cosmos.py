import uuid
from datetime import datetime
from beartype import beartype
from typing import List, Dict, Optional, Union
from pydantic import UUID4
from azure.cosmos import PartitionKey, CosmosClient


class CosmosDBStorage:
    """
    A utility class for interacting with Azure Cosmos DB containers.
    Provides helper methods for CRUD and query operations.
    """

    def __init__(self, endpoint: str, key: str, database_name: str, container_name: str):
        # Initialize Cosmos DB client
        self.client = CosmosClient(url=endpoint, credential=key)
        self.database_name = database_name
        self.container_name = container_name

        # Initialize DB + container
        self._init_db()
        self._init_container()

    # -----------------------------
    # Initialization Helpers
    # -----------------------------
    def _init_db(self):
        """Create or get the database."""
        try:
            self.database = self.client.create_database_if_not_exists(id=self.database_name)
        except Exception:
            self.database = self.client.get_database_client(self.database_name)

    def _init_container(self):
        """Create or get the container."""
        try:
            self.container = self.database.create_container_if_not_exists(
                id=self.container_name,
                partition_key=PartitionKey(path="/id"),
                offer_throughput=400
            )
        except Exception:
            self.container = self.database.get_container_client(self.container_name)

    # -----------------------------
    # Insert Methods
    # -----------------------------
    def insert_many(self, items: List[Dict], request_id: Optional[UUID4] = None) -> Dict:
        """
        Insert a single row containing the list of items.
        Adds a shared request_id to group related chunks.
        """
        request_id = str(request_id or uuid.uuid4())
        row = {
            "id": str(uuid.uuid4()),
            "request_id": request_id,
            "created_at": datetime.now().isoformat(),  # Local server time
            "items": items
        }
        result = self.container.upsert_item(row)
        return {
            "request_id": request_id,
            "count": len(items),
            "row": result
        }

    # -----------------------------
    # Query Methods
    # -----------------------------
    def query_items(self, query: str, parameters: Optional[List[Dict]] = None,many: bool = False) -> List[Dict]:
        """Run a custom SQL-like query."""
        if many:
            return list(
                self.container.query_items(
                    query=query,
                    parameters=parameters or [],
                    enable_cross_partition_query=True
                )
            )
        else:
            return self.container.query_items(
                query=query,
                parameters=parameters or [],
                enable_cross_partition_query=True
            ).next()

    def get_all_items(self) -> List[Dict]:
        """Fetch all items from the container."""
        return list(self.container.read_all_items())

    def get_chunks_by_source(self, source: str) -> List[Dict]:
        """Fetch all chunks for a specific source document."""
        query = "SELECT * FROM c WHERE c.source = @source"
        params = [{"name": "@source", "value": source}]
        return self.query_items(query, params)

    @beartype
    def get_chunks_by_request_id(self, request_id: str) -> Union[List[Dict], Dict]:
        """Fetch all chunks belonging to a specific ingestion batch."""
        query = "SELECT * FROM c WHERE c.request_id = @request_id"
        params = [{"name": "@request_id", "value": str(request_id)}]
        return self.query_items(query, params)

  

