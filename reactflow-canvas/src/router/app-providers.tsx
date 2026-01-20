import { type ReactNode } from 'react'
import { MsalProvider } from '@azure/msal-react'
import { BoardsProvider } from '../state/BoardsProvider'
import { NodeRegistryProvider } from '../workflows/NodeRegistryProvider'
import { getMsalInstance } from '../auth/msal'

export function AppProviders(props: { children: ReactNode }) {
  const msalInstance = getMsalInstance()

  return (
    <MsalProvider instance={msalInstance}>
      <BoardsProvider>
        <NodeRegistryProvider>{props.children}</NodeRegistryProvider>
      </BoardsProvider>
    </MsalProvider>
  )
}

