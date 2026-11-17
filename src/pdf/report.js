import { jsPDF } from 'jspdf'
import { makeT } from '../lib/i18n.jsx'
import { byCode, DATA_QUALITY_LEVELS } from '../lib/indicators.js'
import { formatNumber, formatPercent, formatDate, formatInteger } from '../lib/format.js'
import { goalAndScopeRows, functionalUnitText } from '../lib/scopeFields.js'
import { heatPosition, mixHex, readableOn } from '../lib/calc.js'
import { layoutChain, wrapLabel } from '../components/chainLayout.js'
import { SOURCESERIF4_SEMIBOLD, SOURCESANS3_REGULAR, SOURCESANS3_SEMIBOLD } from './fonts/embedded.js'

// A4 portrait, millimetres. Light-mode brand palette throughout: the report is
// a printed document, so it does not follow the interface theme.
const PAGE = { w: 210, h: 297 }
const M = { left: 18, right: 18, top: 20, bottom: 22 }
const CONTENT_W = PAGE.w - M.left - M.right

const C = {
  granate: '#7A1F2B',
  granateDark: '#5C1520',
  sage: '#8A9A7B',
  sageDark: '#5E6E52',
  sageLight: '#E6EBE1',
  ink: '#1F1D1B',
  warmGrey: '#6B6560',
  line: '#D9D4CC',
  white: '#FFFFFF',
  noData: '#CFCAC2',
}

const SERIF = 'SourceSerif4'
const SANS = 'SourceSans3'

function registerFonts(doc) {
  doc.addFileToVFS(SOURCESERIF4_SEMIBOLD.file, SOURCESERIF4_SEMIBOLD.base64)
  doc.addFont(SOURCESERIF4_SEMIBOLD.file, SERIF, 'normal', 600)
  doc.addFileToVFS(SOURCESANS3_REGULAR.file, SOURCESANS3_REGULAR.base64)
  doc.addFont(SOURCESANS3_REGULAR.file, SANS, 'normal', 400)
  doc.addFileToVFS(SOURCESANS3_SEMIBOLD.file, SOURCESANS3_SEMIBOLD.base64)
  doc.addFont(SOURCESANS3_SEMIBOLD.file, SANS, 'normal', 600)
}

class Writer {
  constructor(doc) {
    this.doc = doc
    this.y = M.top
  }

  heading(text, size = 15) {
    this.space(size * 0.5 + 4)
    this.doc.setFont(SERIF, 'normal', 600)
    this.doc.setFontSize(size)
    this.doc.setTextColor(C.granate)
    this.doc.text(text, M.left, this.y)
    this.y += size * 0.42
    this.doc.setDrawColor(C.granate)
    this.doc.setLineWidth(0.5)
    this.doc.line(M.left, this.y, M.left + CONTENT_W, this.y)
    this.y += 6
  }

  subheading(text, size = 11.5) {
    this.space(10)
    this.doc.setFont(SANS, 'normal', 600)
    this.doc.setFontSize(size)
    this.doc.setTextColor(C.ink)
    this.doc.text(text, M.left, this.y)
    this.y += 6
  }

  body(text, opts = {}) {
    const size = opts.size || 9.5
    const colour = opts.colour || C.ink
    const weight = opts.weight || 400
    const width = opts.width || CONTENT_W
    this.doc.setFont(SANS, 'normal', weight)
    this.doc.setFontSize(size)
    this.doc.setTextColor(colour)
    const lines = this.doc.splitTextToSize(String(text), width)
    for (const line of lines) {
      this.space(size * 0.5)
      this.doc.text(line, opts.x ?? M.left, this.y)
      this.y += size * 0.47
    }
    this.y += opts.gap ?? 2
  }

  /** Reserves vertical room, starting a new page when it will not fit. */
  space(needed) {
    if (this.y + needed > PAGE.h - M.bottom) this.page()
  }

  page() {
    this.doc.addPage()
    this.y = M.top
  }

