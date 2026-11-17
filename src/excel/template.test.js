import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { buildTemplate, templateFileName } from './template.js'
import { parseUpload } from './parse.js'
import { sanitiseSheetName, uniqueSheetNames } from './sheetNames.js'
import { TEMPLATE_VERSION, FIRST_DATA_ROW, COL, META, HEADER_ROW } from './layout.js'

const vocabulary = [
  {
    id: 'EN_ELEC_ES', label_en: 'Electricity, Spain grid', label_es: 'Electricidad, red de España',
    category: 'energy', direction: 'input', unit: 'kWh', dataset_name: 'DEMO electricity (fictional)',
    factor_gwp: 0.21, factor_water: 0.004, factor_res_minerals: 1.2e-7,
    factor_res_fossils: 4.2, factor_ecotox: 0.35, sort_order: 1,
  },
  {
    id: 'TR_LORRY_LARGE', label_en: 'Transport, lorry >32 t', label_es: 'Transporte, camión >32 t',
    category: 'transport', direction: 'input', unit: 'tkm', dataset_name: 'DEMO lorry (fictional)',
    factor_gwp: 0.085, factor_water: 0.0003, factor_res_minerals: 1.5e-8,
    factor_res_fossils: 1.25, factor_ecotox: 0.9, sort_order: 2,
  },
  {
    id: 'WA_PLASTIC_INCIN', label_en: 'Plastic waste, incineration', label_es: 'Residuo plástico, incineración',
    category: 'waste', direction: 'output', unit: 'kg', dataset_name: 'DEMO waste (fictional)',
    factor_gwp: 2.4, factor_water: 0.004, factor_res_minerals: 4e-9,
    factor_res_fossils: 0.8, factor_ecotox: 0.9, sort_order: 3,
  },
]

const study = {
  id: '33333333-3333-4333-8333-333333333333',
  fu_amount: 1000, fu_unit: 'unit_of_product', annual_production: 50000000,
  reference_year: 2025, chain_version: 2,
  selected_indicators: ['gwp', 'water'],
}
const company = { name: 'Northwind Medical' }
const product = { name: 'Single-use syringe' }
const processes = [
  { id: 'p-1', study_id: study.id, position: 1, name: 'Injection moulding' },
  { id: 'p-2', study_id: study.id, position: 2, name: 'Packaging' },
]

async function makeTemplate(lang = 'en') {
  const blob = await buildTemplate({ lang, study, product, company, processes, vocabulary })
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await blob.arrayBuffer())
  return { blob, wb }
}

function asFile(blob, name = 'template.xlsx') {
  return new File([blob], name, { type: blob.type })
}

/** Fills a process sheet in a loaded workbook and returns it as a File. */
async function fillAndPack(wb, sheetName, rows) {
  const ws = wb.getWorksheet(sheetName)
  rows.forEach((row, i) => {
    const r = FIRST_DATA_ROW + i
    ws.getCell(r, COL.direction).value = row.direction
    ws.getCell(r, COL.type).value = row.type
    ws.getCell(r, COL.quantity).value = row.quantity
    if ('unit' in row) ws.getCell(r, COL.unit).value = row.unit
    if ('distance' in row) ws.getCell(r, COL.distance).value = row.distance
    ws.getCell(r, COL.quality).value = row.quality
  })
  const buf = await wb.xlsx.writeBuffer()
  return asFile(new Blob([buf]))
}

