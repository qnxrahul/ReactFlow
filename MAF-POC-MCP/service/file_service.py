import os
from typing import List
from utils.file_utils import extract_file_content

from azure.storage.blob import BlobServiceClient

class FileService:
    def download_files(self, destination_dir: str, blob_config: dict) -> List[str]:
        downloaded_files = []
        # Setup Azure Blob client
        connection_string = blob_config.get("api_key")  # or use connection_string if available
        endpoint = blob_config.get("endpoint")
        container_name = blob_config.get("source_blob_container")
        filepaths = blob_config.get("source_blob_paths", [])
        blob_service_client = BlobServiceClient(account_url=endpoint, credential=connection_string)
        container_client = blob_service_client.get_container_client(container_name)
        for path in filepaths:
            if not path:
                continue
            filename = os.path.basename(path)
            dest_path = os.path.join(destination_dir, filename)
            with open(dest_path, "wb") as f:
                blob_data = container_client.download_blob(path)
                f.write(blob_data.readall())
            downloaded_files.append(dest_path)
        return downloaded_files

    def extract_content_from_pdfs(self, filepaths: List[str]) -> List[dict]:
        # Use utility function for extraction logic
        flat_results = []
        for path in filepaths:
            if path.lower().endswith('.pdf'):
                content = extract_file_content(path)
                # content is a list of dicts, each with paragraph info
                if isinstance(content, list):
                    flat_results.extend(content)
                elif isinstance(content, dict):
                    flat_results.append(content)
        return flat_results
