import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// App component is routed as ClassicCanvas
import ClassicCanvas from './pages/ClassicCanvas'
import FluentCanvas from './pages/FluentCanvas'
import WorkspaceCanvas from './pages/WorkspaceCanvas'
import MappingPage from './pages/MappingPage'
import WorkpaperPage from './pages/WorkpaperPage'
import WorkpaperDetailPage from './pages/WorkpaperDetailPage'
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { BoardsProvider } from './state/BoardsProvider'
import NewBoard from './pages/NewBoard/NewBoard'
import DataExtraction from './pages/DataExtraction/DataExtraction'
import DynamicWorkflowCanvas from './pages/DynamicWorkflowCanvas'
import DevUiWorkflowCanvas from './pages/DevUiWorkflowCanvas'
import RegistryAdmin from './pages/RegistryAdmin'
import { registerLicense } from '@syncfusion/ej2-base';
import { NodeRegistryProvider } from './workflows/NodeRegistryProvider'

// Registering Syncfusion license key
registerLicense('Ngo9BigBOggjHTQxAR8/V1JFaF1cXGFCf1FpRmJGfV5ycUVFal9STnNWUiweQnxTdEBiW39fcHdWQmBYVkVzXkleYg==');
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
      { path: '/', element: <WorkspaceCanvas /> },
      { path: '/classic', element: <ClassicCanvas /> },
      { path: '/fluent', element: <FluentCanvas /> },
      { path: '/workspace', element: <WorkspaceCanvas /> },
      { path: '/workspace/new', element: <NewBoard /> },
      { path: '/new-board', element: <NewBoard /> },
      { path: '/sample-documentation/extract', element: <DataExtraction /> },
      { path: '/mapping', element: <MappingPage /> },
      { path: '/workpaper', element: <WorkpaperPage /> },
      { path: '/workpaper-detail', element: <WorkpaperDetailPage /> },
      { path: '/dynamic', element: <DynamicWorkflowCanvas /> },
      { path: '/devui', element: <DevUiWorkflowCanvas /> },
      { path: '/registry', element: <RegistryAdmin /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BoardsProvider>
      <NodeRegistryProvider>
        <RouterProvider router={router} />
      </NodeRegistryProvider>
    </BoardsProvider>
  </StrictMode>,
)
