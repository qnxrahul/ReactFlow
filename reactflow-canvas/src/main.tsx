import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// App component is routed as ClassicCanvas
import ClassicCanvas from './pages/ClassicCanvas'
import FluentCanvas from './pages/FluentCanvas'
import WorkspaceCanvas from './pages/WorkspaceCanvas'
import WorkspaceNewBoard from './pages/WorkspaceNewBoard'
import MappingPage from './pages/MappingPage'
import WorkpaperPage from './pages/WorkpaperPage'
import WorkpaperDetailPage from './pages/WorkpaperDetailPage'
import { createBrowserRouter, RouterProvider, Link, Outlet } from 'react-router-dom'
import { BoardsProvider } from './state/BoardsProvider'

function Layout() {
  return (
    <>
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
      { path: '/mapping', element: <MappingPage /> },
      { path: '/workpaper', element: <WorkpaperPage /> },
      { path: '/workpaper-detail', element: <WorkpaperDetailPage /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BoardsProvider>
      <RouterProvider router={router} />
    </BoardsProvider>
  </StrictMode>,
)
