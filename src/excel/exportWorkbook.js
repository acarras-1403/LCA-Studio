import ExcelJS from 'exceljs'
import { makeT } from '../lib/i18n.jsx'
import { byCode } from '../lib/indicators.js'
import { DATA_QUALITY_LEVELS } from '../lib/indicators.js'
import { goalAndScopeRows, functionalUnitText } from '../lib/scopeFields.js'

const GRANATE = 'FF7A1F2B'
const SAGE_LIGHT = 'FFE6EBE1'
const INK = 'FF1F1D1B'

function sheet(wb, name) {
  const ws = wb.addWorksheet(name.slice(0, 31), { views: [{ showGridLines: false }] })
  return ws
}

function heading(ws, row, text) {
  const c = ws.getCell(row, 1)
  c.value = text
  c.font = { name: 'Calibri', size: 13, bold: true, color: { argb: GRANATE } }
}

function headerRow(ws, row, values) {
  values.forEach((v, i) => {
    const c = ws.getCell(row, i + 1)
    c.value = v
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: INK } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SAGE_LIGHT } }
    c.border = { bottom: { style: 'thin', color: { argb: GRANATE } } }
    c.alignment = { vertical: 'bottom', wrapText: true }
  })
}

function widths(ws, list) {
  list.forEach((w, i) => { ws.getColumn(i + 1).width = w })
}

/**
 * The six-sheet workbook from spec Section 3. Values are written at full
 * precision; only the text follows the active language.
 */
