import { type ReactNode } from 'react'
import { BoardsProvider } from '../state/BoardsProvider'
import { NodeRegistryProvider } from '../workflows/NodeRegistryProvider'

export function AppProviders(props: { children: ReactNode }) {
  return (
    <BoardsProvider>
      <NodeRegistryProvider>{props.children}</NodeRegistryProvider>
    </BoardsProvider>
  )
}

