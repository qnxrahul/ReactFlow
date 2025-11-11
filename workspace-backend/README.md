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

Key settings (see `.env.example` for the full list):

- `AZURE_STORAGE_CONNECTION_STRING` **or** `AZURE_STORAGE_ACCOUNT_URL` + `AZURE_STORAGE_ACCOUNT_KEY/SAS_TOKEN`
- `AZURE_STORAGE_CONTAINER`
- `AZURE_COSMOS_ENDPOINT`, `AZURE_COSMOS_KEY`, `AZURE_COSMOS_DATABASE`, `AZURE_COSMOS_CONTAINER`
- `CORS_ORIGINS` to permit frontend origins
- `ENABLE_LOCAL_FALLBACKS` to toggle local storage for non-Azure environments

## API Overview

- `GET /health`
- `GET /workspaces/`
- `POST /workspaces/` (create)
- `GET /workspaces/{id}`
- `PATCH /workspaces/{id}`
- `POST /workspaces/{id}/files` (multipart upload)

Each workspace document follows the shape expected by the React workspace pages: `name`, `template`, `meta`, `position`, `lanes`, task/file counts, and an array of uploaded files.
