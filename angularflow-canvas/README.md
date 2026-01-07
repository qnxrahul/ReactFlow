# Angular Foblex Flow Canvas (ReactFlow parity demo)

This Angular app replicates the core behavior of the `reactflow-canvas` “ClassicCanvas” using **Foblex/f-flow**:

- **Palette drag/drop → create nodes**
- **Connect nodes with edges**
- **Select node → edit properties**
- **Right-click node → Duplicate / Run Node / Run From Here / Delete**
- **Import/Export** workflow JSON (`{ nodes, edges }`)
- **Run node / run from here** executes via a mock Fast Agent client (optional real backend)

## Run

```bash
cd angularflow-canvas
npm install
npm start
```

Then open `http://localhost:4200/`.

## Workflow JSON format

Export produces:

```json
{
  "nodes": [
    { "id": "n-1", "type": "turbo", "position": { "x": 150, "y": 100 }, "data": { "title": "Start", "subtitle": "trigger" } }
  ],
  "edges": [
    { "id": "e-1", "outputId": "o:n-1", "inputId": "i:n-2" }
  ]
}
```

## Optional: connect to a real Fast Agent backend

By default the “Run” actions use mock responses. To point at a real backend, set these values at runtime:

```js
globalThis.__env = {
  FAST_AGENT_BASE_URL: 'http://localhost:8000',
  // optional:
  // FAST_AGENT_API_KEY: '...',
  // FAST_AGENT_AGENT_ID: '...',
  // FAST_AGENT_RUN_PATH: '/api/v1/agents/:id/run',
  // FAST_AGENT_FORCE_NETWORK: 'true',
}
```

The client logic mirrors `reactflow-canvas/src/services/fastAgent.ts` (tries common run endpoints, falls back to mock if unreachable).
