import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// App component is routed as ClassicCanvas
import ClassicCanvas from './pages/ClassicCanvas'
import FluentCanvas from './pages/FluentCanvas'
import { createBrowserRouter, RouterProvider, Link, Outlet } from 'react-router-dom'

function Layout() {
  return (
    <>
      <div className="app-nav">
        <Link to="/">Classic</Link>
        <Link to="/fluent">Fluent UI</Link>
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
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
