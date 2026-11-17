import { describe, it, expect } from 'vitest'
import {
  functionalUnitsPerYear, quantityPerFU, rowImpacts, computeResults,
  processScore, badgeFor, share, heatPosition, mixHex,
} from './calc.js'
import { toSigFigs, formatNumber } from './format.js'

// The worked check from spec Section 9. Acceptance criterion 11 requires this
// to reproduce exactly.
const study = {
  id: 's1', fu_amount: 1000, fu_unit: 'unit_of_product', annual_production: 50_000_000,
  selected_indicators: ['gwp'],
}
const processes = [{ id: 'p1', study_id: 's1', position: 1, name: 'Moulding' }]
const zeroFactors = {
  factor_water: 0, factor_res_minerals: 0, factor_res_fossils: 0, factor_ecotox: 0,
}
const elecRow = {
  id: 'r1', study_id: 's1', process_id: 'p1', unit: 'kWh', direction: 'input',
  vocabulary_id: 'ELEC', annual_quantity: 1_200_000, distance_km: null,
  data_quality: 'measured', factor_gwp: 0.25, ...zeroFactors,
}
const lorryRow = {
  id: 'r2', study_id: 's1', process_id: 'p1', unit: 'tkm', direction: 'input',
  vocabulary_id: 'LORRY', annual_quantity: 2000, distance_km: 800,
  data_quality: 'estimated', factor_gwp: 0.1, ...zeroFactors,
}

describe('spec Section 9 worked check', () => {
  const nFU = functionalUnitsPerYear(study)

  it('N_FU = annual production / functional unit amount', () => {
    expect(nFU).toBe(50_000)
  })

  it('electricity: 24 kWh per FU and 6 kg CO2-eq', () => {
    expect(quantityPerFU(elecRow, nFU)).toBe(24)
    expect(rowImpacts(elecRow, nFU).gwp).toBe(6)
  })

  it('lorry transport: 32 tkm per FU and 3.2 kg CO2-eq', () => {
    expect(quantityPerFU(lorryRow, nFU)).toBe(32)
    expect(rowImpacts(lorryRow, nFU).gwp).toBeCloseTo(3.2, 12)
  })

  it('process total 9.2 kg CO2-eq and 65.2% electricity share', () => {
    const res = computeResults(study, processes, [elecRow, lorryRow])
    expect(res.totals.gwp).toBeCloseTo(9.2, 12)
    expect(res.processes[0].totals.gwp).toBeCloseTo(9.2, 12)
    const elec = res.rows.find((r) => r.id === 'r1')
    expect(toSigFigs(elec.shares.gwp, 3)).toBe(65.2)
    expect(formatNumber(elec.shares.gwp, 'en')).toBe('65.2')
  })

  it('process data quality score 1.70, badge Fair', () => {
    const res = computeResults(study, processes, [elecRow, lorryRow])
    const score = res.processes[0].scores.gwp
    expect(score).toBeCloseTo(1.6956521739, 9)
    expect(score.toFixed(2)).toBe('1.70')
    expect(badgeFor(score)).toBe('fair')
  })

  it('changing annual production recalculates without a new upload', () => {
    const doubled = { ...study, annual_production: 100_000_000 }
    const res = computeResults(doubled, processes, [elecRow, lorryRow])
    expect(res.nFU).toBe(100_000)
    expect(res.totals.gwp).toBeCloseTo(4.6, 12)
  })
})

describe('edge cases', () => {
  it('N_FU is null when annual production is missing or <= 0', () => {
    expect(functionalUnitsPerYear({ fu_amount: 1, annual_production: null })).toBeNull()
    expect(functionalUnitsPerYear({ fu_amount: 1, annual_production: 0 })).toBeNull()
    expect(functionalUnitsPerYear({ fu_amount: 0, annual_production: 10 })).toBeNull()
  })

  it('share is null when the total is not above zero', () => {
    expect(share(0, 0)).toBeNull()
    expect(share(5, 10)).toBe(50)
  })

  it('a process with no rows has no badge and is not counted', () => {
    const chain = [...processes, { id: 'p2', study_id: 's1', position: 2, name: 'Packing' }]
    const res = computeResults(study, chain, [elecRow])
    expect(res.processes[1].hasData).toBe(false)
    expect(res.processes[1].badges.gwp).toBeNull()
  })

  it('unweighted mean when the process total for an indicator is zero', () => {
    const rows = [
      { ...elecRow, impacts: null, factor_gwp: 0 },
      { ...lorryRow, factor_gwp: 0 },
    ]
    const res = computeResults(study, processes, rows)
    // measured (1) and estimated (3) -> unweighted mean 2
    expect(res.processes[0].scores.gwp).toBe(2)
    expect(res.processes[0].badges.gwp).toBe('fair')
  })

  it('every indicator is calculated even when only one is selected', () => {
    const res = computeResults(study, processes, [elecRow])
    expect(res.indicators).toEqual(['gwp'])
    expect(Object.keys(res.totals)).toEqual(
      ['gwp', 'water', 'res_minerals', 'res_fossils', 'ecotox'],
    )
  })
})

describe('data quality scale', () => {
  it('badge thresholds', () => {
    expect(badgeFor(1.49)).toBe('good')
    expect(badgeFor(1.5)).toBe('fair')
    expect(badgeFor(2.5)).toBe('fair')
    expect(badgeFor(2.51)).toBe('poor')
    expect(badgeFor(null)).toBeNull()
  })

  it('weighted mean puts the weight on the larger impact', () => {
    const rows = [
      { ...elecRow, impacts: undefined, score: 1 },
      { ...lorryRow, score: 3 },
    ]
    const res = computeResults(study, processes, rows)
    expect(processScore(res.processes[0].rows, 'gwp')).toBeCloseTo(1.6956521739, 9)
  })
})

describe('heat map', () => {
  it('position is the process share of the largest process', () => {
    expect(heatPosition(5, 10)).toBe(0.5)
    expect(heatPosition(10, 10)).toBe(1)
    expect(heatPosition(0, 0)).toBe(0)
  })

  it('runs from light sage to granate', () => {
    expect(mixHex('#E6EBE1', '#7A1F2B', 0)).toBe('#E6EBE1')
    expect(mixHex('#E6EBE1', '#7A1F2B', 1)).toBe('#7A1F2B')
    expect(mixHex('#E6EBE1', '#7A1F2B', 0.5)).toBe('#B08586')
  })
})

describe('display formatting', () => {
  it('three significant figures', () => {
    expect(formatNumber(1234.5678, 'en')).toBe('1,230')
    expect(formatNumber(0.0123456, 'en')).toBe('0.0123')
    expect(formatNumber(9.2, 'en')).toBe('9.2')
  })

  it('Spanish uses a comma decimal separator', () => {
    expect(formatNumber(9.25, 'es')).toBe('9,25')
  })

  it('scientific notation below 0.001', () => {
    expect(formatNumber(0.00024, 'en')).toBe('2.4\u00a0\u00d7\u00a010\u207b\u2074')
  })
})
