// Display rules, spec Section 9 item 9: three significant figures in the
// interface and the PDF; full precision in the Excel export and in every
// intermediate calculation. Scientific notation below 0.001. Number format
// follows the active language (Spanish uses a comma decimal separator).

const LOCALES = { en: 'en-GB', es: 'es-ES' }

export function localeFor(lang) {
  return LOCALES[lang] || LOCALES.en
}

/** Round to n significant figures, returning a number. */
export function toSigFigs(value, figs = 3) {
  const v = Number(value)
  if (!Number.isFinite(v) || v === 0) return 0
  const mag = Math.floor(Math.log10(Math.abs(v)))
  const factor = 10 ** (figs - 1 - mag)
  return Math.round(v * factor) / factor
}

/**
 * Three significant figures, language-aware. Values below 0.001 (and above 0)
 * use scientific notation.
 */
export function formatNumber(value, lang = 'en', figs = 3) {
  const v = Number(value)
  if (!Number.isFinite(v)) return '—'
  if (v === 0) return new Intl.NumberFormat(localeFor(lang)).format(0)
  const abs = Math.abs(v)
  if (abs < 0.001) return formatScientific(v, lang, figs)
  const rounded = toSigFigs(v, figs)
  const mag = Math.floor(Math.log10(Math.abs(rounded)))
  const decimals = Math.max(0, Math.min(20, figs - 1 - mag))
  return new Intl.NumberFormat(localeFor(lang), {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(rounded)
}

const SUPERSCRIPTS = {
  '-': '\u207b', 0: '\u2070', 1: '\u00b9', 2: '\u00b2', 3: '\u00b3', 4: '\u2074',
  5: '\u2075', 6: '\u2076', 7: '\u2077', 8: '\u2078', 9: '\u2079',
}

function superscript(exponent) {
  return String(exponent).split('').map((ch) => SUPERSCRIPTS[ch] ?? ch).join('')
}

export function formatScientific(value, lang = 'en', figs = 3) {
  const v = Number(value)
  if (!Number.isFinite(v) || v === 0) return '0'
  const exp = Math.floor(Math.log10(Math.abs(v)))
  const mantissa = v / 10 ** exp
  const m = new Intl.NumberFormat(localeFor(lang), {
    minimumFractionDigits: 0,
    maximumFractionDigits: figs - 1,
  }).format(Number(mantissa.toFixed(figs - 1)))
  return `${m}\u00a0\u00d7\u00a010${superscript(exp)}`
}

/** Percentage share. null (total not > 0) renders as an em dash. */
export function formatPercent(value, lang = 'en') {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return `${formatNumber(value, lang, 3)}%`
}

/** Integers such as years and counts: no significant-figure rounding. */
export function formatInteger(value, lang = 'en') {
  const v = Number(value)
  if (!Number.isFinite(v)) return '—'
  return new Intl.NumberFormat(localeFor(lang), { maximumFractionDigits: 0 }).format(v)
}

/** A full-precision plain string, for the Excel export's text cells. */
export function fullPrecision(value) {
  const v = Number(value)
  if (!Number.isFinite(v)) return ''
  return String(v)
}

export function formatDate(date, lang = 'en') {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(localeFor(lang), {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(d)
}

export function formatDateTime(date, lang = 'en') {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(localeFor(lang), {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(d)
}
