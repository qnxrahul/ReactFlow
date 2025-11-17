# Re-export the FastAPI application for convenience when running `uvicorn app.main:app`.
from .main import app

__all__ = ["app"]
