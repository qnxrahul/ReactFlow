# ReactFlow Agentic Canvas + Fast Agent

An agentic workflow canvas built on ReactFlow with a Fluent UI variant, extended to execute nodes via [Fast Agent](https://fast-agent.ai/).

## Getting Started

```bash
cd workspace-backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env # configure Azure storage + Cosmos DB (or keep fallbacks for local dev)
uvicorn app.main:app --reload --port 9000

# in another shell
cd reactflow-canvas
npm install
cp .env.example .env # configure API URLs
npm run dev
```

- Visit `/` for the ReactFlow canvas (Classic)
- Visit `/fluent` for the Fluent UI demo canvas
- Visit `/workspace` for the workspace overview
- Visit `/workspace/new` for the new board creation flow
- Visit `/dynamic` for the new dynamic workflow canvas powered by the backend generator

## Workspace Boards

- Boards on `/workspace` are backed by the shared `BoardsProvider`, which now persists data via the FastAPI workspace service (`VITE_WORKSPACE_API_URL`).
- Creating a board from the context menu routes to `/workspace/new`, where templates and upload lanes can be configured and saved back through the API.
- File uploads in the template flow stream through the backend to Azure Blob Storage; metadata is enriched in Azure Cosmos DB and reflected in the workspace overview.
- Offline/local development is still supported: keep the backend `.env` secrets blank and the service will fall back to filesystem + JSON persistence.

### Workspace Service API

- `VITE_WORKSPACE_API_URL` (`.env`) should point at the FastAPI backend (default `http://localhost:9000`).
- Backend environment variables (see `workspace-backend/.env.example`):
  - Azure Storage: `AZURE_STORAGE_CONNECTION_STRING` (or account URL + key/SAS), `AZURE_STORAGE_CONTAINER`
  - Cosmos DB: `AZURE_COSMOS_ENDPOINT`, `AZURE_COSMOS_KEY`, `AZURE_COSMOS_DATABASE`, `AZURE_COSMOS_CONTAINER`
  - Optional fallbacks: `ENABLE_LOCAL_FALLBACKS=true` keeps using local disk/JSON when Azure creds are omitted.

## Fast Agent Integration (local or cloud)

Set envs in `.env` (Vite-style):

```bash
# Local Python agent (default)
VITE_FAST_AGENT_BASE_URL=http://localhost:8000

# fast-agent.ai cloud (optional)
VITE_FAST_AGENT_BASE_URL=https://api.fast-agent.ai
VITE_FAST_AGENT_API_KEY=sk_live_...
VITE_FAST_AGENT_AGENT_ID=agnt_12345
# If your workspace uses a custom path:
VITE_FAST_AGENT_RUN_PATH=/api/v1/agents/:id/run
```

If `VITE_FAST_AGENT_BASE_URL` is unset, the app falls back to a built-in mock.

## AG-UI Agent Console (frontend-only)

The Classic canvas now speaks the [AG-UI protocol](https://github.com/ag-ui-protocol/ag-ui) so you can wire any AG-UI compliant backend into the UI before touching our FastAPI service.

1. Add the optional env vars to `reactflow-canvas/.env`:
   ```bash
   VITE_AGUI_AGENT_URL=http://localhost:9001
   VITE_AGUI_AGENT_ID=reactflow-agent
   VITE_AGUI_THREAD_PREFIX=reactflow
   ```
2. Start your AG-UI server (LangGraph Dojo sample, CrewAI flow, etc.) so it can accept `RunAgentInput` requests and stream events.
3. Select a node in the Classic canvas and use the new **AG-UI Agent** panel on the right to send a prompt. Streaming text/tool events will populate the log in real time and update the node’s status/output.
4. If the backend emits an interrupt (`RUN_FINISHED` with `outcome: interrupt`), the UI opens an approval modal where you can review the payload and resume the run with custom JSON.

When the env vars are omitted the panel stays disabled, so existing Fast Agent demos keep working unchanged.

## Execute Nodes

- Right-click a node → Run Node or Run From Here
- Select a node and use the buttons in the Properties panel
- The node status and output preview appear on the node

---

This project uses Vite + React + TypeScript. Useful links:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
