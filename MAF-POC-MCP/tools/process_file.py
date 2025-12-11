from models.tool_call_dto import BlobConfig
from common_server.storage.blob import AzureBlobStorageManager
from typing import Optional
from constants.enums import AuditFileType
from models.checklist_request import SourceFileDto

class ProcessInputFile:
    
    @classmethod
    async def process_file(
        cls,
        blob_config: BlobConfig,
        file_name: str,
        file_content: bytes,
        mime_type: Optional[str] = None
    ):
        blob_config:BlobConfig = BlobConfig.model_validate(blob_config)
        source_blob_manager = AzureBlobStorageManager(
            endpoint=blob_config.endpoint,
            api_key=blob_config.api_key,
            container_name=blob_config.source_blob_container
        )
        
        # Upload the file to blob storage
        upload_path = file_name
        await source_blob_manager.upload_blob_content(upload_path, file_content,mime_type)
        
        new_source_blob_paths = [
            (
                item.model_copy(update={"file_type": AuditFileType.financial_report})
                if item.file_path == upload_path else item
            )
            for item in blob_config.source_blob_paths or []
        ]

        new_blob_config = blob_config.model_copy(
            update={"source_blob_paths": new_source_blob_paths}
        )

        
       
        return new_blob_config.model_dump()
    