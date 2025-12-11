from models.base import BaseDto
from typing import List, Optional
from pydantic import Field
from datetime import date

class Block(BaseDto):
    blockId: str = Field(..., description="Unique ID of the block")
    blockType: str = Field(..., description="Type of the block (Section, RadioQuestion, Information, etc.)")
    title: Optional[str] = Field("", description="Title or question text")
    isAIResponseExpected: bool = Field(False, description="Whether AI response is expected for this block")
    responseOptions: Optional[List[str]] = Field(default_factory=list, description="Available response options")
    guidanceText: Optional[str] = Field("", description="Guidance or notes text")
    answer: Optional[str] = Field("", description="Answer provided for the block")
    rationale: Optional[str] = Field("", description="Rationale for the answer")
    blocks: Optional[List["Block"]] = Field(default_factory=list, description="Nested sub-blocks")

Block.model_rebuild()

class MetaData(BaseDto):
    checklistId: str
    checklistName: str
    templateId: str
    templateName: str
    framework: str
    clientId: str
    clientName: str
    rootBlockId: str
    totalBlocks: str
    
class Checklist(BaseDto):
    metaData: MetaData
    blocks: List[Block]
    
class ChecklistProcessingResponseDto(BaseDto):
    request_id : str = Field(..., description="Identifier of the processed block")
    message: str = Field(..., description="Status message indicating the result of the processing")
    processed_at: str = Field(default=date.today().isoformat(), description="Timestamp when the processing was completed")
    
    class Config:
        extra = "forbid"