export async function buildExportWorkbook({
  lang, study, product, company, results, vocabularyMap,
}) {
  const t = makeT(lang)
  const wb = new ExcelJS.Workbook()
  wb.creator = 'LCA Studio'
  wb.created = new Date()

  const inds = results.indicators
  const labelOf = (id) => {
    const v = vocabularyMap?.[id]
    if (!v) return id
    return lang === 'es' ? v.label_es : v.label_en
  }
  const datasetOf = (id) => vocabularyMap?.[id]?.dataset_name || ''

  // 1. Summary ---------------------------------------------------------------
  {
    const ws = sheet(wb, t('exportDoc.sheetSummary'))
    widths(ws, [42, 46, 22, 22])
    let r = 1
    heading(ws, r, t('exportDoc.reportTitle')); r += 1
    ws.getCell(r, 1).value = t('disclaimer')
    ws.getCell(r, 1).font = { bold: true, color: { argb: GRANATE } }
    r += 2

    heading(ws, r, t('exportDoc.goalAndScope')); r += 1
    headerRow(ws, r, [t('exportDoc.field'), t('exportDoc.value')]); r += 1
    for (const row of goalAndScopeRows({ study, product, company, t, lang })) {
      ws.getCell(r, 1).value = row.label
      ws.getCell(r, 2).value = row.value
      r += 1
    }
    r += 1

    heading(ws, r, t('exportDoc.totalsPerIndicator')); r += 1
    headerRow(ws, r, [t('step4.indicator'), t('common.unit'), t('common.total')]); r += 1
    for (const code of inds) {
      ws.getCell(r, 1).value = t(`indicators.${code}`)
      ws.getCell(r, 2).value = byCode[code].unit
      ws.getCell(r, 3).value = results.totals[code]
      r += 1
    }
  }

  // 2. Inventory -------------------------------------------------------------
  {
    const ws = sheet(wb, t('exportDoc.sheetInventory'))
    const head = [
      t('common.process'), t('common.direction'), t('common.type'), t('common.dataset'),
      t('exportDoc.quantityAnnual'), t('common.unit'), t('exportDoc.distanceKm'),
      t('exportDoc.quantityPerFU'), ...inds.map((c) => `${t('exportDoc.factor')}: ${t(`indicatorsShort.${c}`)}`),
      t('common.dataQuality'),
    ]
    widths(ws, [24, 15, 42, 42, 18, 10, 14, 20, ...inds.map(() => 18), 15])
    headerRow(ws, 1, head)
    let r = 2
    for (const p of results.processes) {
      for (const row of p.rows) {
        const values = [
          p.name, t(`common.${row.direction}`), labelOf(row.vocabulary_id),
          datasetOf(row.vocabulary_id), Number(row.annual_quantity), row.unit,
          row.distance_km == null ? '' : Number(row.distance_km), row.q_fu,
          ...inds.map((c) => Number(row[byCode[c].factor])),
          t(`quality.${row.data_quality}`),
        ]
        values.forEach((v, i) => { ws.getCell(r, i + 1).value = v })
        r += 1
      }
    }
    ws.views = [{ state: 'frozen', ySplit: 1, showGridLines: false }]
  }

  // 3. Results by process ----------------------------------------------------
  {
    const ws = sheet(wb, t('exportDoc.sheetByProcess'))
    const head = [t('common.process')]
    for (const c of inds) {
      head.push(`${t(`indicatorsShort.${c}`)} (${byCode[c].unit})`)
      head.push(`${t(`indicatorsShort.${c}`)} %`)
    }
    widths(ws, [26, ...inds.flatMap(() => [22, 14])])
    headerRow(ws, 1, head)
    let r = 2
    for (const p of results.processes) {
      ws.getCell(r, 1).value = p.hasData ? p.name : `${p.name} (${t('common.noData')})`
      let col = 2
      for (const c of inds) {
        ws.getCell(r, col).value = p.hasData ? p.totals[c] : ''
        ws.getCell(r, col + 1).value = p.shares[c] == null ? '' : p.shares[c]
        col += 2
      }
      r += 1
    }
    ws.getCell(r, 1).value = t('common.total')
    ws.getCell(r, 1).font = { bold: true }
    let col = 2
    for (const c of inds) {
      ws.getCell(r, col).value = results.totals[c]
      ws.getCell(r, col).font = { bold: true }
      col += 2
    }
    ws.views = [{ state: 'frozen', ySplit: 1, showGridLines: false }]
  }

  // 4. Results by row --------------------------------------------------------
  {
    const ws = sheet(wb, t('exportDoc.sheetByRow'))
    const primary = inds[0]
    const head = [
      t('common.process'), t('common.type'), t('exportDoc.quantityPerFU'), t('common.unit'),
    ]
    for (const c of inds) {
      head.push(`${t(`indicatorsShort.${c}`)} (${byCode[c].unit})`)
      head.push(`${t(`indicatorsShort.${c}`)} %`)
    }
    head.push(t('common.dataQuality'))
    widths(ws, [24, 42, 20, 10, ...inds.flatMap(() => [22, 14]), 15])
    headerRow(ws, 1, head)
    const processName = Object.fromEntries(results.processes.map((p) => [p.id, p.name]))
    const sorted = [...results.rows].sort((a, b) => b.impacts[primary] - a.impacts[primary])
    let r = 2
    for (const row of sorted) {
      const values = [
        processName[row.process_id] || '', labelOf(row.vocabulary_id), row.q_fu, row.unit,
        ...inds.flatMap((c) => [row.impacts[c], row.shares[c] == null ? '' : row.shares[c]]),
        t(`quality.${row.data_quality}`),
      ]
      values.forEach((v, i) => { ws.getCell(r, i + 1).value = v })
      r += 1
    }
    ws.views = [{ state: 'frozen', ySplit: 1, showGridLines: false }]
  }

  // 5. Data quality ----------------------------------------------------------
  {
    const ws = sheet(wb, t('exportDoc.sheetQuality'))
    widths(ws, [30, 22, 20, 20, 16, 16])
    let r = 1
    heading(ws, r, t('step4.qualityShare')); r += 1
    headerRow(ws, r, [t('step4.indicator'), t('exportDoc.level'), t('common.impact'), t('exportDoc.shareOfImpact')])
    r += 1
    for (const c of inds) {
      for (const level of DATA_QUALITY_LEVELS) {
        const entry = results.qualityShares[c][level]
        ws.getCell(r, 1).value = t(`indicators.${c}`)
        ws.getCell(r, 2).value = t(`quality.${level}`)
        ws.getCell(r, 3).value = entry.impact
        ws.getCell(r, 4).value = entry.share == null ? '' : entry.share
        r += 1
      }
    }
    r += 1
    heading(ws, r, t('step4.processBadges')); r += 1
    headerRow(ws, r, [t('common.process'), t('step4.indicator'), t('exportDoc.score'), t('exportDoc.badge')])
    r += 1
    for (const p of results.processes) {
      for (const c of inds) {
        ws.getCell(r, 1).value = p.name
        ws.getCell(r, 2).value = t(`indicators.${c}`)
        ws.getCell(r, 3).value = p.hasData ? p.scores[c] : ''
        ws.getCell(r, 4).value = p.badges[c] ? t(`quality.${p.badges[c]}`) : t('common.noData')
        r += 1
      }
    }
    r += 1
    ws.getCell(r, 1).value = t('quality.scale')
    ws.getCell(r, 1).alignment = { wrapText: true }
  }

  // 6. Disclaimer ------------------------------------------------------------
  {
    const ws = sheet(wb, t('exportDoc.sheetDisclaimer'))
    widths(ws, [110])
    let r = 1
    heading(ws, r, t('exportDoc.disclaimerHeading')); r += 1
    ws.getCell(r, 1).value = t('disclaimer')
    ws.getCell(r, 1).alignment = { wrapText: true }
    ws.getCell(r, 1).font = { bold: true }
    r += 2
    heading(ws, r, t('exportDoc.limitations')); r += 1
    const limitations = makeLimitations(lang)
    limitations.forEach((text, i) => {
      ws.getCell(r, 1).value = `${i + 1}. ${text}`
      ws.getCell(r, 1).alignment = { wrapText: true }
      r += 1
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function makeLimitations(lang) {
  const t = makeT(lang)
  const list = t('limitations')
  return Array.isArray(list) ? list : []
}

export { functionalUnitText }
