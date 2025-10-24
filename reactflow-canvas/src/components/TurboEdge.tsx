import { getBezierPath, type EdgeProps } from '@xyflow/react'

export function TurboEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const xEqual = sourceX === targetX
  const yEqual = sourceY === targetY

  const [edgePath] = getBezierPath({
    sourceX: xEqual ? sourceX + 0.0001 : sourceX,
    sourceY: yEqual ? sourceY + 0.0001 : sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <path id={id} style={style} className="react-flow__edge-path" d={edgePath} markerEnd={markerEnd} />
  )
}
