import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../lib/i18n.jsx'
import { formatDateTime, formatInteger } from '../lib/format.js'
import { loadHome, deleteStudy, duplicateStudy } from '../lib/api.js'
import { publicImageUrl } from '../lib/supabase.js'
import Button from '../components/ui/Button.jsx'
import Card, { CardBody, CardHeader } from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Dialog from '../components/ui/Dialog.jsx'
import StudyPreview from '../components/StudyPreview.jsx'
import { Input, Label, Select, FieldError } from '../components/ui/Field.jsx'

function ProductImage({ path, alt, className }) {
  const { t } = useI18n()
  const url = publicImageUrl(path)
  if (!url) {
    return (
      <div className={`flex items-center justify-center rounded-brand border border-line bg-surface-alt text-[13px] text-text-meta ${className}`}>
        {t('home.noImage')}
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={`rounded-brand border border-line bg-surface object-contain ${className}`}
    />
  )
}

export default function Home() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [tree, setTree] = useState(null)
  const [error, setError] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [toDuplicate, setToDuplicate] = useState(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      setTree(await loadHome())
    } catch {
      setError(t('errors.loadFailed'))
    }
  }, [t])

  useEffect(() => { refresh() }, [refresh])

  const companies = useMemo(() => (tree || []).filter((c) => c.products.length), [tree])
  const userCompanies = companies.filter((c) => !c.is_example)
  const existingCompanies = userCompanies.map((c) => ({ id: c.id, name: c.name }))

  async function onDelete() {
    setBusy(true)
    try {
      await deleteStudy(toDelete.study.id)
      setToDelete(null)
      await refresh()
    } catch {
      setError(t('errors.saveFailed'))
    } finally { setBusy(false) }
  }

  if (error) {
    return (
      <div>
        <p role="alert" className="mb-4 font-semibold text-action">{error}</p>
        <Button onClick={refresh}>{t('common.retry')}</Button>
      </div>
    )
  }
  if (!tree) return <p className="text-text-meta">{t('common.loading')}</p>

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-prose">
          <h1 className="text-[34px]">{t('home.title')}</h1>
          <p className="mt-2 text-text-main">{t('home.intro')}</p>
        </div>
        <Button as={Link} to="/studies/new" size="lg" className="no-underline">
          {t('home.newStudy')}
        </Button>
      </div>

      {!userCompanies.length ? (
        <Card tone="alt" className="mb-7">
          <CardBody>
            <h2 className="text-[20px]">{t('home.emptyTitle')}</h2>
            <p className="mt-1.5 max-w-prose text-text-main">{t('home.emptyBody')}</p>
          </CardBody>
        </Card>
      ) : null}

      <div className="space-y-7">
        {companies.map((company) => (
          <section key={company.id}>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="text-[24px]">{company.name}</h2>
              {company.is_example ? <Badge tone="fair">{t('home.exampleBadge')}</Badge> : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {company.products.map((product) => (
                <Card key={product.id}>
                  <CardHeader className="flex items-center gap-3">
                    <ProductImage
                      path={product.image_path}
                      alt={product.name}
                      className="h-14 w-14 shrink-0"
                    />
                    <h3 className="text-[19px]">{product.name}</h3>
                  </CardHeader>
                  <CardBody>
                    {!product.studies.length ? (
                      <p className="text-text-meta">{t('home.noStudies')}</p>
                    ) : (
                      <ul className="m-0 list-none space-y-3 p-0">
                        {product.studies.map((study) => (
                          <li key={study.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                            <p className="m-0 text-[14px] text-text-meta">
                              {study.reference_year} — {formatInteger(study.fu_amount, lang)} ×{' '}
                              {t(`fuUnits.${study.fu_unit}`)} — {formatDateTime(study.updated_at, lang)}
                            </p>
                            <div className="mt-3.5">
                              <StudyPreview study={study} />
                            </div>
                            <div className="mt-3.5 flex flex-wrap gap-2">
                              <Button
                                as={Link}
                                size="sm"
                                to={`/studies/${study.id}`}
                                className="no-underline"
                              >
                                {(study.rows || []).length ? t('step4.openResults') : t('common.open')}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setToDuplicate({ company, product, study })}
                              >
                                {t('common.duplicate')}
                              </Button>
                              {company.is_example || product.is_example || study.is_example ? null : (
                                <Button
                                  size="sm"
                                  variant="quiet"
                                  onClick={() => setToDelete({ company, product, study })}
                                >
                                  {t('common.delete')}
                                </Button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Dialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t('home.deleteTitle')}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" disabled={busy} onClick={onDelete}>
              {busy ? t('common.saving') : t('home.deleteConfirm')}
            </Button>
          </>
        )}
      >
        <p className="max-w-prose">{t('home.deleteBody')}</p>
        {toDelete ? (
          <p className="mt-3 font-semibold">
            {toDelete.company.name} — {toDelete.product.name} ({toDelete.study.reference_year})
          </p>
        ) : null}
      </Dialog>

      <DuplicateDialog
        source={toDuplicate}
        existingCompanies={existingCompanies}
        onClose={() => setToDuplicate(null)}
        onDone={(id) => { setToDuplicate(null); navigate(`/studies/${id}`) }}
      />
    </div>
  )
}

function DuplicateDialog({ source, existingCompanies, onClose, onDone }) {
  const { t } = useI18n()
  const [mode, setMode] = useState('new')
  const [companyName, setCompanyName] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [productName, setProductName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!source) return
    setMode('new')
    setCompanyName(`${source.company.name} ${t('home.copySuffix')}`)
    setCompanyId(existingCompanies[0]?.id || '')
    setProductName(source.product.name)
    setError(null)
  }, [source])

  if (!source) return null

  async function submit() {
    setError(null)
    if (mode === 'new' && !companyName.trim()) { setError(t('step2.nameRequired')); return }
    if (!productName.trim()) { setError(t('step2.nameRequired')); return }
    setBusy(true)
    try {
      const study = await duplicateStudy(source.study.id, {
        companyName: companyName.trim(),
        productName: productName.trim(),
        companyId: mode === 'existing' ? companyId : null,
      })
      onDone(study.id)
    } catch (e) {
      setError(e?.code === 'EXAMPLE_COMPANY' ? t('errors.companyTaken') : t('errors.saveFailed'))
    } finally { setBusy(false) }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('home.duplicateTitle')}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button disabled={busy} onClick={submit}>
            {busy ? t('common.saving') : t('home.duplicateConfirm')}
          </Button>
        </>
      )}
    >
      <p className="mb-4 max-w-prose">{t('home.duplicateBody')}</p>
      {existingCompanies.length ? (
        <div className="mb-4 flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="dup-mode"
              checked={mode === 'new'}
              onChange={() => setMode('new')}
              className="accent-[var(--action)]"
            />
            <span>{t('home.duplicateNew')}</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="dup-mode"
              checked={mode === 'existing'}
              onChange={() => setMode('existing')}
              className="accent-[var(--action)]"
            />
            <span>{t('home.duplicateExisting')}</span>
          </label>
        </div>
      ) : null}

      {mode === 'new' ? (
        <div className="mb-4">
          <Label htmlFor="dup-company" required>{t('home.duplicateCompany')}</Label>
          <Input
            id="dup-company"
            className="mt-1.5"
            value={companyName}
            maxLength={120}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
      ) : (
        <div className="mb-4">
          <Label htmlFor="dup-company-existing" required>{t('home.duplicateExisting')}</Label>
          <Select
            id="dup-company-existing"
            className="mt-1.5"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            {existingCompanies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="dup-product" required>{t('home.duplicateProduct')}</Label>
        <Input
          id="dup-product"
          className="mt-1.5"
          value={productName}
          maxLength={120}
          onChange={(e) => setProductName(e.target.value)}
        />
      </div>
      <FieldError>{error}</FieldError>
    </Dialog>
  )
}