describe('template generation', () => {
  it('has an Instructions sheet, one sheet per process in chain order, and a hidden Lists sheet', async () => {
    const { wb } = await makeTemplate('en')
    const names = wb.worksheets.map((w) => w.name)
    expect(names[0]).toBe('Instructions')
    expect(names).toContain('Lists')
    expect(names.filter((n) => n === 'Injection moulding' || n === 'Packaging'))
      .toEqual(['Injection moulding', 'Packaging'])
    expect(names.indexOf('Injection moulding')).toBeLessThan(names.indexOf('Packaging'))
    expect(wb.getWorksheet('Lists').state).toBe('hidden')
    expect(wb.worksheets[0].state).toBe('visible')
  })

  it('carries the hidden study id, process id and chain version, locked', async () => {
    const { wb } = await makeTemplate('en')
    const ws = wb.getWorksheet('Injection moulding')
    expect(ws.getCell(1, META.marker).value).toBe(TEMPLATE_VERSION)
    expect(ws.getCell(1, META.studyId).value).toBe(study.id)
    expect(ws.getCell(1, META.processId).value).toBe('p-1')
    expect(ws.getCell(1, META.chainVersion).value).toBe(2)
    expect(ws.getColumn(META.studyId).hidden).toBe(true)
    expect(ws.getCell(1, META.studyId).protection?.locked).not.toBe(false)
  })

  it('gives every data row working dropdowns and a locked Unit formula', async () => {
    const { wb } = await makeTemplate('en')
    const ws = wb.getWorksheet('Packaging')
    for (const r of [FIRST_DATA_ROW, FIRST_DATA_ROW + 99, FIRST_DATA_ROW + 199]) {
      expect(ws.getCell(r, COL.direction).dataValidation?.type).toBe('list')
      expect(ws.getCell(r, COL.direction).dataValidation.formulae[0]).toContain('Input')
      expect(ws.getCell(r, COL.type).dataValidation.formulae[0]).toContain('Lists')
      expect(ws.getCell(r, COL.quality).dataValidation.formulae[0]).toContain('Measured')
      const unit = ws.getCell(r, COL.unit)
      expect(unit.formula).toContain('MATCH')
      expect(unit.protection?.locked).not.toBe(false)
    }
    expect(ws.getCell(FIRST_DATA_ROW, COL.quantity).protection.locked).toBe(false)
  })

  it('writes column headers for all six columns', async () => {
    const { wb } = await makeTemplate('en')
    const ws = wb.getWorksheet('Packaging')
    const headers = [1, 2, 3, 4, 5, 6].map((c) => ws.getCell(HEADER_ROW, c).value)
    expect(headers).toEqual([
      'Input or output', 'Type', 'Annual quantity', 'Unit', 'Distance (km)', 'Data quality',
    ])
  })

  it('is produced in the active language', async () => {
    const { wb } = await makeTemplate('es')
    const names = wb.worksheets.map((w) => w.name)
    expect(names[0]).toBe('Instrucciones')
    expect(names).toContain('Listas')
    const ws = wb.getWorksheet('Packaging')
    expect(ws.getCell(HEADER_ROW, COL.direction).value).toBe('Entrada o salida')
    expect(ws.getCell(HEADER_ROW, COL.quality).value).toBe('Calidad del dato')
    expect(ws.getCell(FIRST_DATA_ROW, COL.quality).dataValidation.formulae[0]).toContain('Medido')
    expect(wb.getWorksheet('Listas').getCell(3, 1).value).toBe('Electricidad, red de España')
  })

  it('names the download after the company and product', () => {
    expect(templateFileName({ company, product, study }))
      .toBe('northwind-medical-single-use-syringe-template-v2.xlsx')
  })
})

describe('sheet names', () => {
  it('strips the characters Excel forbids and caps at 31', () => {
    expect(sanitiseSheetName('Mix / blend [stage]: 1?')).toBe('Mix  blend stage 1')
    expect(sanitiseSheetName('x'.repeat(40))).toHaveLength(31)
  })

  it('keeps truncated names distinct', () => {
    const long = 'Compounding and extrusion line number '
    const names = uniqueSheetNames([`${long}one`, `${long}two`], ['Instructions', 'Lists'])
    expect(names[0]).not.toBe(names[1])
    expect(names.every((n) => n.length <= 31)).toBe(true)
  })
})

