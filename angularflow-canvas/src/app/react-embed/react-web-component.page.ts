import { CommonModule } from '@angular/common'
import { Component, OnInit, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ReactCanvasAssetsService } from './react-canvas-assets.service'

@Component({
  selector: 'app-react-web-component-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './react-web-component.page.html',
  styleUrl: './react-web-component.page.css',
})
export class ReactWebComponentPageComponent implements OnInit {
  protected readonly loading = signal(true)
  protected readonly error = signal<string | null>(null)

  constructor(private readonly assets: ReactCanvasAssetsService) {}

  async ngOnInit() {
    try {
      await this.assets.loadWebComponent()
    } catch (e) {
      this.error.set(String(e))
    } finally {
      this.loading.set(false)
    }
  }
}

