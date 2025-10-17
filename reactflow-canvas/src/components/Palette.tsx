import React from 'react'

const ITEMS = [
  { type: 'input', label: 'Input' },
  { type: 'action', label: 'Action' },
  { type: 'decision', label: 'Decision' },
  { type: 'output', label: 'Output' },
  { type: 'report', label: 'AI Report' },
]

export function Palette() {
  const onDragStart = (evt: React.DragEvent, type: string) => {
    evt.dataTransfer.setData('application/reactflow', type)
    evt.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="palette">
      <div className="palette-title">Nodes</div>
      {ITEMS.map((it) => (
        <div
          key={it.type}
          className="palette-item"
          draggable
          onDragStart={(e) => onDragStart(e, it.type)}
        >
          {it.label}
        </div>
      ))}
    </div>
  )
}