describe('upload validation', () => {
  it('accepts a correctly filled template and snapshots the factors', async () => {
    const { wb } = await makeTemplate('en')
    const file = await fillAndPack(wb, 'Injection moulding', [
      { direction: 'Input', type: 'Electricity, Spain grid', quantity: 1200000, quality: 'Measured' },
      { direction: 'Input', type: 'Transport, lorry >32 t', quantity: 2000, distance: 800, quality: 'Estimated' },
      { direction: 'Output', type: 'Plastic waste, incineration', quantity: 4500, quality: 'Calculated' },
    ])
    const res = await parseUpload({ file, lang: 'en', study, processes, vocabulary })
    expect(res.problems).toEqual([])
    expect(res.rows).toHaveLength(3)
    const elec = res.rows[0]
    expect(elec).toMatchObject({
      process_id: 'p-1', source_sheet: 'Injection moulding', source_row: FIRST_DATA_ROW,
      direction: 'input', vocabulary_id: 'EN_ELEC_ES', annual_quantity: 1200000,
      unit: 'kWh', distance_km: null, data_quality: 'measured', factor_gwp: 0.21,
    })
    expect(res.rows[1]).toMatchObject({ unit: 'tkm', distance_km: 800, data_quality: 'estimated' })
    expect(res.rows[2]).toMatchObject({ direction: 'output', vocabulary_id: 'WA_PLASTIC_INCIN' })
    // A process sheet with no rows is allowed and reported as such.
    expect(res.perSheet.map((s) => s.count)).toEqual([3, 0])
  })

  it('matches labels in either language, ignoring case and spacing', async () => {
    const { wb } = await makeTemplate('en')
    const file = await fillAndPack(wb, 'Packaging', [
      { direction: 'input', type: '  electricidad,   RED de españa ', quantity: 10, quality: 'medido' },
    ])
    const res = await parseUpload({ file, lang: 'en', study, processes, vocabulary })
    expect(res.problems).toEqual([])
    expect(res.rows[0].vocabulary_id).toBe('EN_ELEC_ES')
  })

  it('rejects the whole file when one row is wrong, and saves nothing', async () => {
    const { wb } = await makeTemplate('en')
    const file = await fillAndPack(wb, 'Injection moulding', [
      { direction: 'Input', type: 'Electricity, Spain grid', quantity: 1200000, quality: 'Measured' },
      { direction: 'Input', type: 'Electrcity', quantity: 5, quality: 'Measured' },
    ])
    const res = await parseUpload({ file, lang: 'en', study, processes, vocabulary })
    expect(res.rows).toBeNull()
    expect(res.problems).toHaveLength(1)
    expect(res.problems[0]).toMatchObject({
      sheet: 'Injection moulding', row: FIRST_DATA_ROW + 1, column: 'Type',
    })
    expect(res.problems[0].reason)
      .toBe('"Electrcity" is not in the list. Choose a value from the dropdown.')
  })

  it('reports every faulty cell, with sheet, row, column and reason', async () => {
    const { wb } = await makeTemplate('en')
    const file = await fillAndPack(wb, 'Packaging', [
      { direction: 'Sideways', type: 'Electricity, Spain grid', quantity: -4, quality: 'Guessed' },
      { direction: 'Input', type: 'Transport, lorry >32 t', quantity: 10, quality: 'Measured' },
      { direction: 'Input', type: 'Electricity, Spain grid', quantity: 10, distance: 50, quality: 'Measured' },
      { direction: 'Output', type: 'Electricity, Spain grid', quantity: 10, quality: 'Measured' },
      { direction: 'Input', type: 'Electricity, Spain grid', quantity: 10, unit: 'MJ', quality: 'Measured' },
    ])
    const res = await parseUpload({ file, lang: 'en', study, processes, vocabulary })
    expect(res.rows).toBeNull()
    const columns = res.problems.map((p) => p.column)
    expect(columns).toContain('Input or output')
    expect(columns).toContain('Annual quantity')
    expect(columns).toContain('Data quality')
    expect(columns).toContain('Distance (km)')
    expect(columns).toContain('Unit')
    expect(res.problems.every((p) => p.sheet === 'Packaging' && p.row >= FIRST_DATA_ROW)).toBe(true)
    const missingDistance = res.problems.find((p) => p.row === FIRST_DATA_ROW + 1)
    expect(missingDistance.reason).toBe('Transport rows need a distance in km.')
  })

  it('rejects a template belonging to another study', async () => {
    const { blob } = await makeTemplate('en')
    const res = await parseUpload({
      file: asFile(blob), lang: 'en',
      study: { ...study, id: '99999999-9999-4999-8999-999999999999' },
      processes, vocabulary,
    })
    expect(res.problems[0].reason).toBe('This template belongs to another study.')
  })

  it('rejects a template from an older chain version', async () => {
    const { blob } = await makeTemplate('en')
    const res = await parseUpload({
      file: asFile(blob), lang: 'en', study: { ...study, chain_version: 3 }, processes, vocabulary,
    })
    expect(res.problems[0].reason)
      .toBe('Your process chain changed after this template was downloaded. Please download a new template.')
  })

  it('rejects a file that is not a template at all', async () => {
    const wb = new ExcelJS.Workbook()
    wb.addWorksheet('Sheet1').getCell('A1').value = 'hello'
    const buf = await wb.xlsx.writeBuffer()
    const res = await parseUpload({
      file: asFile(new Blob([buf])), lang: 'en', study, processes, vocabulary,
    })
    expect(res.problems[0].reason).toBe('This file is not an LCA Studio template. Download the template and fill that in.')
  })

  it('rejects an empty template', async () => {
    const { blob } = await makeTemplate('en')
    const res = await parseUpload({ file: asFile(blob), lang: 'en', study, processes, vocabulary })
    expect(res.problems[0].reason).toBe('The template is empty.')
  })

  it('rejects anything that is not .xlsx', async () => {
    const res = await parseUpload({
      file: asFile(new Blob(['x']), 'data.csv'), lang: 'en', study, processes, vocabulary,
    })
    expect(res.problems[0].reason).toBe('Please upload the .xlsx template.')
  })

  it('reports problems in the active language', async () => {
    const { wb } = await makeTemplate('es')
    const file = await fillAndPack(wb, 'Packaging', [
      { direction: 'Entrada', type: 'Electrcidad', quantity: 5, quality: 'Medido' },
    ])
    const res = await parseUpload({ file, lang: 'es', study, processes, vocabulary })
    expect(res.problems[0].column).toBe('Tipo')
    expect(res.problems[0].reason)
      .toBe('"Electrcidad" no está en la lista. Elige un valor del desplegable.')
  })
})
