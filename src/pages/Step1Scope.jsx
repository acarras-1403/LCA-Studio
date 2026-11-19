import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../lib/i18n.jsx'
import { useStudy } from './StudyLayout.jsx'
import ScopeForm, {
  SCOPE_SECTIONS, scopeFromStudy, toPayload, validateScope,
  ProductSection, FunctionalUnitSection, GoalSection, ScopeSection,
  IndicatorsSection, LockedSection,
} from '../components/ScopeForm.jsx'
import Button from '../components/ui/Button.jsx'
import Card, { CardBody } from '../components/ui/Card.jsx'
import { FieldError } from '../components/ui/Field.jsx'
import { formatInteger } from '../lib/format.js'
import { cn } from '../lib/cn.js'
import {
  updateScope, renameCompany, renameProduct, advanceStatus, loadHome,
  uploadProductImage, clearProductImage,
} from '../lib/api.js'

const BODIES = {
  product: ProductSection,
  functional_unit: FunctionalUnitSection,
  goal: GoalSection,
  scope: ScopeSection,
  indicators: IndicatorsSection,
}

function TickIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12.5l5.5 5.5L20 7" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

function Chevron({ open }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={cn('shrink-0 transition-transform', open && 'rotate-90')}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

/**
 * Step 1 as a checklist: each group of fields is a row that shows whether it is
 * done and what it currently says, and opens to be filled in. Completeness
 * comes from SCOPE_SECTIONS, so the badge and the fields can never disagree.
 */
export default function Step1Scope() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const { study, product, company, readOnly, reload } = useStudy()

  const [form, setForm] = useState(() => scopeFromStudy(study, product, company))
  const [errors, setErrors] = useState({})
  const [open, setOpen] = useState(() => new Set())
  const [pendingImage, setPendingImage] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const rowRefs = useRef({})

  useEffect(() => { setForm(scopeFromStudy(study, product, company)) }, [study, product, company])

  useEffect(() => {
    if (readOnly) return
    loadHome()
      .then((tree) => setSuggestions(
        tree.filter((c) => !c.is_example && c.id !== company?.id).map((c) => c.name),
      ))
      .catch(() => setSuggestions([]))
  }, [readOnly, company?.id])

  const status = useMemo(
    () => SCOPE_SECTIONS.map((s) => ({ ...s, done: s.complete(form) })),
    [form],
  )
  const done = status.filter((s) => s.done).length
  const gaps = status.filter((s) => !s.done)

  function toggle(id) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openNextGap() {
    const first = gaps[0]
    if (!first) return
    setOpen((prev) => new Set(prev).add(first.id))
    requestAnimationFrame(() => {
      rowRefs.current[first.id]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }

  async function save({ thenContinue }) {
    const found = validateScope(form, t)
    setErrors(found)
    if (Object.keys(found).length) {
      const firstBad = status.find((s) => !s.done)
      if (firstBad) setOpen((prev) => new Set(prev).add(firstBad.id))
      return
    }
    setBusy(true); setError(null); setSaved(false)
    try {
      if (form.companyName.trim() !== company.name) await renameCompany(company.id, form.companyName)
      if (form.productName.trim() !== product.name) await renameProduct(product.id, form.productName)
      await updateScope(study.id, toPayload(form))
      if (removeImage && product.image_path) await clearProductImage(product.id, product.image_path)
      if (pendingImage) await uploadProductImage(product.id, pendingImage, product.image_path)
      setPendingImage(null)
      setRemoveImage(false)
      await reload()
      setSaved(true)
      if (thenContinue) {
        await advanceStatus(study, 'chain')
        navigate(`/studies/${study.id}/chain`)
      }
    } catch (e) {
      const code = e?.code
      if (code === '23505' && String(e.message || '').includes('lca_companies')) {
        setError(t('errors.companyTaken'))
      } else if (code === '23505') {
        setError(t('errors.productTaken'))
      } else if (code === 'EXAMPLE_COMPANY') {
        setError(t('errors.companyTaken'))
      } else {
        setError(t('errors.saveFailed'))
      }
    } finally { setBusy(false) }
  }

  const sectionProps = {
    form,
    setForm,
    errors,
    readOnly,
    product: removeImage ? { ...product, image_path: null } : product,
    companySuggestions: suggestions,
    pendingImage,
    onPickImage: (f) => { setPendingImage(f); setRemoveImage(false) },
    onRemoveImage: () => { setPendingImage(null); setRemoveImage(true) },
  }

  // The example study is read-only, so the checklist would be noise.
  if (readOnly) {
    return (
      <div>
        <div className="mb-5 max-w-prose">
          <h2 className="text-[22px] sm:text-[24px]">{t('step1.title')}</h2>
          <p className="mt-2">{t('step1.intro')}</p>
        </div>
        <Card tone="alt" className="mb-5">
          <CardBody><p className="m-0 max-w-prose">{t('step1.exampleNotice')}</p></CardBody>
        </Card>
        <ScopeForm {...sectionProps} />
        <div className="mt-6">
          <Button type="button" size="lg" onClick={() => navigate(`/studies/${study.id}/chain`)}>
            {t('common.continue')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save({ thenContinue: true }) }} noValidate>
      <div className="mb-5 max-w-prose">
        <h2 className="text-[22px] sm:text-[24px]">{t('step1.title')}</h2>
        <p className="mt-2">{t('step1.checklistIntro')}</p>
      </div>

      {/* progress */}
      <Card className="mb-5">
        <CardBody className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1 basis-[280px]">
            <div className="mb-1.5 flex flex-wrap justify-between gap-x-4 text-[15px]">
              <span className="font-semibold">
                {t('step1.complete', {
                  done: formatInteger(done, lang),
                  total: formatInteger(status.length, lang),
                })}
              </span>
              <span className="font-semibold text-action">
                {gaps.length === 0
                  ? t('step1.allComplete')
                  : gaps.length === 1
                    ? t('step1.needsAttentionOne')
                    : t('step1.needsAttention', { count: formatInteger(gaps.length, lang) })}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-brand bg-surface-alt">
              <div className="h-full rounded-brand bg-action transition-all"
                style={{ width: `${(done / status.length) * 100}%` }} />
            </div>
          </div>
          {gaps.length ? (
            <Button type="button" variant="secondary" onClick={openNextGap}>
              {t('step1.jumpToGap')}
            </Button>
          ) : null}
        </CardBody>
      </Card>

      {/* the checklist */}
      <div className="flex flex-col gap-2.5">
        {status.map((section) => {
          const isOpen = open.has(section.id)
          const Body = BODIES[section.id]
          const summary = section.summary(form, t, lang)
          const missingLabel = section.id === 'indicators'
            ? t('step1.chooseOneIndicator') : t('step1.missingInformation')
          return (
            <div
              key={section.id}
              ref={(el) => { rowRefs.current[section.id] = el }}
              className={cn(
                'rounded-brand border bg-surface',
                section.done ? 'border-line' : 'border-action',
              )}
            >
              <h3 className="m-0">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`section-${section.id}`}
                  onClick={() => toggle(section.id)}
                  className="flex w-full min-h-[44px] items-center gap-3 px-4 py-3 text-left font-sans text-[16px] font-normal text-text-main sm:px-5"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                      section.done
                        ? 'bg-sage-dark text-white'
                        : 'border-2 border-action font-semibold text-action',
                    )}
                  >
                    {section.done ? <TickIcon /> : '!'}
                  </span>
                  <span className="shrink-0 font-semibold">{t(section.titleKey)}</span>
                  {section.done ? (
                    <span className="min-w-0 flex-1 truncate text-[15px] text-text-meta">{summary}</span>
                  ) : (
                    <span className="shrink-0 rounded-brand bg-action px-2 py-0.5 text-[14px] font-semibold text-action-fg">
                      {missingLabel}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-action"><Chevron open={isOpen} /></span>
                </button>
              </h3>
              {isOpen ? (
                <div id={`section-${section.id}`} className="border-t border-line px-4 pb-5 pt-4 sm:px-5 sm:pl-[60px]">
                  <Body {...sectionProps} />
                  <Button type="button" size="sm" variant="secondary" onClick={() => toggle(section.id)}>
                    {t('step1.saveAndClose')}
                  </Button>
                </div>
              ) : null}
            </div>
          )
        })}

        {/* locked, informational */}
        <div className="rounded-brand border border-line bg-surface-alt">
          <h3 className="m-0">
            <button
              type="button"
              aria-expanded={open.has('locked')}
              aria-controls="section-locked"
              onClick={() => toggle('locked')}
              className="flex w-full min-h-[44px] items-center gap-3 px-4 py-3 text-left font-sans text-[16px] font-normal text-text-main sm:px-5"
            >
              <span aria-hidden="true" className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-text-meta text-text-meta">
                <LockIcon />
              </span>
              <span className="shrink-0 font-semibold">{t('step1.sectionLocked')}</span>
              <span className="min-w-0 flex-1 truncate text-[15px] text-text-meta">
                {t('step1.sectionLockedSummary')}
              </span>
              <span className="ml-auto shrink-0 text-action"><Chevron open={open.has('locked')} /></span>
            </button>
          </h3>
          {open.has('locked') ? (
            <div id="section-locked" className="border-t border-line px-4 pb-5 pt-4 sm:px-5 sm:pl-[60px]">
              <LockedSection />
            </div>
          ) : null}
        </div>
      </div>

      <FieldError>{error}</FieldError>
      {saved ? <p className="mt-2 font-semibold text-text-muted">{t('common.save')} ✓</p> : null}

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <Button type="submit" size="lg" disabled={busy} className="justify-center">
          {busy ? t('common.saving') : t('common.saveAndContinue')}
        </Button>
        <Button type="button" variant="secondary" size="lg" disabled={busy}
          className="justify-center" onClick={() => save({ thenContinue: false })}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  )
}
