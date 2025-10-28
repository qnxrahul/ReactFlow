# ReactFlow Agentic Canvas + Fast Agent

An agentic workflow canvas built on ReactFlow with a Fluent UI variant, extended to execute nodes via [Fast Agent](https://fast-agent.ai/).

## Getting Started

```bash
cd reactflow-canvas
npm install
cp .env.example .env # set your Fast Agent creds
npm run dev
```

- Visit `/` for the ReactFlow canvas (Classic)
- Visit `/fluent` for the Fluent UI demo canvas

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
