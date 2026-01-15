import { Outlet, RouterProvider, createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router-dom'
import { registerLicense } from '@syncfusion/ej2-base'

import ClassicCanvas from '../pages/ClassicCanvas'
import FluentCanvas from '../pages/FluentCanvas'
import WorkspaceCanvas from '../pages/WorkspaceCanvas'
import MappingPage from '../pages/MappingPage'
import WorkpaperPage from '../pages/WorkpaperPage'
import WorkpaperDetailPage from '../pages/WorkpaperDetailPage'
import NewBoard from '../pages/NewBoard/NewBoard'
import DataExtraction from '../pages/DataExtraction/DataExtraction'
import DynamicWorkflowCanvas from '../pages/DynamicWorkflowCanvas'
import DevUiWorkflowCanvas from '../pages/DevUiWorkflowCanvas'
import RegistryAdmin from '../pages/RegistryAdmin'
import A2UIPage from '../pages/A2UI'
import MsalAuthTest from '../pages/MsalAuthTest'

// Registering Syncfusion license key (needed by some routed pages).
registerLicense(
  'Ngo9BigBOggjHTQxAR8/V1JFaF1cXGFCf1FpRmJGfV5ycUVFal9STnNWUiweQnxTdEBiW39fcHdWQmBYVkVzXkleYg==',
)

function Layout() {
  return <Outlet />
}

export const appRoutes: RouteObject[] = [
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
      { path: '/A2UI', element: <A2UIPage /> },
      { path: '/auth-test', element: <MsalAuthTest /> },
    ],
  },
]

export type AppRouter = ReturnType<typeof createBrowserRouter>

export function createAppRouter(kind: 'browser' | 'memory', opts?: { initialPath?: string }): AppRouter {
  if (kind === 'memory') {
    const initialEntries = [opts?.initialPath || '/workspace']
    return createMemoryRouter(appRoutes, { initialEntries })
  }
  return createBrowserRouter(appRoutes)
}

export function AppRouterProvider(props: { router: AppRouter }) {
  return <RouterProvider router={props.router} />
}

