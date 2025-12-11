import json
from tkinter import N
from typing import Dict, Any, Optional
from pathlib import Path
from pydantic import BaseModel, Field
from enum import Enum


# --- Nested Models for Configuration ---
class PromptModel(BaseModel):
    system_prompt: str
    user_prompt: str

class BlobPathModel(BaseModel):
    file_type: str
    file_path: str

class BlobConfigModel(BaseModel):
    endpoint: str
    source_blob_container: str
    source_blob_paths: list[BlobPathModel]
    output_blob_container: str
    api_key: str

class OpenAIChatModelConfigModel(BaseModel):
    deployment_name: str
    model_name: str
    api_version: str
    endpoint: str
    api_key: str

class DocumentAnalysisConfigModel(BaseModel):
    endpoint: str
    api_key: str

class SearchConfigModel(BaseModel):
    endpoint: str
    index_name: str
    api_key: str

class EmbeddingConfigModel(BaseModel):
    model_name: str
    api_key: str
    endpoint: str

class RetrievalConfigModel(BaseModel):
    query: str
    filter: str

class ConfigurationModel(BaseModel):
    request_id: str | None = None
    prompt: PromptModel | None = None
    blob_config: BlobConfigModel | None = None
    openai_chat_model_config: OpenAIChatModelConfigModel | None = None
    document_analysis_config: DocumentAnalysisConfigModel | None = None
    search_config: SearchConfigModel | None = None
    embedding_config: EmbeddingConfigModel | None = None
    retrieval_config: RetrievalConfigModel | None = None
    max_retries: int | None = None

class ChecklistEnum(str, Enum):
    EXTRACTION_AGENT = "extraction_agent"
    CHECKLIST_AGENT = "checklist_agent"
    RAG_AGENT = "rag_agent"

class ChecklistConfigRequestModel(BaseModel):
    name: ChecklistEnum
    description: str
    configuration: Dict[str, Any]

# --- Main Checklist Config Model ---
class ChecklistConfigModel(ChecklistConfigRequestModel):
    id: Optional[int] = Field(None, description="Unique identifier for the checklist config")


def read_config(id=None,as_dict=False) -> ChecklistConfigModel | list[ChecklistConfigModel] | None:
    file_path: str = "config/checklist_config.json"

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if not isinstance(data, list):
        data = [data]
    
    if not as_dict:
        models = [ChecklistConfigModel(**item) for item in data]
        if id is not None:
            for model in models:
                
                if str(model.id) == str(id):
                    return model
            return None
    else:
        models = data
    return models

def get_existing_configs() -> list[ChecklistConfigModel] | None:
    existing_configs = read_config()
    if existing_configs is None:
        return None
    if not isinstance(existing_configs, list):
        existing_configs = [existing_configs]
    return existing_configs

def read_config_by_name(name: str) -> ChecklistConfigModel | None:
    """Find a config by name."""
    existing_configs = get_existing_configs()
    if existing_configs is None:
        return None
    return next((config for config in existing_configs if str(config.name) == str(name)), None)

def read_config_by_id(config_id: int | str) -> ChecklistConfigModel | None:
    """Find a config by ID."""
    existing_configs = get_existing_configs()
    if existing_configs is None:
        return None
    return next((config for config in existing_configs if str(config.id) == str(config_id)), None)

def get_max_id_by_name(name: str) -> int:
    """Get the maximum ID from existing configs for a given name. Returns 0 if no configs exist."""
    existing_configs = get_existing_configs()
    if existing_configs is None:
        return 0

    matching_configs = [config for config in existing_configs if str(config.name) == str(name)]
    if not matching_configs:
        return 0
    return get_max_id_for_configs(matching_configs)

def get_max_id_for_configs(configs: list[ChecklistConfigModel]) -> int:
    ids = []
    for config in configs:
        try:
            id_val = int(config.id) if isinstance(config.id, str) and config.id.isdigit() else config.id
            if isinstance(id_val, int):
                ids.append(id_val)
        except (ValueError, TypeError):
            continue
    
    return max(ids) if ids else 0

def get_max_id() -> int:
    """Get the maximum ID from existing configs. Returns 0 if no configs exist."""
    return get_max_id_for_configs(get_existing_configs())

def write_config(data: ChecklistConfigRequestModel, update_existing: bool = True) -> None:
    """Write config based on name. If name exists, update it. If not, create with max_id + 1."""
    file_path = Path("config/checklist_config.json")
    file_path.parent.mkdir(parents=True, exist_ok=True)

    existing_configs = []
    if file_path.exists():
        try:
            existing_configs = read_config() or []
            if not isinstance(existing_configs, list):
                existing_configs = [existing_configs]
        except Exception:
            existing_configs = []

    
    existing_config = read_config_by_name(data.name)
    if existing_config and update_existing:
        updated_config = ChecklistConfigModel(
            id=existing_config.id,
            name=data.name,
            description=data.description,
            configuration=data.configuration
        )
        config_dict = {str(config.id): config for config in existing_configs}
        config_dict[str(existing_config.id)] = updated_config
        final_configs = list(config_dict.values())
    else:
        max_id = get_max_id()
        new_id = max_id + 1
        new_config = ChecklistConfigModel(
            id=new_id,
            name=data.name,
            description=data.description,
            configuration=data.configuration
        )
        final_configs = existing_configs + [new_config]

    config_data = [config.model_dump() for config in final_configs]

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(config_data, f, indent=2, ensure_ascii=False)

def write_config_by_id(id: int, new_config: dict) -> None:
    file_path = Path("config/checklist_config.json")
    file_path.parent.mkdir(parents=True, exist_ok=True)

    # Load existing configs
    if file_path.exists():
        try:
            existing_configs = json.loads(file_path.read_text()) or []
        except Exception:
            existing_configs = []
    else:
        existing_configs = []

    # Ensure it is a list
    if not isinstance(existing_configs, list):
        existing_configs = [existing_configs]

    # Find and update config by id
    updated = False
    for item in existing_configs:
        
        if int(item.get("id")) == int(id):
            item["configuration"] = new_config
            updated = True
            break

    if not updated:
        raise ValueError(f"Config with id {id} not found.")

    # Write updated list back to file
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(existing_configs, f, indent=2, ensure_ascii=False)