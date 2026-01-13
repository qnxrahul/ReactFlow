import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import './index.css'

import App from './App'

const roots = new WeakMap<HTMLElement, Root>()

export function mount(container: HTMLElement) {
  if (roots.has(container)) return

  // Ensure the React app can size itself inside the host container.
  container.style.height = container.style.height || '100%'
  container.style.width = container.style.width || '100%'

  const root = createRoot(container)
  roots.set(container, root)
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

export function unmount(container: HTMLElement) {
  const root = roots.get(container)
  if (!root) return
  root.unmount()
  roots.delete(container)
  // Optional cleanup: remove any leftover DOM nodes.
  while (container.firstChild) container.removeChild(container.firstChild)
}

declare global {
  interface Window {
    ReactflowCanvasMFE?: {
      mount: typeof mount
      unmount: typeof unmount
    }
  }
}

// Expose an imperative API for the Angular host (micro-frontend style).
window.ReactflowCanvasMFE = { mount, unmount }

