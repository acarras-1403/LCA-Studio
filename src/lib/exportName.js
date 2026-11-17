import { makeT } from './i18n.jsx'
import { slugify } from './slug.js'

/** Download name for the PDF report and the Excel workbook. */
export function exportFileName({ company, product, study, lang, extension }) {
  const t = makeT(lang)
  const base = [slugify(company?.name), slugify(product?.name), study.reference_year]
    .filter(Boolean).join('-')
  return `${base || slugify(t('app.name'))}-lca.${extension}`
}
