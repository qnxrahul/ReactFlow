import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// App component is routed as ClassicCanvas
import ClassicCanvas from './pages/ClassicCanvas'
import FluentCanvas from './pages/FluentCanvas'
import WorkspaceCanvas from './pages/WorkspaceCanvas'
import WorkspaceNewBoard from './pages/WorkspaceNewBoard'
import { createBrowserRouter, RouterProvider, Link, Outlet } from 'react-router-dom'

function Layout() {
  return (
    <>
      <div className="app-nav">
        <Link to="/">Classic</Link>
        <Link to="/fluent">Fluent UI</Link>
        <Link to="/workspace">Workspace UX</Link>
        <Link to="/workspace/new">Workspace New</Link>
      </div>
      <Outlet />
    </>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <ClassicCanvas /> },
      { path: '/fluent', element: <FluentCanvas /> },
      { path: '/workspace', element: <WorkspaceCanvas /> },
      { path: '/workspace/new', element: <WorkspaceNewBoard /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
