import { Routes } from '@angular/router'
import { FlowCanvasPageComponent } from './flow-canvas/flow-canvas.page'
import { ReactMicroFrontendPageComponent } from './react-embed/react-micro-frontend.page'
import { ReactWebComponentPageComponent } from './react-embed/react-web-component.page'

export const routes: Routes = [
  { path: '', component: FlowCanvasPageComponent },
  { path: 'react-wc', component: ReactWebComponentPageComponent },
  { path: 'react-mfe', component: ReactMicroFrontendPageComponent },
]
