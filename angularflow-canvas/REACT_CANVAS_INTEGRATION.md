# React canvas inside Angular canvas

This repo contains:

- `reactflow-canvas/` (React + Vite)
- `angularflow-canvas/` (Angular)

The Angular app can load the React canvas in **two non-iframe ways**:

1. **Web Component**: React builds a Custom Element `<reactflow-canvas>`
2. **Micro-frontend (imperative mount)**: React exposes `window.ReactflowCanvasMFE.mount/unmount`

## How to run (local)

From repo root:

```bash
npm --prefix reactflow-canvas ci
npm --prefix reactflow-canvas run build:wc
npm --prefix reactflow-canvas run build:mfe

npm --prefix angularflow-canvas ci
npm --prefix angularflow-canvas start
```

## Where the bundles go

- React outputs:
  - `reactflow-canvas/dist-wc/reactflow-canvas.wc.js`
  - `reactflow-canvas/dist-wc/reactflow-canvas.wc.css`
  - `reactflow-canvas/dist-mfe/reactflow-canvas.mfe.js`
  - `reactflow-canvas/dist-mfe/reactflow-canvas.mfe.css`
- Angular copies them into `assets/reactflow-canvas/` via `angularflow-canvas/angular.json`.

## Angular routes

- `/` : Angular canvas
- `/react-wc` : React canvas loaded as **Web Component**
- `/react-mfe` : React canvas loaded as **micro-frontend mount**

## Which is best for production?

### Web Component (recommended for most single-deploy apps)

**Best when** Angular and React ship together (same repo / same release train).

- **Pros**
  - Clean integration surface: HTML element + attributes/properties/events
  - Works well with Angular change detection (and avoids tight coupling)
  - Easier to reason about ownership (React owns its UI; Angular hosts it)
- **Cons**
  - You still ship React + its dependencies in the JS bundle (size)
  - Styling can bleed unless you add isolation (Shadow DOM, prefixes, etc.)

### Micro-frontend mount/unmount (best when you need more control)

**Best when** you want Angular to control routing/layout and you want an explicit React lifecycle.

- **Pros**
  - Host app can decide *when/where* to mount, unmount, remount
  - Easier to pass complex objects (call `mount(container, props)` in the future)
  - No custom-elements schema concerns outside the host component
- **Cons**
  - The contract is imperative and easy to break without versioning
  - Still ships React bundle; no “true independence” by itself

### When you actually need “micro-frontends” (Module Federation)

If the real goal is **independent deployment** (React ships separately, loaded remotely at runtime),
then you typically want **Module Federation** (Webpack) or Vite federation plugins, plus shared
dependency strategy (React singletons, version alignment, etc.).

That approach is powerful, but it’s heavier operationally: remote hosting, runtime versioning,
fallback behavior, caching, security headers, and CI/CD coordination.

## Recommendation summary

- **Same deployment / same pipeline**: choose **Web Component**.
- **Need explicit lifecycle + host-driven mounting**: choose **MFE mount/unmount**.
- **Need independent deploy + runtime remote loading**: choose **Module Federation** (heavier).

