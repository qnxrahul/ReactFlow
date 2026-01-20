import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createAppRouter, AppRouterProvider } from './router/app-router'
import { AppProviders } from './router/app-providers'

const router = createAppRouter('browser')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <AppRouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
