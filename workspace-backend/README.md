# Workspace Backend

FastAPI service responsible for persisting workspace metadata in Azure Cosmos DB and handling file uploads via Azure Blob Storage. The API mirrors the needs of the React workspace canvases (`reactflow-canvas`), enabling the frontend to create/update workspaces and attach files to them.

## Features

- REST endpoints for creating, listing, fetching, and updating workspaces.
- File upload endpoint that streams files into Azure Blob Storage and tracks them alongside the workspace.
- Cosmos DB persistence with automatic database/container creation (when permitted).
- Opt-in local fallbacks for development without Azure credentials.

## Getting Started

1. Create a virtual environment and install dependencies:

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. Copy `.env.example` to `.env` and fill in the Azure credentials. For local testing without Azure, leave the secrets blank and keep `ENABLE_LOCAL_FALLBACKS=true`.

3. Run the API:

   ```bash
   uvicorn app.main:app --reload --port 9000
   ```

4. Visit `http://localhost:9000/docs` for interactive documentation.

## Environment Variables

- Storage: `AZURE_STORAGE_CONNECTION_STRING` **or** `AZURE_STORAGE_ACCOUNT_URL` + `AZURE_STORAGE_ACCOUNT_KEY/SAS_TOKEN`, `AZURE_STORAGE_CONTAINER`
- Cosmos DB (optional): `AZURE_COSMOS_ENDPOINT`, `AZURE_COSMOS_KEY`, `AZURE_COSMOS_DATABASE`, `AZURE_COSMOS_CONTAINER`
- Workflow database: `WORKFLOW_DB_URL` (SQLAlchemy connection string; defaults to local SQLite), `WORKFLOW_COSMOS_CONTAINER`
- LLM / RAG: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL`, `WORKFLOW_KNOWLEDGE_PATH`
- Policy tuning: `WORKFLOW_POLICY_MIN_NODES`, `WORKFLOW_POLICY_MAX_NODES`
- Misc: `CORS_ORIGINS`, `ENABLE_LOCAL_FALLBACKS`, `REGISTRY_STORE_ROOT`

## API Overview

- `GET /health`
- `GET /workspaces/`
- `POST /workspaces/` (create)
- `GET /workspaces/{id}`
- `PATCH /workspaces/{id}`
- `POST /workspaces/{id}/files` (multipart upload)
- `POST /workflows/generate` (LLM workflow builder with policy enforcement)
- `GET /workflows/{id}`
- `POST /workflows/{id}/nodes/{nodeId}/run`
- `GET /workflows/registry` (list dynamic component/handler registry)
- `POST /workflows/registry/components` (register a renderer)
- `POST /workflows/registry/handlers` (register a backend handler)
- `GET /agents/` (list MCP-backed agents, filterable by domain/intent)
- `POST /agents/` (register a new agent definition)
- `POST /agents/{agentId}/run` (execute an agent on-demand via the MCP gateway)

Each workspace document follows the shape expected by the React workspace pages: `name`, `template`, `meta`, `position`, `lanes`, task/file counts, and an array of uploaded files.

### Dynamic Workflows & Registry

- When `OPENROUTER_API_KEY` is provided, `/workflows/generate` performs RAG over `WORKFLOW_KNOWLEDGE_PATH`, feeds the retrieved context plus the component/handler registry into OpenRouter, validates the JSON response, and stores the workflow in Cosmos/SQL.
- Without an API key the endpoint falls back to a deterministic template that still respects the registry.
- Admins (or plugins) can call the registry endpoints to map new component types to built-in renderer templates (shadcn cards) and register handler identifiers that the LLM is allowed to reference.
- The `/agents` API family lets you register MCP-backed agents tied to handler ids so workflow execution can delegate to specialized tools.
