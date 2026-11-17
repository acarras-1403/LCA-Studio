// Spec Section 9. All five are always calculated; only the study's
// selected_indicators are displayed and exported.
export const INDICATORS = [
  { code: 'gwp',          factor: 'factor_gwp',          unit: 'kg CO2-eq' },
  { code: 'water',        factor: 'factor_water',        unit: 'm3 world-eq' },
  { code: 'res_minerals', factor: 'factor_res_minerals', unit: 'kg Sb-eq' },
  { code: 'res_fossils',  factor: 'factor_res_fossils',  unit: 'MJ' },
  { code: 'ecotox',       factor: 'factor_ecotox',       unit: 'CTUe' },
]
export const INDICATOR_CODES = INDICATORS.map((i) => i.code)
export const byCode = Object.fromEntries(INDICATORS.map((i) => [i.code, i]))

// Keep the canonical order whatever order the study stored them in.
export function orderIndicators(codes) {
  const set = new Set(codes || [])
  return INDICATOR_CODES.filter((c) => set.has(c))
}

export const DATA_QUALITY_SCORE = { measured: 1, calculated: 2, estimated: 3 }
export const DATA_QUALITY_LEVELS = ['measured', 'calculated', 'estimated']
