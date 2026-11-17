import ExcelJS from 'exceljs'
import { makeT } from '../lib/i18n.jsx'
import {
  TEMPLATE_VERSION, HEADER_ROW, FIRST_DATA_ROW, COL, META,
  COLUMN_HEADER_KEY, QUALITY_KEYS,
} from './layout.js'

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/** A single rejection, rendered as sheet, row, column and reason. */
function problem({ sheet, row, column, reason }) {
  return { sheet: sheet || null, row: row || null, column: column || null, reason }
}

function cellText(cell) {
  const v = cell?.value
  if (v == null) return ''
  if (typeof v === 'object') {
    if ('text' in v && v.text != null) return String(v.text).trim()
    if ('result' in v) return v.result == null ? '' : String(v.result).trim()
    if ('richText' in v) return v.richText.map((r) => r.text).join('').trim()
    if ('formula' in v) return ''
    if (v instanceof Date) return v.toISOString()
  }
  return String(v).trim()
}

/** Accepts both "1 234,5" and "1,234.5" so a localised sheet still reads. */
export function parseNumber(raw) {
  if (raw == null || raw === '') return { empty: true }
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? { value: raw } : { invalid: true, text: String(raw) }
  }
  const text = String(raw).trim()
  if (!text) return { empty: true }
  let normalised = text.replace(/\s| | /g, '')
  const lastComma = normalised.lastIndexOf(',')
  const lastDot = normalised.lastIndexOf('.')
  if (lastComma > -1 && lastDot > -1) {
    normalised = lastComma > lastDot
      ? normalised.replace(/\./g, '').replace(',', '.')
      : normalised.replace(/,/g, '')
  } else if (lastComma > -1) {
    const decimals = normalised.length - lastComma - 1
    normalised = decimals === 3 && /^\d{1,3}(,\d{3})+$/.test(normalised)
      ? normalised.replace(/,/g, '')
      : normalised.replace(',', '.')
  }
  const n = Number(normalised)
  if (!Number.isFinite(n)) return { invalid: true, text }
  return { value: n }
}

function numberCell(cell) {
  const v = cell?.value
  if (v != null && typeof v === 'object') {
    if ('result' in v) return parseNumber(v.result)
    if ('formula' in v) return { empty: true }
  }
  return parseNumber(v)
}

