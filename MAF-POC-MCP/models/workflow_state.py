from pydantic import BaseModel,UUID4
from typing import Any, Optional
from models.dto import RagIngestionDto,BaseDto

class WorkflowData(BaseDto):
    request_id: UUID4
    form_data: RagIngestionDto
    chunks: Optional[Any] = None
    max_retries: int