  rule(colour = C.line) {
    this.space(4)
    this.doc.setDrawColor(colour)
    this.doc.setLineWidth(0.2)
    this.doc.line(M.left, this.y, M.left + CONTENT_W, this.y)
    this.y += 4
  }

  /** Two-column label/value table, used for goal and scope. */
  pairs(rows, labelWidth = 62) {
    const valueWidth = CONTENT_W - labelWidth - 4
    for (const { label, value } of rows) {
      this.doc.setFont(SANS, 'normal', 600)
      this.doc.setFontSize(9)
      const labelLines = this.doc.splitTextToSize(String(label), labelWidth)
      this.doc.setFont(SANS, 'normal', 400)
      const valueLines = this.doc.splitTextToSize(String(value || '—'), valueWidth)
      const height = Math.max(labelLines.length, valueLines.length) * 4.3 + 2.4
      this.space(height)
      const top = this.y
      this.doc.setFont(SANS, 'normal', 600)
      this.doc.setTextColor(C.sageDark)
      labelLines.forEach((l, i) => this.doc.text(l, M.left, top + i * 4.3))
      this.doc.setFont(SANS, 'normal', 400)
      this.doc.setTextColor(C.ink)
      valueLines.forEach((l, i) => this.doc.text(l, M.left + labelWidth + 4, top + i * 4.3))
      this.y = top + height
      this.doc.setDrawColor(C.line)
      this.doc.setLineWidth(0.15)
      this.doc.line(M.left, this.y - 1.6, M.left + CONTENT_W, this.y - 1.6)
    }
    this.y += 2
  }

  /** Simple data table with a sage-light header band. */
  table(headers, rows, widths, opts = {}) {
    const align = opts.align || headers.map(() => 'left')
    const rowH = 5.4
    const drawHead = () => {
      this.space(rowH + 2)
      this.doc.setFillColor(C.sageLight)
      this.doc.rect(M.left, this.y - 3.9, CONTENT_W, rowH, 'F')
      this.doc.setFont(SANS, 'normal', 600)
      this.doc.setFontSize(8.3)
      this.doc.setTextColor(C.ink)
      let x = M.left
      headers.forEach((h, i) => {
        const w = widths[i]
        this.doc.text(String(h), align[i] === 'right' ? x + w - 1.5 : x + 1.5, this.y,
          { align: align[i] === 'right' ? 'right' : 'left' })
        x += w
      })
      this.doc.setDrawColor(C.granate)
      this.doc.setLineWidth(0.3)
      this.doc.line(M.left, this.y + 1.5, M.left + CONTENT_W, this.y + 1.5)
      this.y += rowH + 1
    }
    drawHead()
    this.doc.setFont(SANS, 'normal', 400)
    this.doc.setFontSize(8.3)
    for (const row of rows) {
      if (this.y + rowH > PAGE.h - M.bottom) { this.page(); drawHead() }
      let x = M.left
      this.doc.setTextColor(C.ink)
      row.forEach((cell, i) => {
        const w = widths[i]
        const text = this.doc.splitTextToSize(String(cell ?? ''), w - 3)[0] || ''
        this.doc.text(text, align[i] === 'right' ? x + w - 1.5 : x + 1.5, this.y,
          { align: align[i] === 'right' ? 'right' : 'left' })
        x += w
      })
      this.y += rowH
      this.doc.setDrawColor(C.line)
      this.doc.setLineWidth(0.1)
      this.doc.line(M.left, this.y - 3.6, M.left + CONTENT_W, this.y - 3.6)
    }
    this.y += 3
  }

