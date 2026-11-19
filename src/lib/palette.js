/**
 * Life cycle stage colours. The five are defined once in index.css as CSS
 * variables so light and dark mode each get a set that was measured for
 * contrast; everything that draws a stage reads them from here, which is what
 * keeps the pie, the bars, the chips and the table agreeing with each other.
 */
export const STAGE_COUNT = 5

/** Colours cycle if a chain has more than five processes. */
export function stageIndex(position) {
  return ((Number(position) - 1) % STAGE_COUNT) + 1
}

export function stageFill(position) {
  return `var(--stage-${stageIndex(position)})`
}

export function stageText(position) {
  return `var(--stage-fg-${stageIndex(position)})`
}

export const QUALITY_FILL = {
  measured: 'var(--q-measured)',
  calculated: 'var(--q-calculated)',
  estimated: 'var(--q-estimated)',
}

export const QUALITY_TEXT = {
  measured: 'var(--q-measured-fg)',
  calculated: 'var(--q-calculated-fg)',
  estimated: 'var(--q-estimated-fg)',
}

export const QUALITY_LINE = {
  measured: 'var(--q-measured)',
  calculated: 'var(--q-calculated)',
  estimated: 'var(--q-estimated-line)',
}
