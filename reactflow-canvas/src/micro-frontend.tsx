import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import './index.css'

import { createAppRouter, AppRouterProvider } from './router/app-router'
import { AppProviders } from './router/app-providers'

const roots = new WeakMap<HTMLElement, Root>()
const routers = new WeakMap<HTMLElement, ReturnType<typeof createAppRouter>>()

export type MountOptions = {
  /**
   * Initial route for the embedded app (e.g. "/classic", "/workspace").
   * If omitted, defaults to "/workspace".
   */
  initialPath?: string
}

export function mount(container: HTMLElement, options?: MountOptions) {
  if (roots.has(container)) return

  // Ensure the React app can size itself inside the host container.
  container.style.height = container.style.height || '100%'
  container.style.width = container.style.width || '100%'

  const router = createAppRouter('memory', { initialPath: options?.initialPath })
  routers.set(container, router)

  const root = createRoot(container)
  roots.set(container, root)
  root.render(
    <StrictMode>
      <AppProviders>
        <AppRouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  )
}

export function unmount(container: HTMLElement) {
  const root = roots.get(container)
  if (!root) return
  root.unmount()
  roots.delete(container)
  routers.delete(container)
  // Optional cleanup: remove any leftover DOM nodes.
  while (container.firstChild) container.removeChild(container.firstChild)
}

export function navigate(container: HTMLElement, path: string) {
  const router = routers.get(container)
  if (!router) return
  void router.navigate(path)
}

declare global {
  interface Window {
    ReactflowCanvasMFE?: {
      mount: typeof mount
      unmount: typeof unmount
      navigate: typeof navigate
    }
  }
}

// Expose an imperative API for the Angular host (micro-frontend style).
window.ReactflowCanvasMFE = { mount, unmount, navigate }

