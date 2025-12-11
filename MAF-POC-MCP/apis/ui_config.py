from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import json
from typing import Dict, Any, List, Union
from utils.config_utils import ChecklistEnum, read_config, write_config, ChecklistConfigRequestModel, write_config_by_id
from pydantic import ValidationError

router = APIRouter(prefix="/ui_config", tags=["ui_config"])


@router.get("/read-json")
async def read_json_file():
    try:
        data = read_config()
        if isinstance(data, list):
            data = [item.model_dump() if hasattr(item, 'model_dump') else item for item in data]
        elif hasattr(data, 'model_dump'):
            data = data.model_dump()
        return JSONResponse(content={"success": True, "data": data})
    
    except json.JSONDecodeError as e:
        return JSONResponse(content={"success": False, "message": f"Invalid JSON format: {str(e)}"}, status_code=400)
    except FileNotFoundError:
        return JSONResponse(content={"success": False, "message": "Config file not found"}, status_code=404)
    except Exception as e:
        return JSONResponse(content={"success": False, "message": f"Internal server error: {str(e)}"}, status_code=500)

@router.get("/agents")
def get_agents():
    agents = list(ChecklistEnum.value for ChecklistEnum in ChecklistEnum)
    return JSONResponse(content={"success": True, "data": agents})

@router.post("/add_config")
async def add_config(data: ChecklistConfigRequestModel, update_existing: bool = True):
    try:
        write_config(data, update_existing=update_existing)
        action = "updated" if update_existing else "added"
        return JSONResponse(content={"success": True, "message": f"Config {action} successfully"}, status_code=201)
    
    except ValidationError as e:
        return JSONResponse(
            content={"success": False, "error": "Validation failed", "details": str(e)}, 
            status_code=400
        )
    except ValueError as e:
        return JSONResponse(
            content={"success": False, "error": "Invalid data format", "message": str(e)}, 
            status_code=400
        )
    except Exception as e:
        return JSONResponse(
            content={"success": False, "error": "Failed to write file", "message": str(e)}, 
            status_code=500
        )
        
@router.patch("/update_config/{config_id}")
async def update_config(config_id: Union[int, str], data: dict):
    try:
        write_config_by_id(config_id, data)
        return JSONResponse(content={"success": True, "message": "Config updated successfully"}, status_code=200)
    
    except ValidationError as e:
        return JSONResponse(
            content={"success": False, "error": "Validation failed", "details": str(e)}, 
            status_code=400
        )
    except ValueError as e:
        return JSONResponse(
            content={"success": False, "error": "Invalid data format", "message": str(e)}, 
            status_code=400
        )
    except Exception as e:
        return JSONResponse(
            content={"success": False, "error": "Failed to update file", "message": str(e)}, 
            status_code=500
        )
        
@router.get("/read_config/{config_id}")
async def read_config_by_id(config_id: Union[int, str]):
    try:
        config = read_config(id=config_id)
        if config is None:
            return JSONResponse(content={"success": False, "message": "Config not found"}, status_code=404)
        
        config_data = config.model_dump() if hasattr(config, 'model_dump') else config
        return JSONResponse(content={"success": True, "data": config_data}, status_code=200)
    
    except Exception as e:
        return JSONResponse(
            content={"success": False, "error": "Failed to read config", "message": str(e)}, 
            status_code=500
        )