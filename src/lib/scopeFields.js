import { countryName } from '../data/countries.js'
import { formatInteger } from './format.js'
import { orderIndicators } from './indicators.js'

/**
 * The goal and scope block as label/value pairs, in the order of Step 1.
 * Shared by the study header, the PDF's goal and scope table and the Excel
 * Summary sheet, so all three always agree.
 */
export function goalAndScopeRows({ study, product, company, t, lang }) {
  const indicators = orderIndicators(study.selected_indicators)
    .map((c) => t(`indicators.${c}`)).join(', ')
  const rows = [
    [t('step1.companyName'), company?.name || ''],
    [t('step1.productName'), product?.name || ''],
    [t('step1.functionalUnit'),
      `${formatInteger(study.fu_amount, lang)} × ${t(`fuUnits.${study.fu_unit}`)}`],
  ]
  if (study.units_per_package != null) {
    rows.push([t('step1.unitsPerPackage'), formatInteger(study.units_per_package, lang)])
  }
  rows.push(
    [t('step1.annualProduction'),
      study.annual_production
        ? `${formatInteger(study.annual_production, lang)} ${t(`fuUnitsAnnual.${study.fu_unit}`)}`
        : t('common.none')],
    [t('step1.intendedApplication'), t(`intendedApplication.${study.intended_application}`)],
    [t('step1.intendedAudience'), t(`intendedAudience.${study.intended_audience}`)],
    [t('step1.comparativeAssertion'), study.comparative_assertion ? t('common.yes') : t('common.no')],
    [t('step1.systemBoundary'), t('fixed.cradleToGate')],
    [t('step1.cutoff'), t(`cutoff.${study.cutoff}`)],
    [t('step1.allocation'), t(`allocation.${study.allocation}`)],
    [t('step1.dataQualityApproach'), t(`dataQualityApproach.${study.data_quality_approach}`)],
    [t('step1.geography'), countryName(study.geography, lang)],
    [t('step1.referenceYear'), String(study.reference_year)],
    [t('step1.lciaMethod'), t('app.demoLabel')],
    [t('step1.indicators'), indicators],
  )
  return rows.map(([label, value]) => ({ label, value }))
}

export function functionalUnitText({ study, t, lang }) {
  return `${formatInteger(study.fu_amount, lang)} × ${t(`fuUnits.${study.fu_unit}`)}`
}
