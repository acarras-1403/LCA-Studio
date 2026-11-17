import ExcelJS from 'exceljs'
import { makeT } from '../lib/i18n.jsx'
import { uniqueSheetNames } from './sheetNames.js'
import {
  TEMPLATE_VERSION, HEADER_ROW, FIRST_DATA_ROW, LAST_DATA_ROW,
  COL, META, COLUMN_KEYS, COLUMN_HEADER_KEY, QUALITY_KEYS,
} from './layout.js'
import { slugify } from '../lib/slug.js'

const GRANATE = 'FF7A1F2B'
const SAGE_LIGHT = 'FFE6EBE1'
const INK = 'FF1F1D1B'
const WARM_GREY = 'FF6B6560'

function label(v, lang) {
  return lang === 'es' ? v.label_es : v.label_en
}

function titleCell(ws, row, text, size = 14) {
  const c = ws.getCell(row, 1)
  c.value = text
  c.font = { name: 'Calibri', size, bold: true, color: { argb: GRANATE } }
  return c
}

function bodyCell(ws, row, col, text, opts = {}) {
  const c = ws.getCell(row, col)
  c.value = text
  c.font = { name: 'Calibri', size: 11, bold: !!opts.bold, color: { argb: opts.grey ? WARM_GREY : INK } }
  c.alignment = { vertical: 'top', wrapText: opts.wrap !== false }
  return c
}

function writeInstructions(wb, { t, lang, study, product, company, processNames }) {
  const ws = wb.addWorksheet(t('template.instructionsSheet'), {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'portrait' },
  })
  ws.getColumn(1).width = 104

  let r = 1
  titleCell(ws, r += 0, t('template.title'), 16); r += 1
  bodyCell(ws, r, 1, t('template.disclaimer'), { bold: true }); r += 2
  bodyCell(ws, r, 1, `${t('template.company')}: ${company?.name || ''}`); r += 1
  bodyCell(ws, r, 1, `${t('template.product')}: ${product?.name || ''}`); r += 1
  bodyCell(ws, r, 1,
    `${t('template.functionalUnit')}: ${study.fu_amount} × ${t(`fuUnits.${study.fu_unit}`)}`); r += 1
  bodyCell(ws, r, 1, `${t('template.referenceYear')}: ${study.reference_year}`); r += 2

  titleCell(ws, r, t('template.howTo'), 13); r += 1
  for (const k of ['i1', 'i2', 'i3', 'i4', 'i5', 'i6']) {
    bodyCell(ws, r, 1, t(`template.${k}`)); r += 1
  }
  r += 1

  titleCell(ws, r, t('template.columnsTitle'), 13); r += 1
  for (const k of ['cDirection', 'cType', 'cQuantity', 'cUnit', 'cDistance', 'cQualityCol']) {
    bodyCell(ws, r, 1, t(`template.${k}`)); r += 1
  }
  r += 1

  titleCell(ws, r, t('template.qualityTitle'), 13); r += 1
  for (const k of ['qMeasured', 'qCalculated', 'qEstimated']) {
    bodyCell(ws, r, 1, t(`template.${k}`)); r += 1
  }
  r += 1

  titleCell(ws, r, t('template.exampleTitle'), 13); r += 1
  const headerRow = r
  COLUMN_KEYS.forEach((key, i) => {
    const c = ws.getCell(headerRow, i + 1)
    c.value = t(COLUMN_HEADER_KEY[key])
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: INK } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SAGE_LIGHT } }
    c.border = { bottom: { style: 'thin', color: { argb: GRANATE } } }
  })
  r += 1
  const sample = [
    t('common.input'),
    lang === 'es' ? 'Electricidad, red de España' : 'Electricity, Spain grid',
    1200000, 'kWh', '', t('quality.measured'),
  ]
  sample.forEach((v, i) => {
    const c = ws.getCell(r, i + 1)
    c.value = v
    c.font = { name: 'Calibri', size: 11, color: { argb: INK } }
  })
  r += 2
  bodyCell(ws, r, 1,
    `${t('template.processSheetProcess')}: ${processNames.join(' > ')}`, { grey: true })

  for (let i = 2; i <= 6; i += 1) ws.getColumn(i).width = 17
  return ws
}

function writeLists(wb, { t, lang, vocabulary, study }) {
  const ws = wb.addWorksheet(t('template.listsSheet'), { state: 'hidden' })
  ws.getCell(1, 1).value = t('template.doNotEdit')
  ws.getCell(1, 1).font = { bold: true }
  const headers = ['label', 'unit', 'id', 'direction', 'category']
  headers.forEach((h, i) => { ws.getCell(2, i + 1).value = h })
  vocabulary.forEach((v, i) => {
    const row = 3 + i
    ws.getCell(row, 1).value = label(v, lang)
    ws.getCell(row, 2).value = v.unit
    ws.getCell(row, 3).value = v.id
    ws.getCell(row, 4).value = v.direction
    ws.getCell(row, 5).value = v.category
  })
  ws.getCell(1, 7).value = TEMPLATE_VERSION
  ws.getCell(1, 8).value = study.id
  ws.getCell(1, 9).value = study.chain_version
  ws.getColumn(1).width = 46
  return { sheet: ws, first: 3, last: 2 + vocabulary.length, name: ws.name }
}

function quotedSheet(name) {
  return `'${String(name).replace(/'/g, "''")}'`
}

