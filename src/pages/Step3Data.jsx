import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../lib/i18n.jsx'
import { useStudy } from './StudyLayout.jsx'
import Button from '../components/ui/Button.jsx'
import Card, { CardBody, CardHeader } from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import { FieldError } from '../components/ui/Field.jsx'
import { replaceInventory } from '../lib/api.js'
import { downloadBlob } from '../lib/slug.js'
import { formatDateTime, formatInteger } from '../lib/format.js'

export default function Step3Data() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const {
    study, product, company, processes, rows, readOnly, vocabulary, reload,
  } = useStudy()

  const [building, setBuilding] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [problems, setProblems] = useState(null)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const productionSet = Number(study.annual_production) > 0
  const canUse = !readOnly && productionSet && processes.length > 0
  const lastUpload = rows.length
    ? rows.reduce((m, r) => (String(r.created_at) > m ? String(r.created_at) : m), '')
    : null

  async function download() {
    setBuilding(true)
    setError(null)
    try {
      const { buildTemplate, templateFileName } = await import('../excel/template.js')
      const blob = await buildTemplate({
        lang, study, product, company, processes, vocabulary,
      })
      downloadBlob(blob, templateFileName({ company, product, study }))
    } catch {
      setError(t('common.error'))
    } finally { setBuilding(false) }
  }

  async function handleFile(file) {
    if (!file) return
    setUploading(true)
    setProblems(null)
    setSuccess(null)
    setError(null)
    try {
      const { parseUpload } = await import('../excel/parse.js')
      const result = await parseUpload({ file, lang, study, processes, vocabulary })
      if (result.problems.length) { setProblems(result.problems); return }
      await replaceInventory(study.id, result.rows)
      await reload()
      setSuccess({ rows: result.rows.length, perSheet: result.perSheet })
      navigate(`/studies/${study.id}/results`)
    } catch {
      setError(t('errors.saveFailed'))
    } finally { setUploading(false) }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    if (!canUse) return
    handleFile(e.dataTransfer.files?.[0])
  }

  async function copyProblems() {
    try {
      const { problemsToText } = await import('../excel/parse.js')
      await navigator.clipboard.writeText(problemsToText(problems, t))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* clipboard may be unavailable */ }
  }

  return (
    <div>
      <div className="mb-5 max-w-prose">
        <h2 className="text-[24px]">{t('step3.title')}</h2>
        <p className="mt-2 font-semibold">{t('step3.intro')}</p>
      </div>

      {readOnly ? (
        <Card tone="alt" className="mb-5">
          <CardBody>
            <p className="m-0 max-w-prose">{t('step3.exampleNotice')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button as={Link} to="/" variant="secondary" className="no-underline">
                {t('step3.duplicateExample')}
              </Button>
              {rows.length ? (
                <Button as={Link} to={`/studies/${study.id}/results`} className="no-underline">
                  {t('step3.viewResults')}
                </Button>
              ) : null}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {!readOnly && !productionSet ? (
        <Card tone="alt" className="mb-5">
          <CardBody>
            <p className="m-0 max-w-prose font-semibold">{t('step3.noProduction')}</p>
            <Button as={Link} to={`/studies/${study.id}/scope`} className="mt-3 no-underline">
              {t('step3.goToStep1')}
            </Button>
          </CardBody>
        </Card>
      ) : null}

      <ol className="m-0 mb-5 grid list-none gap-4 p-0 lg:grid-cols-3">
        {[t('step3.stepOne'), t('step3.stepTwo'), t('step3.stepThree')].map((text, i) => (
          <li key={i}>
            <Card className="h-full">
              <CardBody>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-action font-semibold text-action-fg">
                  {i + 1}
                </span>
                <p className="mt-2.5 max-w-prose">{text}</p>
                {i === 0 ? (
                  <Button
                    type="button"
                    className="mt-2"
                    disabled={!canUse || building}
                    onClick={download}
                  >
                    {building ? t('step3.generating') : t('step3.download')}
                  </Button>
                ) : null}
              </CardBody>
            </Card>
          </li>
        ))}
      </ol>

      {rows.length ? (
        <p className="mb-4 text-text-meta">
          {t('step3.existingData', {
            date: formatDateTime(lastUpload, lang),
            rows: formatInteger(rows.length, lang),
            processes: formatInteger(new Set(rows.map((r) => r.process_id)).size, lang),
          })}
        </p>
      ) : null}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={[
          'rounded-brand border-2 border-dashed px-5 py-9 text-center',
          dragging ? 'border-action bg-surface-alt' : 'border-line bg-surface',
          !canUse ? 'opacity-50' : '',
        ].join(' ')}
      >
        <p className="m-0 font-semibold">{t('step3.uploadArea')}</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="sr-only"
          disabled={!canUse}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; handleFile(f) }}
        />
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          disabled={!canUse || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? t('step3.uploading') : t('step3.chooseFile')}
        </Button>
      </div>

      <FieldError>{error}</FieldError>

      {success ? (
        <Card className="mt-5">
          <CardHeader><h3 className="text-[19px]">{t('step3.successTitle')}</h3></CardHeader>
          <CardBody>
            <p className="m-0">{t('step3.successBody', { rows: formatInteger(success.rows, lang) })}</p>
            <h4 className="mt-4 text-[16px]">{t('step3.rowsPerProcess')}</h4>
            <ul className="m-0 mt-1.5 list-none p-0">
              {success.perSheet.map((s) => (
                <li key={s.sheet} className="flex items-center gap-2 py-0.5">
                  <span>{s.process?.name || s.sheet}</span>
                  {s.count ? (
                    <span className="font-semibold">{formatInteger(s.count, lang)}</span>
                  ) : (
                    <Badge>{t('step3.processNoData')}</Badge>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {problems ? (
        <Card className="mt-5 border-action">
          <CardHeader>
            <h3 className="text-[19px]">{t('step3.errorTitle')}</h3>
            <p className="m-0 mt-1 max-w-prose text-[15px] text-text-main">{t('step3.errorBody')}</p>
          </CardHeader>
          <CardBody>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="font-semibold">
                {t('step3.errorCount', { count: formatInteger(problems.length, lang) })}
              </span>
              <Button type="button" size="sm" variant="secondary" onClick={copyProblems}>
                {copied ? t('common.copied') : t('step3.copyErrors')}
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[15px]">
                <thead>
                  <tr className="bg-surface-alt">
                    <th scope="col" className="px-2.5 py-2">{t('step3.sheet')}</th>
                    <th scope="col" className="px-2.5 py-2">{t('step3.row')}</th>
                    <th scope="col" className="px-2.5 py-2">{t('step3.column')}</th>
                    <th scope="col" className="px-2.5 py-2">{t('step3.reason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {problems.map((p, i) => (
                    <tr key={i} className="border-t border-line align-top">
                      <td className="px-2.5 py-1.5">{p.sheet || t('common.none')}</td>
                      <td className="px-2.5 py-1.5">{p.row || t('common.none')}</td>
                      <td className="px-2.5 py-1.5">{p.column || t('common.none')}</td>
                      <td className="px-2.5 py-1.5">{p.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
