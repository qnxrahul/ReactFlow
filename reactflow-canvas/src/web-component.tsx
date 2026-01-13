import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import './index.css'

// Reuse the existing canvas implementation as the embedded view.
import App from './App'

type ReactFlowCanvasElementProps = {
  /**
   * Optional theme hook for host apps (unused for now).
   * Reserved for future: "light" | "dark"
   */
  theme?: string
}

class ReactFlowCanvasElement extends HTMLElement {
  private _root: Root | null = null
  private _mountNode: HTMLDivElement | null = null

  static get observedAttributes() {
    return ['theme']
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
    }
  }

  private render() {
    if (!this._root) return
    // Props currently unused, but plumbed for future host integration.
    void this.getProps()

    this._root.render(
      <StrictMode>
        <App />
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

