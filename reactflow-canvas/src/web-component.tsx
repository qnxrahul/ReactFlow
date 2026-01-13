import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import './index.css'

import App from './App'
import FluentCanvas from './pages/FluentCanvas'

type ReactFlowCanvasElementProps = {
  /**
   * Optional theme hook for host apps (unused for now).
   * Reserved for future: "light" | "dark"
   */
  theme?: string

  /**
   * Which React canvas/page to render inside the host app.
   * - classic: current ReactFlow canvas (App)
   * - fluent: Fluent UI canvas
   */
  page?: 'classic' | 'fluent'
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  override componentDidCatch(error: Error) {
    // Keep a console breadcrumb for debugging from the host app.
    console.error('[reactflow-canvas] render error', error)
  }

  override render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ padding: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>React canvas crashed while rendering.</div>
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{String(this.state.error?.stack || this.state.error)}</pre>
      </div>
    )
  }
}

class ReactFlowCanvasElement extends HTMLElement {
  private _root: Root | null = null
  private _mountNode: HTMLDivElement | null = null

  static get observedAttributes() {
    return ['theme', 'page']
  }

  connectedCallback() {
    if (this._root) return

    this.style.display = this.style.display || 'block'
    this.style.height = this.style.height || '100%'
    this.style.width = this.style.width || '100%'

    this._mountNode = document.createElement('div')
    this._mountNode.style.height = '100%'
    this._mountNode.style.width = '100%'
    this.appendChild(this._mountNode)

    this._root = createRoot(this._mountNode)
    this.render()
  }

  disconnectedCallback() {
    try {
      this._root?.unmount()
    } finally {
      this._root = null
      this._mountNode?.remove()
      this._mountNode = null
    }
  }

  attributeChangedCallback(_name: string, _oldValue: string | null, _newValue: string | null) {
    this.render()
  }

  private getProps(): ReactFlowCanvasElementProps {
    return {
      theme: this.getAttribute('theme') ?? undefined,
      page: (this.getAttribute('page') as ReactFlowCanvasElementProps['page']) ?? 'classic',
    }
  }

  private render() {
    if (!this._root) return
    const props = this.getProps()

    const view =
      props.page === 'fluent'
        ? <FluentCanvas />
        : <App />

    this._root.render(
      <StrictMode>
        <ErrorBoundary>{view}</ErrorBoundary>
      </StrictMode>,
    )
  }
}

declare global {
  interface Window {
    __reactflowCanvasWcRegistered?: boolean
  }
}

// Avoid redefining during HMR / repeated loads.
if (!window.__reactflowCanvasWcRegistered) {
  window.__reactflowCanvasWcRegistered = true
  customElements.define('reactflow-canvas', ReactFlowCanvasElement)
}