  /** Horizontal bars, one per process, in chain order. */
  bars(items, unit, lang) {
    const labelW = 52
    const barW = CONTENT_W - labelW - 44
    const peak = items.reduce((m, i) => Math.max(m, i.value || 0), 0)
    for (const item of items) {
      this.space(7)
      this.doc.setFont(SANS, 'normal', 400)
      this.doc.setFontSize(8.5)
      this.doc.setTextColor(C.ink)
      const name = this.doc.splitTextToSize(item.label, labelW - 2)[0] || ''
      this.doc.text(name, M.left, this.y + 2.6)
      const x = M.left + labelW
      this.doc.setFillColor(C.sageLight)
      this.doc.roundedRect(x, this.y, barW, 3.6, 0.8, 0.8, 'F')
      if (!item.noData && peak > 0 && item.value > 0) {
        const w = Math.max(0.6, (item.value / peak) * barW)
        this.doc.setFillColor(C.granate)
        this.doc.roundedRect(x, this.y, w, 3.6, 0.8, 0.8, 'F')
      }
      this.doc.setTextColor(C.warmGrey)
      const right = M.left + CONTENT_W
      const text = item.noData
        ? this.noDataText
        : `${formatNumber(item.value, lang)} ${unit}   ${formatPercent(item.share, lang)}`
      this.doc.setFontSize(8)
      this.doc.text(text, right, this.y + 2.9, { align: 'right' })
      this.y += 7.4
    }
    this.y += 2
  }

  /** The chain drawn as boxes with arrows, optionally shaded as a heat map. */
  chain(items) {
    const scale = 0.33
    const { boxes, width, height } = layoutChain(items.length)
    const drawW = width * scale
    const offsetX = M.left + Math.max(0, (CONTENT_W - drawW) / 2)
    this.space(height * scale + 6)
    const top = this.y
    const px = (v) => offsetX + v * scale
    const py = (v) => top + v * scale

    this.doc.setLineWidth(0.3)
    boxes.forEach((b, i) => {
      const next = boxes[i + 1]
      this.doc.setDrawColor(C.sage)
      if (next && next.row === b.row) {
        this.doc.line(px(b.x + b.w + 4), py(b.y + b.h / 2), px(next.x - 4), py(next.y + next.h / 2))
        const ax = px(next.x - 4)
        const ay = py(next.y + next.h / 2)
        this.doc.setFillColor(C.sage)
        this.doc.triangle(ax, ay, ax - 1.6, ay - 1, ax - 1.6, ay + 1, 'F')
      } else if (next) {
        const midY = py(b.y + b.h + 26)
        this.doc.line(px(b.x + b.w / 2), py(b.y + b.h + 4), px(b.x + b.w / 2), midY)
        this.doc.line(px(b.x + b.w / 2), midY, px(next.x + next.w / 2), midY)
        this.doc.line(px(next.x + next.w / 2), midY, px(next.x + next.w / 2), py(next.y - 4))
      }
    })

    boxes.forEach((b, i) => {
      const item = items[i]
      this.doc.setFillColor(item.fill || C.white)
      this.doc.setDrawColor(item.muted ? C.line : C.granate)
      this.doc.setLineWidth(0.35)
      this.doc.roundedRect(px(b.x), py(b.y), b.w * scale, b.h * scale, 1.6, 1.6, 'FD')
      const lines = wrapLabel(item.name, 17, 3)
      this.doc.setFont(SANS, 'normal', 600)
      this.doc.setFontSize(7.4)
      this.doc.setTextColor(item.textColor || C.ink)
      const cx = px(b.x + b.w / 2)
      const blockH = lines.length * 3 + (item.caption ? 3.6 : 0)
      let ty = py(b.y + b.h / 2) - blockH / 2 + 2.4
      for (const line of lines) {
        this.doc.text(line, cx, ty, { align: 'center' })
        ty += 3
      }
      if (item.caption) {
        this.doc.setFontSize(7.6)
        this.doc.text(item.caption, cx, ty + 1, { align: 'center' })
      }
      this.doc.setFont(SANS, 'normal', 400)
      this.doc.setFontSize(5.6)
      this.doc.setTextColor(item.textColor || C.warmGrey)
      this.doc.text(String(i + 1), px(b.x) + 1.4, py(b.y) + 3)
    })
    this.y = top + height * scale + 4
  }

