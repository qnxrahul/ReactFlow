import { Injectable } from '@angular/core'

function ensureLinkStylesheet(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLLinkElement>(`link[rel="stylesheet"][href="${href}"]`)
    if (existing) return resolve()

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`))
    document.head.appendChild(link)
  })
}

function ensureModuleScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[type="module"][src="${src}"]`)
    if (existing) return resolve()

    const script = document.createElement('script')
    script.type = 'module'
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load module script: ${src}`))
    document.head.appendChild(script)
  })
}

@Injectable({ providedIn: 'root' })
export class ReactCanvasAssetsService {
  private wcLoadPromise: Promise<void> | null = null
  private mfeLoadPromise: Promise<void> | null = null

  async loadWebComponent(): Promise<void> {
    if (!this.wcLoadPromise) {
      this.wcLoadPromise = (async () => {
        // CSS is optional; don't block the app if missing in dev.
        try {
          await ensureLinkStylesheet('/assets/reactflow-canvas/reactflow-canvas.wc.css')
        } catch {
          // ignore
        }
        await ensureModuleScript('/assets/reactflow-canvas/reactflow-canvas.wc.js')
      })()
    }
    return this.wcLoadPromise
  }

  async loadMicroFrontend(): Promise<void> {
    if (!this.mfeLoadPromise) {
      this.mfeLoadPromise = (async () => {
        try {
          await ensureLinkStylesheet('/assets/reactflow-canvas/reactflow-canvas.mfe.css')
        } catch {
          // ignore
        }
        await ensureModuleScript('/assets/reactflow-canvas/reactflow-canvas.mfe.js')
      })()
    }
    return this.mfeLoadPromise
  }
}

