import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n.jsx'
import { computeResults } from '../lib/calc.js'
import { byCode } from '../lib/indicators.js'
import { formatNumber, formatPercent, formatInteger } from '../lib/format.js'
import { stageFill } from '../lib/palette.js'
import Button from './ui/Button.jsx'

const PREVIEW_INDICATORS = 3

/** How far through the four steps a study is, for the "no results" case. */
function stepsDone(study, processCount, rowCount) {
  let done = 0
  if (study.annual_production > 0) done = 1
  if (processCount > 0) done = 2
  if (rowCount > 0) done = 4
  return done
}

/**
 * The headline numbers for one study, shown on the homepage so you can see
 * what a study says without opening it. Falls back to a progress summary when
 * there is no inventory yet.
 */
export default function StudyPreview({ study }) {
  const { t, lang } = useI18n()
  const processes = study.processes || []
  const rows = study.rows || []

  const results = useMemo(
    () => (rows.length ? computeResults(study, processes, rows, {}) : null),
    [study, processes, rows],
  )

  if (!results || !results.hasData) {
    const done = stepsDone(study, processes.length, rows.length)
    const next = done >= 2 ? 'data' : done >= 1 ? 'chain' : 'scope'
    return (
      <div>
        <p className="m-0 mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-muted">
          {t('home.noResultsYet')}
        </p>
        <div className="rounded-brand border border-line bg-surface-alt px-4 py-3.5">
          <p className="m-0 text-[15px]">{t('home.nothingToShow')}</p>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="h-2.5 flex-1 overflow-hidden rounded-brand border border-line bg-surface">
              <div className="h-full bg-action" style={{ width: `${(done / 4) * 100}%` }} />
            </div>
            <span className="whitespace-nowrap text-[14px] text-text-meta">
              {t('home.stepsDone', { done: formatInteger(done, lang) })}
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button as={Link} to={`/studies/${study.id}/${next}`} size="sm" className="no-underline">
            {done >= 2 ? t('home.addTheData') : t('home.continueAt')}
          </Button>
        </div>
      </div>
    )
  }

  const shown = results.indicators.slice(0, PREVIEW_INDICATORS)
  const primary = results.indicators[0]
  const top = results.topProcess[primary]
  const withData = results.processes.filter((p) => p.hasData)
  const badge = top?.badges?.[primary]

  return (
    <div>
      <p className="m-0 mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-muted">
        {t('home.resultsReady')}
      </p>

      <div className="grid gap-2.5 sm:grid-cols-3">
        {shown.map((c) => (
          <div key={c} className="overflow-hidden rounded-brand border border-line">
            <div className="h-1" style={{ background: stageFill(results.indicators.indexOf(c) + 1) }} />
            <div className="px-2.5 py-2">
              <p className="m-0 text-[13px] text-text-meta">{t(`indicatorsShort.${c}`)}</p>
              <p className="m-0 mt-0.5 font-serif text-[21px] font-semibold text-action">
                {formatNumber(results.totals[c], lang)}
              </p>
              <p className="m-0 text-[13px] text-text-meta">{byCode[c].unit}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="m-0 mb-1.5 mt-3.5 text-[14px] text-text-meta">
        {t('step4.byStage', { indicator: t(`indicatorsShort.${primary}`) })}
      </p>
      <div
        className="flex h-3.5 overflow-hidden rounded-brand border border-line"
        role="img"
        aria-label={withData
          .map((p) => `${p.name} ${formatPercent(p.shares[primary], lang)}`)
          .join(', ')}
      >
        {withData.map((p) => (
          <div
            key={p.id}
            title={`${p.name} ${formatPercent(p.shares[primary], lang)}`}
            style={{ width: `${p.shares[primary] ?? 0}%`, background: stageFill(p.position) }}
          />
        ))}
      </div>

      <p className="m-0 mt-2 text-[14px] text-text-meta">
        {t('home.largestContributor')}{' '}
        <strong className="text-text-main">
          {top?.name || t('common.none')}
          {top ? `, ${formatPercent(top.shares[primary], lang)}` : ''}
        </strong>
        {badge ? (
          <>
            {' — '}{t('home.dataQualityShort')}{' '}
            <strong className="text-text-main">{t(`quality.${badge}`)}</strong>
          </>
        ) : null}
      </p>
    </div>
  )
}