  /** Measured / calculated / estimated split as one stacked bar. */
  stacked(shares, lang, t) {
    const h = 4.4
    this.space(h + 10)
    const x0 = M.left
    const fills = { measured: C.granate, calculated: C.sage, estimated: C.sageLight }
    let x = x0
    const any = DATA_QUALITY_LEVELS.some((l) => (shares?.[l]?.share ?? 0) > 0)
    this.doc.setDrawColor(C.line)
    this.doc.setLineWidth(0.2)
    this.doc.rect(x0, this.y, CONTENT_W, h, 'D')
    if (any) {
      for (const level of DATA_QUALITY_LEVELS) {
        const pct = shares[level].share ?? 0
        if (!(pct > 0)) continue
        const w = (pct / 100) * CONTENT_W
        this.doc.setFillColor(fills[level])
        this.doc.rect(x, this.y, w, h, 'F')
        x += w
      }
      this.doc.rect(x0, this.y, CONTENT_W, h, 'D')
    }
    this.y += h + 4
    this.doc.setFont(SANS, 'normal', 400)
    this.doc.setFontSize(8)
    let lx = x0
    for (const level of DATA_QUALITY_LEVELS) {
      this.doc.setFillColor(fills[level])
      this.doc.setDrawColor(C.line)
      this.doc.rect(lx, this.y - 2.6, 2.6, 2.6, 'FD')
      this.doc.setTextColor(C.warmGrey)
      const text = `${t(`quality.${level}`)} ${formatPercent(shares?.[level]?.share, lang)}`
      this.doc.text(text, lx + 4, this.y)
      lx += this.doc.getTextWidth(text) + 12
    }
    this.y += 6
  }
}

/** Fetches the product photo and rasterises it so jsPDF can embed it. */
async function loadImage(url) {
  if (!url) return null
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = reject
        el.src = objectUrl
      })
      const maxSide = 900
      const nw = img.naturalWidth || 640
      const nh = img.naturalHeight || 400
      const scale = Math.min(1, maxSide / Math.max(nw, nh))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(nw * scale))
      canvas.height = Math.max(1, Math.round(nh * scale))
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height }
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  } catch {
    return null
  }
}

function heatItems(results, code, t) {
  return results.processes.map((p) => {
    if (!p.hasData) {
      return { name: p.name, fill: C.noData, textColor: '#4A4540', caption: t('common.noData'), muted: true }
    }
    const pos = heatPosition(p.totals[code], results.maxProcess[code])
    const fill = mixHex(C.sageLight, C.granate, pos)
    return {
      name: p.name,
      fill,
      textColor: readableOn(fill),
      caption: p.shares[code] == null ? '0%' : formatPercent(p.shares[code], 'en'),
    }
  })
}

/**
 * The eight-section report of spec Section 3, in the active language.
 * Returns a Blob.
 */
