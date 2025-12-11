from pydantic import BaseModel
from typing import Any

class BaseDto(BaseModel):
    
    @classmethod
    def from_dict(cls, data: Any):
        return cls.model_validate(data)
    
    def to_dict(self):
        return self.model_dump()