import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

PORT = int(os.getenv("PORT", "8000"))
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")]

app = FastAPI(title="Fast Agent (Python)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if CORS_ORIGINS == ["*"] else CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RunRequest(BaseModel):
    nodeType: str
    input: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class RunResponse(BaseModel):
    output: str
    meta: Optional[Dict[str, Any]] = None

# --- Agent definitions (simple functions per node type) ---

def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def agent_trigger(input: Optional[str], context: Optional[Dict[str, Any]]) -> RunResponse:
    return RunResponse(output=f"Triggered workflow at {now_iso()}")


def agent_ingest(input: Optional[str], context: Optional[Dict[str, Any]]) -> RunResponse:
    sample = (input or "README.md")[:140]
    return RunResponse(output=f"Ingested 12 docs. Sample: \"{sample}\"")


def agent_embed(input: Optional[str], context: Optional[Dict[str, Any]]) -> RunResponse:
    return RunResponse(output="Generated 12 embeddings (avg dim=1536). Norm OK.")


def agent_retrieve(input: Optional[str], context: Optional[Dict[str, Any]]) -> RunResponse:
    return RunResponse(output="Retrieved 5 passages (mean score 0.78).")


def agent_plan(input: Optional[str], context: Optional[Dict[str, Any]]) -> RunResponse:
    return RunResponse(output="Planned 3 steps: search, synthesize, answer.")


def agent_tool(input: Optional[str], context: Optional[Dict[str, Any]]) -> RunResponse:
    return RunResponse(output="Called external tool: web-search, got 3 results.")


def agent_answer(input: Optional[str], context: Optional[Dict[str, Any]]) -> RunResponse:
    text = (input or "").strip()
    answer = (
        "Answer: "
        + (text[:160] if text else "The quarterly trend is up 12% QoQ; see chart.")
    )
    return RunResponse(output=answer)


NODE_MAP = {
    # normalize aliases from the canvas subtitles
    "start": agent_trigger,
    "trigger": agent_trigger,
    "ingest": agent_ingest,
    "loader": agent_ingest,
    "embed": agent_embed,
    "vectorize": agent_embed,
    "retrieve": agent_retrieve,
    "similarity": agent_retrieve,
    "plan": agent_plan,
    "agent": agent_plan,
    "tool": agent_tool,
    "search": agent_tool,
    "answer": agent_answer,
    "llm": agent_answer,
}


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/api/agent/run")
async def run(req: RunRequest) -> RunResponse:
    fn = NODE_MAP.get((req.nodeType or "").lower())
    if not fn:
        return RunResponse(output=f"{req.nodeType} completed successfully.")
    return fn(req.input, req.context)