async function writeProcessSheet(wb, {
  t, sheetName, process, study, product, company, lists,
}) {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ showGridLines: false, state: 'frozen', ySplit: HEADER_ROW }],
  })
  const listRef = `${quotedSheet(lists.name)}!$A$${lists.first}:$A$${lists.last}`
  const unitRef = `${quotedSheet(lists.name)}!$B$${lists.first}:$B$${lists.last}`

  titleCell(ws, 1, t('template.title'), 14)
  bodyCell(ws, 2, 1,
    `${t('template.company')}: ${company?.name || ''} / ${t('template.product')}: ${product?.name || ''}`,
    { grey: true, wrap: false })
  bodyCell(ws, 3, 1, `${t('template.processSheetProcess')}: ${process.name}`, { bold: true, wrap: false })
  bodyCell(ws, 4, 1, `${t('template.referenceYear')}: ${study.reference_year}`, { grey: true, wrap: false })
  bodyCell(ws, 5, 1, t('template.i2'), { grey: true, wrap: false })

  COLUMN_KEYS.forEach((key, i) => {
    const c = ws.getCell(HEADER_ROW, i + 1)
    c.value = t(COLUMN_HEADER_KEY[key])
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: INK } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SAGE_LIGHT } }
    c.border = { bottom: { style: 'thin', color: { argb: GRANATE } } }
    c.alignment = { vertical: 'bottom', wrapText: true }
  })

  ws.getColumn(COL.direction).width = 17
  ws.getColumn(COL.type).width = 46
  ws.getColumn(COL.quantity).width = 17
  ws.getColumn(COL.unit).width = 11
  ws.getColumn(COL.distance).width = 14
  ws.getColumn(COL.quality).width = 17

  const directions = `"${t('common.input')},${t('common.output')}"`
  const qualities = `"${QUALITY_KEYS.map((k) => t(`quality.${k}`)).join(',')}"`

  for (let row = FIRST_DATA_ROW; row <= LAST_DATA_ROW; row += 1) {
    const dir = ws.getCell(row, COL.direction)
    dir.dataValidation = {
      type: 'list', allowBlank: true, formulae: [directions],
      showErrorMessage: true, errorStyle: 'stop', error: t('validation.directionMissing'),
    }
    dir.protection = { locked: false }

    const type = ws.getCell(row, COL.type)
    type.dataValidation = {
      type: 'list', allowBlank: true, formulae: [listRef],
      showErrorMessage: true, errorStyle: 'stop', error: t('validation.typeMissing'),
    }
    type.protection = { locked: false }

    const qty = ws.getCell(row, COL.quantity)
    qty.numFmt = '#,##0.######'
    qty.protection = { locked: false }

    // The Unit column fills itself in from the Type and stays locked.
    const unit = ws.getCell(row, COL.unit)
    unit.value = {
      formula: `IFERROR(INDEX(${unitRef},MATCH(B${row},${listRef},0)),"")`,
      result: '',
    }
    unit.protection = { locked: true }
    unit.font = { name: 'Calibri', size: 11, color: { argb: WARM_GREY } }

    const dist = ws.getCell(row, COL.distance)
    dist.numFmt = '#,##0.###'
    dist.protection = { locked: false }

    const qual = ws.getCell(row, COL.quality)
    qual.dataValidation = {
      type: 'list', allowBlank: true, formulae: [qualities],
      showErrorMessage: true, errorStyle: 'stop', error: t('validation.qualityMissing'),
    }
    qual.protection = { locked: false }
  }

  // Hidden, locked cells carrying the study id, this process's id and the chain
  // version, so an upload can be matched to the study and to the chain.
  ws.getCell(1, META.marker).value = TEMPLATE_VERSION
  ws.getCell(1, META.studyId).value = study.id
  ws.getCell(1, META.processId).value = process.id
  ws.getCell(1, META.chainVersion).value = study.chain_version
  ws.getCell(1, META.position).value = process.position
  for (const col of Object.values(META)) {
    ws.getColumn(col).hidden = true
    ws.getCell(1, col).protection = { locked: true }
  }

  await ws.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertRows: false,
    insertColumns: false,
    deleteRows: false,
    deleteColumns: false,
    sort: false,
    autoFilter: false,
  })
  return ws
}

/**
 * Builds the study's template: an Instructions sheet, one sheet per process in
 * chain order, and a hidden Lists sheet feeding the dropdowns. Returns a Blob.
 */
export async function buildTemplate({ lang, study, product, company, processes, vocabulary }) {
  const t = makeT(lang)
  const wb = new ExcelJS.Workbook()
  wb.creator = 'LCA Studio'
  wb.created = new Date()

  const chain = [...processes].sort((a, b) => a.position - b.position)
  const instructionsName = t('template.instructionsSheet')
  const listsName = t('template.listsSheet')
  const sheetNames = uniqueSheetNames(chain.map((p) => p.name), [instructionsName, listsName])

  writeInstructions(wb, { t, lang, study, product, company, processNames: chain.map((p) => p.name) })
  const lists = writeLists(wb, { t, lang, vocabulary, study })

  for (let i = 0; i < chain.length; i += 1) {
    // Sheets must be written in chain order, so these run in sequence.
    // eslint-disable-next-line no-await-in-loop
    await writeProcessSheet(wb, {
      t, sheetName: sheetNames[i], process: chain[i], study, product, company, lists,
    })
  }

  // The first sheet must be visible or Excel refuses to open the workbook.
  wb.worksheets[0].state = 'visible'

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function templateFileName({ company, product, study }) {
  const base = [slugify(company?.name), slugify(product?.name), 'template']
    .filter(Boolean).join('-')
  return `${base || 'lca-template'}-v${study.chain_version}.xlsx`
}
