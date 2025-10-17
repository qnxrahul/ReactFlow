import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// App component is routed as ClassicCanvas
import ClassicCanvas from './pages/ClassicCanvas'
import FluentCanvas from './pages/FluentCanvas'
import { createBrowserRouter, RouterProvider, Link } from 'react-router-dom'

const router = createBrowserRouter([
  { path: '/', element: <ClassicCanvas /> },
  { path: '/fluent', element: <FluentCanvas /> },
])

const Root = () => (
  <>
    <div className="app-nav">
      <Link to="/">Classic</Link>
      <Link to="/fluent">Fluent UI</Link>
    </div>
    <RouterProvider router={router} />
  </>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
