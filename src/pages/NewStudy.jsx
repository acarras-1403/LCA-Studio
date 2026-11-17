import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n.jsx'
import ScopeForm, { emptyScope, toPayload, validateScope } from '../components/ScopeForm.jsx'
import Button from '../components/ui/Button.jsx'
import { createStudy, loadHome, uploadProductImage } from '../lib/api.js'
import { FieldError } from '../components/ui/Field.jsx'

export default function NewStudy() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyScope)
  const [errors, setErrors] = useState({})
  const [pendingImage, setPendingImage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    loadHome()
      .then((tree) => setSuggestions(tree.filter((c) => !c.is_example).map((c) => c.name)))
      .catch(() => setSuggestions([]))
  }, [])

  async function submit(e) {
    e.preventDefault()
    const found = validateScope(form, t)
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    setError(null)
    try {
      const { study, product } = await createStudy({
        companyName: form.companyName,
        productName: form.productName,
        scope: toPayload(form),
      })
      if (pendingImage) {
        try { await uploadProductImage(product.id, pendingImage, product.image_path) } catch { /* photo is optional */ }
      }
      navigate(`/studies/${study.id}/chain`)
    } catch (e2) {
      setError(e2?.code === 'EXAMPLE_COMPANY' ? t('errors.companyTaken') : t('errors.saveFailed'))
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="mb-6 max-w-prose">
        <h1 className="text-[30px]">{t('home.newStudy')}</h1>
        <p className="mt-2">{t('step1.intro')}</p>
      </div>
      <ScopeForm
        form={form}
        setForm={setForm}
        errors={errors}
        companySuggestions={suggestions}
        pendingImage={pendingImage}
        onPickImage={setPendingImage}
        onRemoveImage={() => setPendingImage(null)}
      />
      <FieldError>{error}</FieldError>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? t('common.saving') : t('common.saveAndContinue')}
        </Button>
        <Button as={Link} to="/" variant="secondary" size="lg" className="no-underline">
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
