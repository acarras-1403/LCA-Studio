// All business rules from spec Section 9. Nothing here touches the network.
// Per-FU quantities and impacts are never stored: this module recomputes them
// from the stored annual values, the study's functional unit and annual
// production, and each row's factor snapshot.
import { INDICATOR_CODES, byCode, orderIndicators, DATA_QUALITY_SCORE, DATA_QUALITY_LEVELS } from './indicators.js'

/** N_FU = annual_production / fu_amount. Null when either is missing or <= 0. */
export function functionalUnitsPerYear(study) {
  const prod = Number(study?.annual_production)
  const amount = Number(study?.fu_amount)
  if (!Number.isFinite(prod) || !Number.isFinite(amount)) return null
  if (prod <= 0 || amount <= 0) return null
  return prod / amount
}

/** Quantity per functional unit. Transport: (annual tonnes x km) / N_FU = tkm. */
export function quantityPerFU(row, nFU) {
  if (!nFU || nFU <= 0) return 0
  const q = Number(row.annual_quantity) || 0
  if (isTransportRow(row)) {
    const km = Number(row.distance_km) || 0
    return (q * km) / nFU
  }
  return q / nFU
}

export function isTransportRow(row) {
  return row.unit === 'tkm'
}

/** Impact per row and indicator = q_FU x the row's factor snapshot. */
export function rowImpacts(row, nFU) {
  const q = quantityPerFU(row, nFU)
  const out = {}
  for (const code of INDICATOR_CODES) {
    out[code] = q * (Number(row[byCode[code].factor]) || 0)
  }
  return out
}

/**
 * Full result set for a study.
 * @param study    lca_studies row
 * @param processes lca_processes rows (any order)
 * @param rows     lca_inventory_rows rows
 * @param vocab    map of vocabulary_id -> lca_vocabulary row (for labels/dataset names)
 */
export function computeResults(study, processes, rows, vocab = {}) {
  const nFU = functionalUnitsPerYear(study)
  const indicators = orderIndicators(study?.selected_indicators)
  const chain = [...(processes || [])].sort((a, b) => a.position - b.position)

  const enriched = (rows || []).map((row) => {
    const impacts = rowImpacts(row, nFU)
    return {
      ...row,
      q_fu: quantityPerFU(row, nFU),
      impacts,
      vocabulary: vocab[row.vocabulary_id] || null,
      score: DATA_QUALITY_SCORE[row.data_quality] ?? null,
    }
  })

  const totals = zeroes()
  for (const r of enriched) for (const c of INDICATOR_CODES) totals[c] += r.impacts[c]

  const processResults = chain.map((p) => {
    const pRows = enriched.filter((r) => r.process_id === p.id)
    const pTotals = zeroes()
    for (const r of pRows) for (const c of INDICATOR_CODES) pTotals[c] += r.impacts[c]
    const scores = {}
    for (const c of INDICATOR_CODES) scores[c] = processScore(pRows, c)
    return {
      ...p,
      rows: pRows,
      hasData: pRows.length > 0,
      totals: pTotals,
      shares: shareMap(pTotals, totals),
      scores,
      badges: Object.fromEntries(
        INDICATOR_CODES.map((c) => [c, pRows.length ? badgeFor(scores[c]) : null]),
      ),
    }
  })

  // Rows carry their share of the study total.
  for (const r of enriched) r.shares = shareMap(r.impacts, totals)

  const maxProcess = {}
  for (const c of INDICATOR_CODES) {
    maxProcess[c] = processResults.reduce((m, p) => Math.max(m, p.totals[c]), 0)
  }

  const topProcess = {}
  for (const c of INDICATOR_CODES) {
    const withData = processResults.filter((p) => p.hasData)
    topProcess[c] = withData.length
      ? withData.reduce((best, p) => (p.totals[c] > best.totals[c] ? p : best), withData[0])
      : null
  }

  return {
    nFU,
    indicators,
    rows: enriched,
    processes: processResults,
    totals,
    maxProcess,
    topProcess,
    qualityShares: qualityShares(enriched, totals),
    hasData: enriched.length > 0,
  }
}

function zeroes() {
  return Object.fromEntries(INDICATOR_CODES.map((c) => [c, 0]))
}

/** share = part / total x 100; null when the total is not > 0 (shown as a dash). */
export function share(part, total) {
  if (!(total > 0)) return null
  return (part / total) * 100
}

function shareMap(parts, totals) {
  return Object.fromEntries(INDICATOR_CODES.map((c) => [c, share(parts[c], totals[c])]))
}

/**
 * Process data quality score for one indicator: impact-weighted mean of the row
 * scores. If the process total for that indicator is 0, the unweighted mean.
 */
export function processScore(pRows, code) {
  if (!pRows.length) return null
  let num = 0
  let den = 0
  for (const r of pRows) {
    const w = r.impacts[code]
    num += w * r.score
    den += w
  }
  if (den > 0) return num / den
  const sum = pRows.reduce((a, r) => a + r.score, 0)
  return sum / pRows.length
}

/** Good < 1.5, Fair 1.5-2.5 inclusive, Poor > 2.5. */
export function badgeFor(score) {
  if (score == null) return null
  if (score < 1.5) return 'good'
  if (score <= 2.5) return 'fair'
  return 'poor'
}

/** Share of each indicator's impact coming from each data quality level. */
export function qualityShares(enriched, totals) {
  const out = {}
  for (const c of INDICATOR_CODES) {
    out[c] = {}
    for (const level of DATA_QUALITY_LEVELS) {
      const sum = enriched
        .filter((r) => r.data_quality === level)
        .reduce((a, r) => a + r.impacts[c], 0)
      out[c][level] = { impact: sum, share: share(sum, totals[c]) }
    }
  }
  return out
}

/**
 * Heat map colour position: process impact / largest process impact, 0..1.
 * If every process is 0, all boxes sit at the low end.
 */
export function heatPosition(processTotal, maxTotal) {
  if (!(maxTotal > 0)) return 0
  return Math.min(1, Math.max(0, processTotal / maxTotal))
}

/** Linear interpolation between two hex colours, t in 0..1. */
export function mixHex(from, to, t) {
  const a = hexToRgb(from)
  const b = hexToRgb(to)
  const k = Math.min(1, Math.max(0, t))
  const r = Math.round(a[0] + (b[0] - a[0]) * k)
  const g = Math.round(a[1] + (b[1] - a[1]) * k)
  const bl = Math.round(a[2] + (b[2] - a[2]) * k)
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** Relative luminance, used to flip the heat map label to white on dark fills. */
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function readableOn(hex) {
  return luminance(hex) > 0.42 ? '#1F1D1B' : '#FFFFFF'
}
