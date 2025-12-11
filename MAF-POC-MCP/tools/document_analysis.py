import os
import json

from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
from typing import Dict, Any
from beartype import beartype
from fastapi import UploadFile
from fastapi import File
from logger import setup_logger
from azure.storage.blob import BlobClient
from urllib.parse import urlparse, unquote
from common_server.storage.blob import AzureBlobStorageManager
from models.checklist_request import BlobConfig, DocumentAnalysisConfig
from constants.enums import AuditFileType
from utils.config_utils import read_config, ChecklistEnum, get_max_id_by_name


logger = setup_logger()


class RagExtractionTool:
    @classmethod
    @beartype
    async def extract_pdf(
            cls,
            request_id: str
        ) -> Dict[str, Any]:
        items = []
        page_number = 1
        
        config_model = read_config(id=get_max_id_by_name(name=ChecklistEnum.EXTRACTION_AGENT))
        if config_model is None:
            raise ValueError("Config with id=1 not found")
        # Convert Pydantic model to dict
        config = config_model.configuration
        
        blob_config = config.get("blob_config")
        document_analysis_config = config.get("document_analysis_config")
        
        blob_config:BlobConfig = BlobConfig.model_validate(blob_config)
        document_analysis_config:DocumentAnalysisConfig = DocumentAnalysisConfig.model_validate(document_analysis_config)
        source_blob_manager = AzureBlobStorageManager(
            endpoint=blob_config.endpoint,
            api_key=blob_config.api_key,
            container_name=blob_config.source_blob_container,
        )
        
        try:
            extraction_file_path = next(
                (x.file_path for x in blob_config.source_blob_paths if x.file_type == AuditFileType.financial_report),
                None  # default value if not found
            )

            pdf_bytes = await source_blob_manager.download_file_bytes(extraction_file_path)
            filename = os.path.basename(extraction_file_path)
            logger.info("Opening PDF for request_id=%s", request_id)

            client = DocumentIntelligenceClient(
                document_analysis_config.endpoint, 
                AzureKeyCredential(document_analysis_config.api_key)
            )
            logger.info("OOpened pdf and started analysing for request_id=%s", request_id)
            poller = client.begin_analyze_document(
                model_id="prebuilt-layout", 
                body=pdf_bytes, 
                content_type="application/pdf"
            )
            result = poller.result()
            
            client.close()
            logger.info("Analysing completed for request_id=%s", request_id)
            for page_number, page in enumerate(result.pages, start=1):
                page_paragraphs = [
                    {
                        "paragraph_number": idx + 1,
                        "content": paragraph.content.strip()
                    }
                    for idx, paragraph in enumerate(result.paragraphs)
                    if paragraph.bounding_regions and paragraph.bounding_regions[0].page_number == page_number
                ]

                page_tables = [
                    {
                        "table_number": idx + 1,
                        "row_count": table.row_count,
                        "column_count": table.column_count,
                        "cells": [
                            {"row": c.row_index, "col": c.column_index, "content": c.content}
                            for c in table.cells
                        ]
                    }
                    for idx, table in enumerate(result.tables)
                    if table.bounding_regions and table.bounding_regions[0].page_number == page_number
                ]

                if page_paragraphs or page_tables:
                    page_item = {
                        "page_number": page_number,
                    }
                    if page_paragraphs:
                        page_item["paragraphs"] = page_paragraphs
                    if page_tables:
                        page_item["tables"] = page_tables
                    items.append(page_item)
               
        except Exception as e:
            logger.exception("Failed to process PDF (request_id=%s)", request_id)
            return {"error": f"Failed to process PDF: {str(e)}", "request_id": request_id, "items": []}

        result = {
            "file_type": "pdf",
            "file_name": filename,
            "request_id": request_id,
            "items": items,
        }
        json_bytes = json.dumps(result, ensure_ascii=False, indent=4).encode("utf-8")
        logger.info("Uploading extracted content to blob")
        await source_blob_manager.upload_blob_content(
            blob_name=f"{request_id}.json",
            content=json_bytes,
            content_type="application/json"
        )
        logger.info("Uploaded to blob successfully")
        await source_blob_manager.close()
        
        return {"request_id": request_id, "message": "PDF extraction completed successfully.", "file_name": filename}
        