export async function buildReport({
  lang, study, product, company, results, vocabularyMap, imageUrl,
}) {
  const t = makeT(lang)
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  registerFonts(doc)
  const w = new Writer(doc)
  w.noDataText = t('common.noData')

  const labelOf = (id) => {
    const v = vocabularyMap?.[id]
    if (!v) return id
    return lang === 'es' ? v.label_es : v.label_en
  }
  const inds = results.indicators
  const image = await loadImage(imageUrl)

  // 1. Cover -----------------------------------------------------------------
  doc.setFont(SERIF, 'normal', 600)
  doc.setFontSize(22)
  doc.setTextColor(C.granate)
  doc.text(t('app.wordmark'), M.left, 34)
  doc.setDrawColor(C.sage)
  doc.setLineWidth(0.6)
  doc.line(M.left, 39, M.left + 46, 39)

  doc.setFont(SANS, 'normal', 600)
  doc.setFontSize(10)
  doc.setTextColor(C.sageDark)
  doc.text(t('app.name'), M.left, 48)

  doc.setFont(SERIF, 'normal', 600)
  doc.setFontSize(27)
  doc.setTextColor(C.ink)
  const titleLines = doc.splitTextToSize(t('exportDoc.reportTitle'), CONTENT_W)
  let ty = 64
  for (const line of titleLines) { doc.text(line, M.left, ty); ty += 11 }

  let coverY = ty + 4
  if (image) {
    const maxW = CONTENT_W
    const maxH = 78
    const ratio = image.width / image.height
    let iw = maxW
    let ih = iw / ratio
    if (ih > maxH) { ih = maxH; iw = ih * ratio }
    doc.setDrawColor(C.line)
    doc.setLineWidth(0.3)
    doc.addImage(image.dataUrl, 'PNG', M.left, coverY, iw, ih)
    doc.rect(M.left, coverY, iw, ih, 'D')
    coverY += ih + 10
  }

  const coverRows = [
    [t('step1.companyName'), company?.name || ''],
    [t('step1.productName'), product?.name || ''],
    [t('step1.functionalUnit'), functionalUnitText({ study, t, lang })],
    [t('step1.referenceYear'), String(study.reference_year)],
    [t('exportDoc.reportDate'), formatDate(new Date(), lang)],
  ]
  doc.setFontSize(10)
  for (const [k, v] of coverRows) {
    doc.setFont(SANS, 'normal', 600)
    doc.setTextColor(C.sageDark)
    doc.text(k, M.left, coverY)
    doc.setFont(SANS, 'normal', 400)
    doc.setTextColor(C.ink)
    doc.text(String(v), M.left + 56, coverY)
    coverY += 6.4
  }

  coverY += 8
  doc.setFillColor(C.granate)
  doc.roundedRect(M.left, coverY - 5.6, 78, 9, 1.6, 1.6, 'F')
  doc.setFont(SANS, 'normal', 600)
  doc.setFontSize(9.5)
  doc.setTextColor(C.white)
  doc.text(t('app.demoLabelShort'), M.left + 4, coverY)

  // 2. Goal and scope --------------------------------------------------------
  w.page()
  w.heading(t('exportDoc.coverGoal'))
  w.pairs(goalAndScopeRows({ study, product, company, t, lang }))

  // 3. Process chain ---------------------------------------------------------
  w.heading(t('exportDoc.coverChain'))
  w.chain(results.processes.map((p) => ({ name: p.name })))

  // 4. Results per indicator -------------------------------------------------
  w.page()
  w.heading(t('exportDoc.resultsPerIndicator'))
  const processNameById = Object.fromEntries(results.processes.map((p) => [p.id, p.name]))
  for (const code of inds) {
    w.space(60)
    w.subheading(t(`indicators.${code}`), 12)
    w.body(
      `${formatNumber(results.totals[code], lang)} ${byCode[code].unit} ${t('step4.perFunctionalUnit')}`,
      { size: 12, weight: 600, colour: C.granate, gap: 3 },
    )
    w.bars(
      results.processes.map((p) => ({
        label: p.name, value: p.totals[code], share: p.shares[code], noData: !p.hasData,
      })),
      byCode[code].unit, lang,
    )
    const top5 = [...results.rows]
      .sort((a, b) => b.impacts[code] - a.impacts[code])
      .slice(0, 5)
    w.subheading(t('exportDoc.topRows'), 10)
    w.table(
      [t('common.process'), t('common.type'), t('common.impact'), t('common.share'), t('common.dataQuality')],
      top5.map((r) => [
        processNameById[r.process_id] || '',
        labelOf(r.vocabulary_id),
        formatNumber(r.impacts[code], lang),
        formatPercent(r.shares[code], lang),
        t(`quality.${r.data_quality}`),
      ]),
      [38, 62, 30, 20, 24],
      { align: ['left', 'left', 'right', 'right', 'left'] },
    )
  }

  // 5. Heat map --------------------------------------------------------------
  w.page()
  w.heading(t('exportDoc.heatMap'))
  w.body(t('step4.heatMapHelp'), { colour: C.warmGrey })
  for (const code of inds) {
    w.space(50)
    w.subheading(t(`indicators.${code}`), 11)
    w.chain(heatItems(results, code, t))
  }
  // Colour legend
  w.space(16)
  const legendW = 70
  const steps = 28
  for (let i = 0; i < steps; i += 1) {
    doc.setFillColor(mixHex(C.sageLight, C.granate, i / (steps - 1)))
    doc.rect(M.left + (i * legendW) / steps, w.y, legendW / steps + 0.2, 4, 'F')
  }
  doc.setDrawColor(C.line)
  doc.setLineWidth(0.2)
  doc.rect(M.left, w.y, legendW, 4, 'D')
  doc.setFont(SANS, 'normal', 400)
  doc.setFontSize(8)
  doc.setTextColor(C.warmGrey)
  doc.text(t('step4.heatLegendLow'), M.left, w.y + 8)
  doc.text(t('step4.heatLegendHigh'), M.left + legendW, w.y + 8, { align: 'right' })
  doc.setFillColor(C.noData)
  doc.rect(M.left + legendW + 16, w.y, 4, 4, 'FD')
  doc.text(t('common.noData'), M.left + legendW + 22, w.y + 3.4)
  w.y += 14

  // 6. Data quality analysis -------------------------------------------------
  w.page()
  w.heading(t('exportDoc.dataQuality'))
  w.body(t('quality.scale'), { colour: C.warmGrey })
  for (const code of inds) {
    w.space(28)
    w.subheading(t(`indicators.${code}`), 11)
    w.stacked(results.qualityShares[code], lang, t)
  }
  w.subheading(t('step4.processBadges'), 11)
  w.table(
    [t('common.process'), ...inds.map((c) => t(`indicatorsShort.${c}`))],
    results.processes.map((p) => [
      p.name,
      ...inds.map((c) => (p.badges[c]
        ? `${formatNumber(p.scores[c], lang)} ${t(`quality.${p.badges[c]}`)}`
        : t('common.noData'))),
    ]),
    [CONTENT_W - inds.length * Math.min(30, (CONTENT_W - 40) / inds.length),
      ...inds.map(() => Math.min(30, (CONTENT_W - 40) / inds.length))],
  )

  // 7. Limitations -----------------------------------------------------------
  w.page()
  w.heading(t('exportDoc.limitations'))
  const limitations = t('limitations')
  ;(Array.isArray(limitations) ? limitations : []).forEach((text, i) => {
    w.body(`${i + 1}.  ${text}`, { gap: 3 })
  })

  // 8. Disclaimer ------------------------------------------------------------
  w.heading(t('exportDoc.disclaimerHeading'))
  w.body(t('disclaimer'), { weight: 600, size: 10.5 })

  // Footer on every page -----------------------------------------------------
  const total = doc.getNumberOfPages()
  const studyName = [company?.name, product?.name].filter(Boolean).join(' / ')
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p)
    doc.setDrawColor(C.line)
    doc.setLineWidth(0.2)
    doc.line(M.left, PAGE.h - 14, PAGE.w - M.right, PAGE.h - 14)
    doc.setFont(SANS, 'normal', 400)
    doc.setFontSize(7.6)
    doc.setTextColor(C.warmGrey)
    doc.text(`${t('app.name')} — ${studyName}`, M.left, PAGE.h - 9.6)
    doc.text(t('app.demoLabel'), PAGE.w / 2, PAGE.h - 9.6, { align: 'center' })
    doc.text(`${t('common.page')} ${formatInteger(p, lang)} ${t('common.of')} ${formatInteger(total, lang)}`,
      PAGE.w - M.right, PAGE.h - 9.6, { align: 'right' })
  }

  return doc.output('blob')
}