/** Case- and whitespace-insensitive match against both labels. */
function normaliseLabel(value) {
  return String(value || '')
    .replace(/\s| /g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase()
}

export function buildLabelIndex(vocabulary) {
  const index = new Map()
  for (const v of vocabulary) {
    for (const label of [v.label_en, v.label_es, v.id]) {
      const key = normaliseLabel(label)
      if (key && !index.has(key)) index.set(key, v)
    }
  }
  return index
}

function metaOf(ws) {
  return {
    marker: cellText(ws.getCell(1, META.marker)),
    studyId: cellText(ws.getCell(1, META.studyId)),
    processId: cellText(ws.getCell(1, META.processId)),
    chainVersion: cellText(ws.getCell(1, META.chainVersion)),
  }
}

/**
 * Reads a completed template and validates every non-empty row. The whole
 * upload is rejected if any error exists: either `rows` or `problems` comes
 * back populated, never both.
 */
export async function parseUpload({ file, lang, study, processes, vocabulary }) {
  const t = makeT(lang)
  const fail = (reason, extra = {}) => ({ problems: [problem({ reason, ...extra })], rows: null })

  if (file.size > MAX_UPLOAD_BYTES) return fail(t('step3.fileTooLarge'))
  if (!/\.xlsx$/i.test(file.name || '')) return fail(t('step3.wrongFileType'))

  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(await file.arrayBuffer())
  } catch {
    return fail(t('validation.notATemplate'))
  }

  const sheets = wb.worksheets.filter((ws) => metaOf(ws).marker === TEMPLATE_VERSION)
  if (!sheets.length) return fail(t('validation.notATemplate'))

  const studyIds = new Set(sheets.map((ws) => metaOf(ws).studyId))
  if (studyIds.size !== 1 || !studyIds.has(String(study.id))) {
    return fail(t('validation.wrongStudy'))
  }

  const versions = new Set(sheets.map((ws) => String(metaOf(ws).chainVersion)))
  if (versions.size !== 1 || !versions.has(String(study.chain_version))) {
    return fail(t('validation.staleChain'))
  }

  const byId = new Map(processes.map((p) => [String(p.id), p]))
  const sheetProcessIds = sheets.map((ws) => metaOf(ws).processId)
  const unknown = sheetProcessIds.filter((id) => !byId.has(String(id)))
  if (unknown.length || new Set(sheetProcessIds).size !== processes.length) {
    return fail(t('validation.staleChain'))
  }

  const labels = buildLabelIndex(vocabulary)
  const vocabById = new Map(vocabulary.map((v) => [v.id, v]))
  const directionWords = {
    [normaliseLabel(t('common.input'))]: 'input',
    [normaliseLabel(t('common.output'))]: 'output',
    input: 'input',
    output: 'output',
    entrada: 'input',
    salida: 'output',
  }
  const qualityWords = {}
  for (const k of QUALITY_KEYS) {
    qualityWords[normaliseLabel(t(`quality.${k}`))] = k
    qualityWords[normaliseLabel(k)] = k
  }
  for (const [word, key] of [['medido', 'measured'], ['calculado', 'calculated'], ['estimado', 'estimated']]) {
    qualityWords[word] = key
  }

  const problems = []
  const rows = []
  const perSheet = []

  for (const ws of sheets) {
    const meta = metaOf(ws)
    const process = byId.get(String(meta.processId))
    const sheetName = ws.name
    let count = 0

    const lastRow = Math.max(ws.actualRowCount || 0, ws.rowCount || 0, FIRST_DATA_ROW)
    for (let r = FIRST_DATA_ROW; r <= lastRow; r += 1) {
      const dirRaw = cellText(ws.getCell(r, COL.direction))
      const typeRaw = cellText(ws.getCell(r, COL.type))
      const qtyCell = ws.getCell(r, COL.quantity)
      const qty = numberCell(qtyCell)
      const unitRaw = cellText(ws.getCell(r, COL.unit))
      const distCell = ws.getCell(r, COL.distance)
      const dist = numberCell(distCell)
      const qualRaw = cellText(ws.getCell(r, COL.quality))

      const isEmpty = !dirRaw && !typeRaw && qty.empty && !qualRaw && dist.empty
      if (isEmpty) continue

      const at = (columnKey, reason) => problems.push(problem({
        sheet: sheetName, row: r, column: t(COLUMN_HEADER_KEY[columnKey]), reason,
      }))

      // Input or output
      let direction = null
      if (!dirRaw) at('direction', t('validation.directionMissing'))
      else {
        direction = directionWords[normaliseLabel(dirRaw)] || null
        if (!direction) at('direction', t('validation.directionInvalid', { value: dirRaw }))
      }

      // Type
      let item = null
      if (!typeRaw) at('type', t('validation.typeMissing'))
      else {
        item = labels.get(normaliseLabel(typeRaw)) || null
        if (!item) at('type', t('validation.typeUnknown', { value: typeRaw }))
        else if (!vocabById.has(item.id)) {
          at('type', t('validation.vocabularyGone', { type: typeRaw }))
          item = null
        }
      }

      // Direction must match the type's own direction.
      if (item && direction && item.direction !== direction) {
        at('direction', t('validation.directionMismatch', {
          type: typeRaw,
          expected: t(`common.${item.direction}`).toLocaleLowerCase(),
          given: t(`common.${direction}`).toLocaleLowerCase(),
        }))
      }

      // Annual quantity
      let quantity = null
      if (qty.empty) at('quantity', t('validation.quantityMissing'))
      else if (qty.invalid) at('quantity', t('validation.quantityNotNumber', { value: qty.text }))
      else if (!(qty.value > 0)) at('quantity', t('validation.quantityNotPositive'))
      else quantity = qty.value

      // Unit: the template fills it in from the type and locks it. A blank cell
      // is accepted (the formula has not been recalculated yet) and taken from
      // the type; a different value is an error.
      if (item && unitRaw && normaliseLabel(unitRaw) !== normaliseLabel(item.unit)) {
        at('unit', t('validation.unitMismatch', {
          type: typeRaw, expected: item.unit, given: unitRaw,
        }))
      }

      // Distance: required above zero for transport, not allowed otherwise.
      const isTransport = item?.unit === 'tkm'
      let distance = null
      if (isTransport) {
        if (dist.empty) at('distance', t('validation.distanceMissing'))
        else if (dist.invalid) at('distance', t('validation.distanceNotNumber', { value: dist.text }))
        else if (!(dist.value > 0)) at('distance', t('validation.distanceNotPositive'))
        else distance = dist.value
      } else if (item && !dist.empty) {
        at('distance', t('validation.distanceNotAllowed'))
      }

      // Data quality
      let quality = null
      if (!qualRaw) at('quality', t('validation.qualityMissing'))
      else {
        quality = qualityWords[normaliseLabel(qualRaw)] || null
        if (!quality) at('quality', t('validation.qualityInvalid', { value: qualRaw }))
      }

      if (item && direction && quantity != null && quality
          && (!isTransport || distance != null)) {
        rows.push({
          study_id: study.id,
          process_id: process.id,
          source_sheet: sheetName,
          source_row: r,
          direction,
          vocabulary_id: item.id,
          annual_quantity: quantity,
          unit: item.unit,
          distance_km: isTransport ? distance : null,
          data_quality: quality,
          factor_gwp: item.factor_gwp,
          factor_water: item.factor_water,
          factor_res_minerals: item.factor_res_minerals,
          factor_res_fossils: item.factor_res_fossils,
          factor_ecotox: item.factor_ecotox,
        })
        count += 1
      }
    }
    perSheet.push({ process, sheet: sheetName, count })
  }

  if (problems.length) return { problems, rows: null, perSheet: null }
  if (!rows.length) return fail(t('validation.empty'))

  perSheet.sort((a, b) => (a.process?.position || 0) - (b.process?.position || 0))
  return { problems: [], rows, perSheet }
}

/** Plain-text form of the error list, for the copy button. */
export function problemsToText(problems, t) {
  return problems.map((p) => {
    const parts = []
    if (p.sheet) parts.push(`${t('step3.sheet')}: ${p.sheet}`)
    if (p.row) parts.push(`${t('step3.row')}: ${p.row}`)
    if (p.column) parts.push(`${t('step3.column')}: ${p.column}`)
    parts.push(p.reason)
    return parts.join(' — ')
  }).join('\n')
}

export { HEADER_ROW }
