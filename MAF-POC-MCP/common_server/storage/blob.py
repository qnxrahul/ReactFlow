from azure.storage.blob.aio import BlobServiceClient
import os
from azure.core.exceptions import ResourceExistsError
from azure.storage.blob import ContentSettings
import mimetypes

class AzureBlobStorageManager:
    """
    A helper class to interact with Azure Blob Storage.
    Provides methods to upload and download files.
    """

    def __init__(self, endpoint: str, api_key: str, container_name: str):
        """
        Initialize the BlobServiceClient and ContainerClient.
        :param endpoint: Azure Storage account endpoint URL
        :param container_name: Name of the blob container
        """
        self.endpoint = endpoint
        self.api_key = api_key
        self.container_name = container_name
        self.blob_service_client = BlobServiceClient(account_url=endpoint, credential=api_key)
        self.container_client = self.blob_service_client.get_container_client(container_name)

    def upload_file(self, file_path: str, blob_name: str = None) -> str:
        """
        Uploads a local file to Azure Blob Storage.
        :param file_path: Path to the local file
        :param blob_name: Optional name for the blob (defaults to filename)
        :return: The blob URL
        """
        if not blob_name:
            blob_name = os.path.basename(file_path)

        blob_client = self.container_client.get_blob_client(blob_name)

        with open(file_path, "rb") as data:
            blob_client.upload_blob(data, overwrite=True)

        blob_url = blob_client.url
        
        return blob_url

    async def upload_blob_content(self, blob_name: str, content: bytes, content_type: str | None = None):
        """
        Uploads a file to Azure Blob Storage.

        Args:
            blob_name (str): The name/path of the blob in the container.
            content (bytes): The file content (in bytes).
            content_type (str | None): Optional MIME type (auto-detected if not given).

        Returns:
            dict: Upload status details.
        """
        # Auto-detect MIME type if not provided
        if not content_type:
            content_type, _ = mimetypes.guess_type(blob_name)
            if not content_type:
                content_type = "application/octet-stream"

        try:
            container_client = self.blob_service_client.get_container_client(self.container_name)

            # Ensure container exists
            try:
                await container_client.create_container()
            except ResourceExistsError:
                pass

            blob_client = container_client.get_blob_client(blob_name)

            # ✅ Correct: use ContentSettings, not dict
            content_settings = ContentSettings(content_type=content_type)

            await blob_client.upload_blob(
                data=content,
                overwrite=True,
                content_settings=content_settings
            )

            return {
                "status": "success",
                "blob_name": blob_name,
                "content_type": content_type,
                "container": self.container_name,
                "endpoint": self.endpoint
            }
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e)
            }

    def download_file(self, blob_name: str, download_path: str = None) -> str:
        """
        Downloads a blob from Azure Blob Storage.
        :param blob_name: Name of the blob to download
        :param download_path: Local path to save the file (defaults to current dir)
        :return: Path to the downloaded file
        """
        if not download_path:
            download_path = os.path.join(os.getcwd(), blob_name)

        blob_client = self.container_client.get_blob_client(blob_name)

        with open(download_path, "wb") as file:
            stream = blob_client.download_blob()
            file.write(stream.readall())

        return download_path
    
    async def download_file_bytes(self, blob_name: str) -> bytes:
        """
        Downloads a blob from Azure Blob Storage and returns its content as bytes.
        :param blob_name: Name of the blob to download
        :return: Content of the blob as bytes
        """
        blob_client = self.container_client.get_blob_client(blob_name)
        stream = await blob_client.download_blob()
        return await stream.readall()
    
   
    async def read_blob_content(self, blob_name: str) -> bytes:
        """
        Reads the content of a blob from Azure Blob Storage.
        :param blob_name: Name of the blob to read
        :return: Content of the blob as bytes
        :raises FileNotFoundError: If the blob does not exist
        """
        blob_client = self.container_client.get_blob_client(blob_name)
        if not await blob_client.exists():
            raise FileNotFoundError(f"Blob '{blob_name}' does not exist in container '{self.container_name}'")
        stream = await blob_client.download_blob()
        return stream
    
    async def read_blob_bytes(self, blob_name: str) -> bytes:
        
        async with self.container_client.get_blob_client(blob_name) as blob_client:
            if not await blob_client.exists():
                raise FileNotFoundError(f"Blob '{blob_name}' does not exist")

            
            stream_downloader = await blob_client.download_blob()

            data = await stream_downloader.readall()
            return data



    def list_files(self, prefix: str = None):
        """
        Lists all blobs in the container (optionally filtered by prefix).
        :param prefix: Optional prefix to filter blob names
        :return: List of blob names
        """
        blobs = self.container_client.list_blobs(name_starts_with=prefix)
        blob_list = [blob.name for blob in blobs]
        return blob_list

    def delete_file(self, blob_name: str):
        """
        Deletes a blob from the container.
        :param blob_name: Name of the blob to delete
        """
        blob_client = self.container_client.get_blob_client(blob_name)
        blob_client.delete_blob()

    async def close(self):
        """Close the underlying connection pool."""
        if self.blob_service_client is not None:
            await self.blob_service_client.close()