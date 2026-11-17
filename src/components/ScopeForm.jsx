import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../lib/i18n.jsx'
import { INDICATOR_CODES } from '../lib/indicators.js'
import { countryOptions, REFERENCE_YEARS } from '../data/countries.js'
import { IMAGE_TYPES, IMAGE_MAX_BYTES } from '../lib/api.js'
import { publicImageUrl } from '../lib/supabase.js'
import Button from './ui/Button.jsx'
import Card, { CardBody, CardHeader } from './ui/Card.jsx'
import { Field, Input, Select, Label, Help, FieldError, LockedValue } from './ui/Field.jsx'

export const FU_UNITS = ['unit_of_product', 'box', 'pallet', 'kg', 't', 'm2', 'l']
const APPLICATIONS = ['hotspot_identification', 'product_improvement', 'b2b_communication', 'ecodesign']
const AUDIENCES = ['internal', 'b2b_customers']
const CUTOFFS = ['mass_1pc', 'mass_5pc', 'none']
const ALLOCATIONS = ['mass', 'economic', 'not_applicable']
const DQ_APPROACHES = ['primary_own_database_background', 'mainly_estimated_screening']

export function emptyScope() {
  return {
    companyName: '',
    productName: '',
    fu_amount: '1',
    fu_unit: 'unit_of_product',
    units_per_package: '',
    annual_production: '',
    intended_application: 'hotspot_identification',
    intended_audience: 'internal',
    cutoff: 'mass_1pc',
    allocation: 'mass',
    data_quality_approach: 'primary_own_database_background',
    geography: 'ES',
    reference_year: '2025',
    selected_indicators: [...INDICATOR_CODES],
  }
}

export function scopeFromStudy(study, product, company) {
  return {
    companyName: company?.name || '',
    productName: product?.name || '',
    fu_amount: String(study.fu_amount ?? ''),
    fu_unit: study.fu_unit,
    units_per_package: study.units_per_package == null ? '' : String(study.units_per_package),
    annual_production: study.annual_production == null ? '' : String(study.annual_production),
    intended_application: study.intended_application,
    intended_audience: study.intended_audience,
    cutoff: study.cutoff,
    allocation: study.allocation,
    data_quality_approach: study.data_quality_approach,
    geography: study.geography,
    reference_year: String(study.reference_year),
    selected_indicators: [...(study.selected_indicators || [])],
  }
}

/** Turns the form's strings into the payload the database expects. */
export function toPayload(form) {
  const showsPackage = ['box', 'pallet'].includes(form.fu_unit)
  return {
    fu_amount: Number(form.fu_amount),
    fu_unit: form.fu_unit,
    units_per_package: showsPackage && form.units_per_package !== ''
      ? Math.round(Number(form.units_per_package)) : null,
    annual_production: form.annual_production === '' ? null : Number(form.annual_production),
    intended_application: form.intended_application,
    intended_audience: form.intended_audience,
    cutoff: form.cutoff,
    allocation: form.allocation,
    data_quality_approach: form.data_quality_approach,
    geography: form.geography,
    reference_year: Number(form.reference_year),
    selected_indicators: INDICATOR_CODES.filter((c) => form.selected_indicators.includes(c)),
  }
}

export function validateScope(form, t) {
  const errors = {}
  if (!form.companyName.trim()) errors.companyName = t('common.required')
  if (!form.productName.trim()) errors.productName = t('common.required')
  if (!(Number(form.fu_amount) > 0)) errors.fu_amount = t('common.required')
  if (form.annual_production !== '' && !(Number(form.annual_production) > 0)) {
    errors.annual_production = t('common.required')
  }
  if (form.units_per_package !== '' && !(Number(form.units_per_package) > 0)) {
    errors.units_per_package = t('common.required')
  }
  if (!form.selected_indicators.length) errors.selected_indicators = t('step1.indicatorsRequired')
  return errors
}

