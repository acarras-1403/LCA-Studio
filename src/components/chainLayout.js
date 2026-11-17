// Pure geometry for the linear process chain, shared by the on-screen heat map
// and the PDF so both draw the same picture. No React, no DOM.
export const CHAIN_GEOMETRY = {
  boxW: 150, boxH: 86, gapX: 44, padX: 8, padY: 34, rowGap: 52, perRow: 5,
}

/**
 * Lays the chain out left to right, wrapping after `perRow` boxes so long
 * chains stay readable. Returns positions plus the overall canvas size, and is
 * shared by the on-screen heat map and the PDF so both draw the same picture.
 */
export function layoutChain(count, geo = CHAIN_GEOMETRY) {
  const { boxW, boxH, gapX, padX, padY, rowGap, perRow } = geo
  const columns = Math.min(count, perRow) || 1
  const rows = Math.max(1, Math.ceil(count / perRow))
  const boxes = []
  for (let i = 0; i < count; i += 1) {
    const r = Math.floor(i / perRow)
    const c = i % perRow
    boxes.push({
      index: i,
      row: r,
      col: c,
      x: padX + c * (boxW + gapX),
      y: padY + r * (boxH + rowGap),
      w: boxW,
      h: boxH,
      lastInRow: c === perRow - 1 || i === count - 1,
    })
  }
  return {
    boxes,
    width: padX * 2 + columns * boxW + Math.max(0, columns - 1) * gapX,
    height: padY * 2 + rows * boxH + Math.max(0, rows - 1) * rowGap,
    geo,
  }
}

/** Wraps a process name onto at most three short lines inside its box. */
export function wrapLabel(name, maxChars = 19, maxLines = 3) {
  const words = String(name || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w
    if (candidate.length <= maxChars) { line = candidate; continue }
    if (line) lines.push(line)
    line = w.length > maxChars ? `${w.slice(0, maxChars - 1)}…` : w
    if (lines.length === maxLines) break
  }
  if (line && lines.length < maxLines) lines.push(line)
  return lines.length ? lines.slice(0, maxLines) : ['']
}
