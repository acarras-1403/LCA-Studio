import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../lib/i18n.jsx'
import { useStudy } from './StudyLayout.jsx'
import Button from '../components/ui/Button.jsx'
import Card, { CardBody } from '../components/ui/Card.jsx'
import Dialog from '../components/ui/Dialog.jsx'
import { Input, FieldError, Help } from '../components/ui/Field.jsx'
import ChainDiagram from '../components/ChainDiagram.jsx'
import { saveChain, advanceStatus } from '../lib/api.js'

const MAX = 12
let tempId = 0

function tempKey() { tempId += 1; return `new-${tempId}` }

/** The chain as drawn equals the saved chain when ids, order and names match. */
function sameAsSaved(chain, processes) {
  if (chain.length !== processes.length) return false
  return chain.every((p, i) => p.id === processes[i].id && p.name.trim() === processes[i].name)
}

export default function Step2Chain() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { study, processes, rows, readOnly, reload } = useStudy()

  const [chain, setChain] = useState(() =>
    processes.map((p) => ({ key: p.id, id: p.id, name: p.name })))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    setChain(processes.map((p) => ({ key: p.id, id: p.id, name: p.name })))
  }, [processes])

  const unchanged = useMemo(() => sameAsSaved(chain, processes), [chain, processes])
  const hasInventory = rows.length > 0

  function validate(list) {
    const found = {}
    const seen = new Map()
    list.forEach((p, i) => {
      const name = p.name.trim()
      if (!name) found[p.key] = t('step2.nameRequired')
      else if (name.length > 60) found[p.key] = t('step2.nameTooLong')
      else {
        const key = name.toLocaleLowerCase()
        if (seen.has(key)) {
          found[p.key] = t('step2.nameDuplicate')
          found[seen.get(key)] = t('step2.nameDuplicate')
        } else seen.set(key, p.key)
      }
      return i
    })
    return found
  }

  function addAt(index) {
    if (chain.length >= MAX) { setFormError(t('step2.maxProcesses')); return }
    setFormError(null)
    const next = [...chain]
    next.splice(index, 0, { key: tempKey(), id: null, name: '' })
    setChain(next)
  }

  function remove(index) {
    if (chain.length <= 1) { setFormError(t('step2.minProcesses')); return }
    setFormError(null)
    setChain(chain.filter((unused, i) => i !== index))
  }

  function move(index, delta) {
    const target = index + delta
    if (target < 0 || target >= chain.length) return
    const next = [...chain]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    setChain(next)
  }

  function rename(index, name) {
    const next = [...chain]
    next[index] = { ...next[index], name }
    setChain(next)
  }

  async function persist() {
    setBusy(true)
    setFormError(null)
    try {
      await saveChain(study.id, chain, {
        clearInventory: hasInventory,
        chainVersion: study.chain_version,
      })
      await advanceStatus(study, hasInventory ? 'chain' : 'chain')
      await reload()
      navigate(`/studies/${study.id}/data`)
    } catch {
      setFormError(t('errors.saveFailed'))
    } finally {
      setBusy(false)
      setConfirmClear(false)
    }
  }

  function onSubmit(e) {
    e.preventDefault()
    if (!chain.length) { setFormError(t('step2.minProcesses')); return }
    const found = validate(chain)
    setErrors(found)
    if (Object.keys(found).length) return
    if (unchanged) { navigate(`/studies/${study.id}/data`); return }
    if (hasInventory) { setConfirmClear(true); return }
    persist()
  }

  const diagramItems = chain.map((p) => ({ name: p.name.trim() || t('step2.namePlaceholder') }))

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="mb-5 max-w-prose">
        <h2 className="text-[24px]">{t('step2.title')}</h2>
        <p className="mt-2">{t('step2.intro')}</p>
      </div>

      {readOnly ? (
        <Card tone="alt" className="mb-5">
          <CardBody><p className="m-0 max-w-prose">{t('step2.exampleNotice')}</p></CardBody>
        </Card>
      ) : null}

      {chain.length ? (
        <Card className="mb-5 overflow-x-auto">
          <CardBody>
            <ChainDiagram
              items={diagramItems}
              title={t('step2.title')}
              showFlowLabels
              idPrefix="builder"
            />
            <p className="mt-2 text-[14px] text-text-meta lg:hidden">{t('step2.narrowScreen')}</p>
          </CardBody>
        </Card>
      ) : null}

      {!chain.length ? (
        <Card tone="alt" className="mb-5">
          <CardBody>
            <Button type="button" onClick={() => addAt(0)} disabled={readOnly}>
              {t('step2.addFirst')}
            </Button>
          </CardBody>
        </Card>
      ) : (
        <ol className="m-0 mb-5 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {chain.map((p, i) => (
            <li key={p.key}>
              <Card>
                <CardBody>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-action text-[14px] font-semibold text-action">
                      {i + 1}
                    </span>
                    <Input
                      value={p.name}
                      maxLength={60}
                      disabled={readOnly}
                      placeholder={t('step2.namePlaceholder')}
                      aria-label={`${t('common.process')} ${i + 1}`}
                      invalid={!!errors[p.key]}
                      onChange={(e) => rename(i, e.target.value)}
                    />
                  </div>
                  <FieldError>{errors[p.key]}</FieldError>
                  {!readOnly ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <Button type="button" size="sm" variant="quiet"
                        disabled={i === 0} onClick={() => move(i, -1)}>
                        {t('step2.moveLeft')}
                      </Button>
                      <Button type="button" size="sm" variant="quiet"
                        disabled={i === chain.length - 1} onClick={() => move(i, 1)}>
                        {t('step2.moveRight')}
                      </Button>
                      <Button type="button" size="sm" variant="quiet"
                        disabled={chain.length >= MAX}
                        title={t('step2.insertAfter')}
                        onClick={() => addAt(i + 1)}>
                        {t('step2.addNext')}
                      </Button>
                      <Button type="button" size="sm" variant="quiet"
                        disabled={chain.length <= 1} onClick={() => remove(i)}>
                        {t('common.delete')}
                      </Button>
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            </li>
          ))}
          {!readOnly && chain.length < MAX ? (
            <li>
              <button
                type="button"
                onClick={() => addAt(chain.length)}
                className="flex h-full min-h-[108px] w-full items-center justify-center rounded-brand border-2 border-dashed border-action bg-transparent font-semibold text-action hover:bg-surface-alt"
              >
                + {t('step2.addNext')}
              </button>
            </li>
          ) : null}
        </ol>
      )}

      <Help>{`${t('step2.minProcesses')} ${t('step2.maxProcesses')}`}</Help>
      <FieldError>{formError}</FieldError>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={busy || !chain.length}>
          {busy ? t('common.saving')
            : readOnly ? t('common.continue') : t('common.saveAndContinue')}
        </Button>
      </div>

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title={t('step2.warnTitle')}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setConfirmClear(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" disabled={busy} onClick={persist}>
              {busy ? t('common.saving') : t('step2.warnConfirm')}
            </Button>
          </>
        )}
      >
        <p className="max-w-prose">{t('step2.warnBody')}</p>
      </Dialog>
    </form>
  )
}