function ImageField({ product, readOnly, pendingFile, onPickFile, onRemove }) {
  const { t } = useI18n()
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (!pendingFile) { setPreview(null); return undefined }
    const url = URL.createObjectURL(pendingFile)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [pendingFile])

  const existing = publicImageUrl(product?.image_path)
  const shown = preview || existing

  function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    if (!IMAGE_TYPES.includes(file.type)) { setError(t('errors.imageWrongType')); return }
    if (file.size > IMAGE_MAX_BYTES) { setError(t('errors.imageTooLarge')); return }
    onPickFile(file)
  }

  return (
    <div className="mb-5">
      <Label>{t('step1.productPhoto')}</Label>
      <div className="mt-1.5 flex flex-wrap items-start gap-4">
        {shown ? (
          <img
            src={shown}
            alt={product?.name || t('step1.productPhoto')}
            className="h-28 w-28 rounded-brand border border-line bg-surface object-contain"
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-brand border border-line bg-surface-alt text-[13px] text-text-meta">
            {t('home.noImage')}
          </div>
        )}
        {!readOnly ? (
          <div className="flex flex-col gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-brand border border-action px-4 py-2 font-semibold text-action hover:bg-action hover:text-action-fg">
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pick} />
              {shown ? t('step1.replacePhoto') : t('step1.uploadPhoto')}
            </label>
            {shown ? (
              <Button type="button" variant="quiet" size="sm" onClick={onRemove}>
                {t('step1.removePhoto')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <Help>{t('step1.productPhotoHelp')}</Help>
      <Help>{t('step1.productPhotoHint')}</Help>
      <FieldError>{error}</FieldError>
    </div>
  )
}

/**
 * Step 1's form. Used both for a new study and for editing an existing one.
 * Every field is disabled when `readOnly` (the example study).
 */
export default function ScopeForm({
  form, setForm, errors, readOnly, product, companySuggestions = [],
  pendingImage, onPickImage, onRemoveImage, showImage = true,
}) {
  const { t, lang } = useI18n()
  const countries = useMemo(() => countryOptions(lang), [lang])
  const showsPackage = ['box', 'pallet'].includes(form.fu_unit)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  function toggleIndicator(code) {
    const next = form.selected_indicators.includes(code)
      ? form.selected_indicators.filter((c) => c !== code)
      : [...form.selected_indicators, code]
    setForm({ ...form, selected_indicators: next })
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader><h2 className="text-[20px]">{t('step1.sectionIdentity')}</h2></CardHeader>
        <CardBody>
          <Field id="companyName" label={t('step1.companyName')} help={t('step1.companyNameHelp')}
            required error={errors.companyName}>
            {({ id, describedBy }) => (
              <>
                <Input
                  id={id}
                  list="company-suggestions"
                  value={form.companyName}
                  maxLength={120}
                  disabled={readOnly}
                  aria-describedby={describedBy}
                  invalid={!!errors.companyName}
                  onChange={set('companyName')}
                />
                <datalist id="company-suggestions">
                  {companySuggestions.map((name) => <option key={name} value={name} />)}
                </datalist>
              </>
            )}
          </Field>

          <Field id="productName" label={t('step1.productName')} help={t('step1.productNameHelp')}
            required error={errors.productName}>
            {({ id, describedBy }) => (
              <Input id={id} value={form.productName} maxLength={120} disabled={readOnly}
                aria-describedby={describedBy} invalid={!!errors.productName}
                onChange={set('productName')} />
            )}
          </Field>

          {showImage ? (
            <ImageField
              product={product}
              readOnly={readOnly}
              pendingFile={pendingImage}
              onPickFile={onPickImage}
              onRemove={onRemoveImage}
            />
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="text-[20px]">{t('step1.functionalUnit')}</h2></CardHeader>
        <CardBody>
          <div className="mb-5">
            <Label htmlFor="fu_amount" required>{t('step1.functionalUnit')}</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="fu_amount"
                type="number"
                min="0"
                step="any"
                className="max-w-[9rem]"
                value={form.fu_amount}
                disabled={readOnly}
                invalid={!!errors.fu_amount}
                aria-label={t('step1.fuAmount')}
                onChange={set('fu_amount')}
              />
              <Select
                value={form.fu_unit}
                disabled={readOnly}
                aria-label={t('step1.fuUnit')}
                onChange={(e) => setForm({
                  ...form,
                  fu_unit: e.target.value,
                  units_per_package: ['box', 'pallet'].includes(e.target.value)
                    ? form.units_per_package : '',
                })}
              >
                {FU_UNITS.map((u) => (
                  <option key={u} value={u}>{t(`fuUnits.${u}`)}</option>
                ))}
              </Select>
            </div>
            <Help>{t('step1.functionalUnitHelp')}</Help>
            <FieldError>{errors.fu_amount}</FieldError>
          </div>

          {showsPackage ? (
            <Field id="units_per_package" label={t('step1.unitsPerPackage')}
              help={t('step1.unitsPerPackageHelp')} error={errors.units_per_package}>
              {({ id, describedBy }) => (
                <Input id={id} type="number" min="1" step="1" className="max-w-[12rem]"
                  value={form.units_per_package} disabled={readOnly}
                  aria-describedby={describedBy} invalid={!!errors.units_per_package}
                  onChange={set('units_per_package')} />
              )}
            </Field>
          ) : null}

          <div className="mb-5">
            <Label htmlFor="annual_production" required>{t('step1.annualProduction')}</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <Input
                id="annual_production"
                type="number"
                min="0"
                step="any"
                className="max-w-[14rem]"
                value={form.annual_production}
                disabled={readOnly}
                invalid={!!errors.annual_production}
                onChange={set('annual_production')}
              />
              <span className="text-text-meta">{t(`fuUnitsAnnual.${form.fu_unit}`)}</span>
            </div>
            <Help>{t('step1.annualProductionHelp')}</Help>
            <FieldError>{errors.annual_production}</FieldError>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="text-[20px]">{t('step1.sectionGoal')}</h2></CardHeader>
        <CardBody>
          <Field id="intended_application" label={t('step1.intendedApplication')}
            help={t('step1.intendedApplicationHelp')} required>
            {({ id, describedBy }) => (
              <Select id={id} value={form.intended_application} disabled={readOnly}
                aria-describedby={describedBy} onChange={set('intended_application')}>
                {APPLICATIONS.map((v) => (
                  <option key={v} value={v}>{t(`intendedApplication.${v}`)}</option>
                ))}
              </Select>
            )}
          </Field>

          <Field id="intended_audience" label={t('step1.intendedAudience')}
            help={t('step1.intendedAudienceHelp')} required>
            {({ id, describedBy }) => (
              <Select id={id} value={form.intended_audience} disabled={readOnly}
                aria-describedby={describedBy} onChange={set('intended_audience')}>
                {AUDIENCES.map((v) => (
                  <option key={v} value={v}>{t(`intendedAudience.${v}`)}</option>
                ))}
              </Select>
            )}
          </Field>

          <LockedValue
            label={t('step1.comparativeAssertion')}
            value={`${t('common.no')} — ${t('step1.locked')}`}
            help={t('step1.comparativeAssertionHelp')}
          />
          <LockedValue
            label={t('step1.systemBoundary')}
            value={`${t('fixed.cradleToGate')} — ${t('step1.locked')}`}
            help={t('step1.systemBoundaryHelp')}
          />
          <LockedValue
            label={t('step1.lciaMethod')}
            value={t('app.demoLabel')}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="text-[20px]">{t('step1.sectionScope')}</h2></CardHeader>
        <CardBody>
          <Field id="cutoff" label={t('step1.cutoff')} help={t('step1.cutoffHelp')} required>
            {({ id, describedBy }) => (
              <Select id={id} value={form.cutoff} disabled={readOnly}
                aria-describedby={describedBy} onChange={set('cutoff')}>
                {CUTOFFS.map((v) => <option key={v} value={v}>{t(`cutoff.${v}`)}</option>)}
              </Select>
            )}
          </Field>

          <Field id="allocation" label={t('step1.allocation')} help={t('step1.allocationHelp')} required>
            {({ id, describedBy }) => (
              <Select id={id} value={form.allocation} disabled={readOnly}
                aria-describedby={describedBy} onChange={set('allocation')}>
                {ALLOCATIONS.map((v) => <option key={v} value={v}>{t(`allocation.${v}`)}</option>)}
              </Select>
            )}
          </Field>

          <Field id="data_quality_approach" label={t('step1.dataQualityApproach')}
            help={t('step1.dataQualityApproachHelp')} required>
            {({ id, describedBy }) => (
              <Select id={id} value={form.data_quality_approach} disabled={readOnly}
                aria-describedby={describedBy} onChange={set('data_quality_approach')}>
                {DQ_APPROACHES.map((v) => (
                  <option key={v} value={v}>{t(`dataQualityApproach.${v}`)}</option>
                ))}
              </Select>
            )}
          </Field>

          <Field id="geography" label={t('step1.geography')} help={t('step1.geographyHelp')} required>
            {({ id, describedBy }) => (
              <Select id={id} value={form.geography} disabled={readOnly}
                aria-describedby={describedBy} onChange={set('geography')}>
                {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </Select>
            )}
          </Field>

          <Field id="reference_year" label={t('step1.referenceYear')}
            help={t('step1.referenceYearHelp')} required>
            {({ id, describedBy }) => (
              <Select id={id} value={form.reference_year} disabled={readOnly}
                aria-describedby={describedBy} onChange={set('reference_year')}>
                {REFERENCE_YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
              </Select>
            )}
          </Field>
        </CardBody>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><h2 className="text-[20px]">{t('step1.indicators')}</h2></CardHeader>
        <CardBody>
          <Help>{t('step1.indicatorsHelp')}</Help>
          <fieldset className="mt-3 border-0 p-0" disabled={readOnly}>
            <legend className="sr-only">{t('step1.indicators')}</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {INDICATOR_CODES.map((code) => (
                <label key={code} className="flex items-start gap-2.5 rounded-brand border border-line bg-surface px-3 py-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[var(--action)]"
                    checked={form.selected_indicators.includes(code)}
                    disabled={readOnly}
                    onChange={() => toggleIndicator(code)}
                  />
                  <span>{t(`indicators.${code}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <FieldError>{errors.selected_indicators}</FieldError>
        </CardBody>
      </Card>
    </div>
  )
}
