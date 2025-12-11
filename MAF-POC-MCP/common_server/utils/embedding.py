# embedding_service.py
import asyncio
import logging
from typing import List
from openai import AsyncAzureOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential


logger = logging.getLogger(__name__)

class AzureEmbeddingService:
    """
    Service for generating embeddings using Azure OpenAI.
    """

    def __init__(
        self,
        api_key: str,
        endpoint: str,
        deployment_name: str,
        api_version: str = "2024-08-01-preview",
        batch_size: int = 100
    ):
        """
        Initialize the Azure embedding service.

        Args:
            api_key (str): Azure OpenAI API key.
            endpoint (str): Azure OpenAI endpoint (e.g., "https://<your-resource>.openai.azure.com").
            deployment_name (str): Name of the deployed embedding model (e.g., "text-embedding-3-large").
            api_version (str): API version for Azure OpenAI.
            batch_size (int): Max number of text inputs per batch.
        """
        self.client = AsyncAzureOpenAI(
            api_key=api_key,
            azure_endpoint=endpoint,
            api_version=api_version,
        )
        self.deployment_name = deployment_name
        self.batch_size = batch_size

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=1, max=10))
    async def _embed_batch(self, batch: List[str]) -> List[List[float]]:
        """
        Internal method to create embeddings for a batch of text with retry support.
        """
        logger.info(f"Creating embeddings for batch of {len(batch)} texts...")
        response = await self.client.embeddings.create(
            model=self.deployment_name,
            input=batch
        )
        embeddings = [item.embedding for item in response.data]
        logger.debug(f"Generated {len(embeddings)} embeddings.")
        return embeddings

    async def create_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Create embeddings for a list of text inputs, automatically batching requests.

        Args:
            texts (List[str]): List of text strings to embed.

        Returns:
            List[List[float]]: List of vector embeddings.
        """
        if not texts:
            return []

        all_embeddings = []
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i:i + self.batch_size]
            batch_embeddings = await self._embed_batch(batch)
            all_embeddings.extend(batch_embeddings)

        logger.info(f"Successfully generated {len(all_embeddings)} embeddings.")
        return all_embeddings

    async def embed_single(self, text: str) -> List[float]:
        """
        Helper to generate an embedding for a single string.
        """
        embeddings = await self.create_embeddings([text])
        return embeddings[0] if embeddings else []

    async def get_embedding(self, text: str):

        response = await self.client.embeddings.create(
            model="text-embedding-3-large",
            input=[text]
        )
        
        return response.data[0].embedding