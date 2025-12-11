import uuid
from pydantic import BaseModel, Field,UUID4,field_serializer
from typing import Optional
from .base import BaseDto

class ChunkModel(BaseDto):
    
    request_id: UUID4 = Field(..., description="Request identifier associated with the chunk")
    created_at: str = Field(..., description="Timestamp when the chunk was created")
    text: str = Field(..., description="Text content of the chunk")
    source: Optional[str] = Field(None, description="Document or source identifier")
    page_number: Optional[int] = Field(None, description="Page number or section index")
    paragraph_number: Optional[int] = Field(None, description="Paragraph number within the page or section")
    embeddings: list[float] = Field(..., description="Vector embeddings for the chunk")
    
    
class IndexFieldDataModel(BaseDto):
    
    id: UUID4 = Field(default_factory=uuid.uuid4, description="Unique identifier for the chunk")
    request_id: UUID4 = Field(..., description="Request identifier associated with the chunk")
    created_at: str = Field(..., description="Timestamp when the chunk was created")
    text: str = Field(..., description="Text content of the chunk")
    source: Optional[str] = Field(None, description="Document or source identifier")
    page_number: Optional[int] = Field(None, description="Page number or section index")
    embeddings: list[float] = Field(..., description="Vector embeddings for the chunk")
    
    @field_serializer('id')
    def serialize_id(self, value):
        return str(value)
    
    @field_serializer('request_id',mode='plain')
    def serialize_request_id(self, value):
        return str(value)
    
class SearchConfig(BaseDto):
    endpoint: str = Field(..., description="Azure Search service endpoint")
    index_name: str = Field(..., description="Name of the Azure Search index")
    api_key: str = Field(..., description="API key for Azure Search authentication")