import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../lib/i18n.jsx'
import { useStudy } from './StudyLayout.jsx'
import ScopeForm, { scopeFromStudy, toPayload, validateScope } from '../components/ScopeForm.jsx'
import Button from '../components/ui/Button.jsx'
import Card, { CardBody } from '../components/ui/Card.jsx'
import { FieldError } from '../components/ui/Field.jsx'
import {
  updateScope, renameCompany, renameProduct, advanceStatus, loadHome,
  uploadProductImage, clearProductImage,
} from '../lib/api.js'

export default function Step1Scope() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { study, product, company, readOnly, reload } = useStudy()
  const [form, setForm] = useState(() => scopeFromStudy(study, product, company))
  const [errors, setErrors] = useState({})
  const [pendingImage, setPendingImage] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => { setForm(scopeFromStudy(study, product, company)) }, [study, product, company])

  useEffect(() => {
    if (readOnly) return
    loadHome()
      .then((tree) => setSuggestions(
        tree.filter((c) => !c.is_example && c.id !== company?.id).map((c) => c.name),
      ))
      .catch(() => setSuggestions([]))
  }, [readOnly, company?.id])

  async function save({ thenContinue }) {
    const found = validateScope(form, t)
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    setError(null)
    setSaved(false)
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

  return (
    <form onSubmit={(e) => { e.preventDefault(); save({ thenContinue: true }) }} noValidate>
      <div className="mb-5 max-w-prose">
        <h2 className="text-[24px]">{t('step1.title')}</h2>
        <p className="mt-2">{t('step1.intro')}</p>
      </div>

      {readOnly ? (
        <Card tone="alt" className="mb-5">
          <CardBody><p className="m-0 max-w-prose">{t('step1.exampleNotice')}</p></CardBody>
        </Card>
      ) : null}

      <ScopeForm
        form={form}
        setForm={setForm}
        errors={errors}
        readOnly={readOnly}
        product={removeImage ? { ...product, image_path: null } : product}
        companySuggestions={suggestions}
        pendingImage={pendingImage}
        onPickImage={(f) => { setPendingImage(f); setRemoveImage(false) }}
        onRemoveImage={() => { setPendingImage(null); setRemoveImage(true) }}
      />

      <FieldError>{error}</FieldError>
      {saved ? <p className="mt-2 font-semibold text-text-muted">{t('common.save')} ✓</p> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {readOnly ? (
          <Button type="button" size="lg" onClick={() => navigate(`/studies/${study.id}/chain`)}>
            {t('common.continue')}
          </Button>
        ) : (
          <>
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? t('common.saving') : t('common.saveAndContinue')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={busy}
              onClick={() => save({ thenContinue: false })}
            >
              {t('common.save')}
            </Button>
          </>
        )}
      </div>
    </form>
  )
}
