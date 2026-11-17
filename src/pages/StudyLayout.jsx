import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Outlet, useParams, Navigate, useLocation, Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n.jsx'
import { loadStudy, loadVocabulary, vocabularyMap } from '../lib/api.js'
import { publicImageUrl } from '../lib/supabase.js'
import Stepper, { highestReachableStep } from '../components/Stepper.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import { functionalUnitText } from '../lib/scopeFields.js'

const StudyContext = createContext(null)

export function useStudy() {
  const ctx = useContext(StudyContext)
  if (!ctx) throw new Error('useStudy must be used inside a study route')
  return ctx
}

const STEP_OF = { scope: 1, chain: 2, data: 3, results: 4 }

export default function StudyLayout() {
  const { id } = useParams()
  const { t, lang } = useI18n()
  const { pathname } = useLocation()
  const [state, setState] = useState({ status: 'loading' })
  const [vocab, setVocab] = useState(null)

  const reload = useCallback(async () => {
    try {
      const data = await loadStudy(id)
      if (!data) { setState({ status: 'missing' }); return }
      setState({ status: 'ready', data })
    } catch {
      setState({ status: 'error' })
    }
  }, [id])

  useEffect(() => { setState({ status: 'loading' }); reload() }, [reload])

  useEffect(() => {
    loadVocabulary().then((items) => setVocab(items)).catch(() => setVocab([]))
  }, [])

  const value = useMemo(() => {
    if (state.status !== 'ready') return null
    const { study, product, company, processes, rows, readOnly } = state.data
    return {
      study, product, company, processes, rows, readOnly, reload,
      vocabulary: vocab || [],
      vocabularyMap: vocabularyMap(vocab || []),
      reachable: highestReachableStep(study, processes.length, rows.length),
    }
  }, [state, vocab, reload])

  if (state.status === 'loading') return <p className="text-text-meta">{t('common.loading')}</p>
  if (state.status === 'missing') {
    return (
      <div className="max-w-prose">
        <h1 className="text-[28px]">{t('errors.notFound')}</h1>
        <p className="mt-2">{t('errors.notFoundBody')}</p>
        <Button as={Link} to="/" className="mt-4 no-underline">{t('app.home')}</Button>
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="max-w-prose">
        <p role="alert" className="font-semibold text-action">{t('errors.loadFailed')}</p>
        <Button onClick={reload} className="mt-4">{t('common.retry')}</Button>
      </div>
    )
  }

  const { study, product, company, readOnly } = state.data
  const slug = pathname.split('/').pop()
  const requested = STEP_OF[slug]
  if (requested && requested > value.reachable) {
    const fallback = ['scope', 'chain', 'data', 'results'][value.reachable - 1]
    return <Navigate to={`/studies/${id}/${fallback}`} replace />
  }

  const imageUrl = publicImageUrl(product?.image_path)

  return (
    <StudyContext.Provider value={value}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product?.name || ''}
              className="h-20 w-20 rounded-brand border border-line bg-surface object-contain"
            />
          ) : null}
          <div>
            <p className="m-0 text-[15px] text-text-meta">{company?.name}</p>
            <h1 className="text-[28px]">{product?.name}</h1>
            <p className="m-0 mt-1 text-[15px] text-text-meta">
              {functionalUnitText({ study, t, lang })} — {study.reference_year}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {readOnly ? <Badge tone="fair">{t('home.exampleBadge')}</Badge> : null}
          <Badge>{t('app.demoLabel')}</Badge>
        </div>
      </div>

      <Stepper studyId={id} reachable={value.reachable} />
      <Outlet />
    </StudyContext.Provider>
  )
}
