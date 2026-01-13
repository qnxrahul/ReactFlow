import { CommonModule } from '@angular/common'
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { ReactCanvasAssetsService } from './react-canvas-assets.service'

type ReactCanvasMfeApi = {
  mount: (container: HTMLElement, options?: { initialPath?: string }) => void
  unmount: (container: HTMLElement) => void
  navigate?: (container: HTMLElement, path: string) => void
}

declare global {
  interface Window {
    ReactflowCanvasMFE?: ReactCanvasMfeApi
  }
}

@Component({
  selector: 'app-react-micro-frontend-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './react-micro-frontend.page.html',
  styleUrl: './react-micro-frontend.page.css',
})
export class ReactMicroFrontendPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { read: ElementRef })
  protected container?: ElementRef<HTMLDivElement>

  protected readonly loading = signal(true)
  protected readonly error = signal<string | null>(null)

  private mounted = false

  constructor(
    private readonly assets: ReactCanvasAssetsService,
    private readonly route: ActivatedRoute,
  ) {}

  async ngAfterViewInit() {
    try {
      await this.assets.loadMicroFrontend()

      const api = window.ReactflowCanvasMFE
      const el = this.container?.nativeElement
      if (!api || typeof api.mount !== 'function' || typeof api.unmount !== 'function') {
        throw new Error('ReactflowCanvasMFE API not found on window. Did the bundle load?')
      }
      if (!el) throw new Error('Mount container not found.')

      const qp = this.route.snapshot.queryParamMap.get('path')
      const initialPath = qp && qp.startsWith('/') ? qp : qp ? `/${qp}` : '/workspace'
      api.mount(el, { initialPath })
      this.mounted = true
    } catch (e) {
      this.error.set(String(e))
    } finally {
      this.loading.set(false)
    }
  }

  ngOnDestroy() {
    const api = window.ReactflowCanvasMFE
    const el = this.container?.nativeElement
    if (this.mounted && api && el) {
      try {
        api.unmount(el)
      } catch {
        // ignore
      }
    }
    this.mounted = false
  }
}

