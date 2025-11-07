export function computePosition(index: number): { x: number; y: number } {
  const columnWidth = 200
  const rowHeight = 140
  const baseX = 260
  const baseY = 90
  const columns = 4
  const col = index % columns
  const row = Math.floor(index / columns)
  return {
    x: baseX + col * columnWidth,
    y: baseY + row * rowHeight,
  }
}
