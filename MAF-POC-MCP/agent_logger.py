import traceback
import inspect
import json
import datetime
from agent_framework import AIFunction
from pydantic import BaseModel, Field
import logging

class LoggedAIFunction(AIFunction):
    def __init__(self, func, *args, **kwargs):
        original_func = func

        print(f"Wrapping function {original_func.__name__} for logging.")

        async def wrapped_func(*f_args, **f_kwargs):
            import datetime, json, inspect, traceback

            log_entry = {
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                "tool": {"name": kwargs.get("name", ""), "description": kwargs.get("description", "")},
                "function": {
                    "module": inspect.getmodule(original_func).__name__ if inspect.getmodule(original_func) else "Unknown",
                    "name": getattr(original_func, "__qualname__", original_func.__name__),
                },
                "input": f_kwargs,
                "output": None,
                "status": "started",
                "exception": None,
                "traceback": None,
                "model": None,
                "usage": None,
            }

            try:
                result = await original_func(*f_args, **f_kwargs)
                log_entry["output"] = result
                log_entry["status"] = "success"

                if isinstance(result, dict):
                    log_entry["model"] = result.get("model")
                    log_entry["usage"] = result.get("usage")

            except Exception as e:
                log_entry["status"] = "error"
                log_entry["exception"] = {"type": type(e).__name__, "message": str(e)}
                log_entry["traceback"] = traceback.format_exc()
                raise
            finally:
                print(json.dumps(log_entry, indent=2, ensure_ascii=False))

            return result

        # ✅ Pass wrapped_func instead of original_func
        super().__init__(func=wrapped_func, *args, **kwargs)

    
    