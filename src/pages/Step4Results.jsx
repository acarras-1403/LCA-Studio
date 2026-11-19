import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n.jsx'
import { useStudy } from './StudyLayout.jsx'
import { computeResults } from '../lib/calc.js'
import { byCode, DATA_QUALITY_LEVELS } from '../lib/indicators.js'
import { formatNumber, formatPercent, formatInteger } from '../lib/format.js'
import { stageFill, stageText, QUALITY_FILL, QUALITY_TEXT, QUALITY_LINE } from '../lib/palette.js'
import Button from '../components/ui/Button.jsx'
import Card, { CardBody, CardHeader } from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import DonutChart from '../components/DonutChart.jsx'
import { publicImageUrl } from '../lib/supabase.js'
import { downloadBlob } from '../lib/slug.js'
import { exportFileName } from '../lib/exportName.js'
import { FieldError } from '../components/ui/Field.jsx'
import { cn } from '../lib/cn.js'

const ALL_STAGES = 'all'
const TOP_CONTRIBUTORS = 6
const BADGE_TONE = { good: 'good', fair: 'fair', poor: 'poor' }

function QualityPill({ level, label }) {
  return (
    <span
      className="inline-block rounded-brand border px-2 py-0.5 text-[14px] font-semibold"
      style={{
        background: QUALITY_FILL[level],
        color: QUALITY_TEXT[level],
        borderColor: QUALITY_LINE[level],
      }}
    >
      {label}
    </span>
  )
}

function StageDot({ position }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3 w-3 shrink-0 rounded-[4px]"
      style={{ background: stageFill(position) }}
    />
  )
}

export default function Step4Results() {
  const { t, lang } = useI18n()
  const { study, product, company, processes, rows, vocabularyMap } = useStudy()

  const results = useMemo(
    () => computeResults(study, processes, rows, vocabularyMap),
    [study, processes, rows, vocabularyMap],
  )
  const [active, setActive] = useState(results.indicators[0] || 'gwp')
  const [stage, setStage] = useState(ALL_STAGES)
  const [showAllRows, setShowAllRows] = useState(false)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  const code = results.indicators.includes(active) ? active : results.indicators[0]
  const indicatorUnit = byCode[code].unit

  const labelOf = (id) => {
    const v = vocabularyMap[id]
    if (!v) return id
    return lang === 'es' ? v.label_es : v.label_en
  }
  const processById = useMemo(
    () => Object.fromEntries(results.processes.map((p) => [p.id, p])),
    [results.processes],
  )

  // The stage filter narrows the chart, the contributors and the inventory.
  const stageRows = useMemo(() => {
    const list = stage === ALL_STAGES
      ? results.rows
      : results.rows.filter((r) => r.process_id === stage)
    // Largest first: the whole point of the page is what to look at.
    return [...list].sort((a, b) => b.impacts[code] - a.impacts[code])
  }, [results.rows, stage, code])
  const filteredTotal = useMemo(
    () => stageRows.reduce((a, r) => a + r.impacts[code], 0),
    [stageRows, code],
  )

  const slices = useMemo(() => {
    const visible = stage === ALL_STAGES
      ? results.processes.filter((p) => p.hasData)
      : results.processes.filter((p) => p.id === stage && p.hasData)
    return [...visible]
      .map((p) => ({
        id: p.id,
        label: p.name,
        position: p.position,
        value: p.totals[code],
        share: filteredTotal > 0 ? (p.totals[code] / filteredTotal) * 100 : null,
      }))
      .sort((a, b) => b.value - a.value)
  }, [results.processes, stage, code, filteredTotal])

  const contributors = useMemo(
    () => ({ sorted: stageRows, peak: stageRows[0]?.impacts[code] || 0 }),
    [stageRows, code],
  )

  const qualityShares = useMemo(() => {
    const out = {}
    for (const level of DATA_QUALITY_LEVELS) {
      const sum = stageRows
        .filter((r) => r.data_quality === level)
        .reduce((a, r) => a + r.impacts[code], 0)
      out[level] = { impact: sum, share: filteredTotal > 0 ? (sum / filteredTotal) * 100 : null }
    }
    return out
  }, [stageRows, code, filteredTotal])

  const weakest = useMemo(() => {
    const withData = results.processes.filter((p) => p.hasData && p.badges[code])
    if (!withData.length) return null
    return withData.reduce((worst, p) => (p.scores[code] > worst.scores[code] ? p : worst), withData[0])
  }, [results.processes, code])

  async function downloadExcel() {
    setBusy('excel'); setError(null)
    try {
      const { buildExportWorkbook } = await import('../excel/exportWorkbook.js')
      const blob = await buildExportWorkbook({ lang, study, product, company, results, vocabularyMap })
      downloadBlob(blob, exportFileName({ company, product, study, lang, extension: 'xlsx' }))
    } catch { setError(t('common.error')) } finally { setBusy(null) }
  }

  async function downloadPdf() {
    setBusy('pdf'); setError(null)
    try {
      const { buildReport } = await import('../pdf/report.js')
      const blob = await buildReport({
        lang, study, product, company, results, vocabularyMap,
        imageUrl: publicImageUrl(product?.image_path),
      })
      downloadBlob(blob, exportFileName({ company, product, study, lang, extension: 'pdf' }))
    } catch { setError(t('common.error')) } finally { setBusy(null) }
  }

  if (!results.hasData) {
    return (
      <Card tone="alt">
        <CardBody>
          <h2 className="text-[22px]">{t('step4.noDataTitle')}</h2>
          <p className="mt-2 max-w-prose">{t('step4.noDataBody')}</p>
          <Button as={Link} to={`/studies/${study.id}/data`} className="mt-3 no-underline">
            {t('step4.goToStep3')}
          </Button>
        </CardBody>
      </Card>
    )
  }

  const shownRows = showAllRows ? contributors.sorted : contributors.sorted.slice(0, TOP_CONTRIBUTORS)
  const stageName = stage === ALL_STAGES ? null : processById[stage]?.name

  return (
    <div>
      {/* Impact: visible buttons, not a menu. */}
      <section className="mb-4">
        <p className="m-0 mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-muted">
          {t('step4.impact')}
        </p>
        <div role="group" aria-label={t('step4.indicator')} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {results.indicators.map((c) => {
            const on = c === code
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => setActive(c)}
                className={cn(
                  'min-h-[44px] shrink-0 rounded-brand border px-4 py-2 text-[15px] font-semibold transition-colors',
                  on
                    ? 'border-action bg-action text-action-fg'
                    : 'border-line bg-surface text-action hover:bg-surface-alt',
                )}
              >
                {t(`indicatorsShort.${c}`)}
              </button>
            )
          })}
        </div>
      </section>

      {/* The chart, with the stage filter. */}
      <Card>
        <CardHeader className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[18px] sm:text-[20px]">
              <span className="sm:hidden">
                {t('step4.byStage', { indicator: t(`indicatorsShort.${code}`) })}
              </span>
              <span className="hidden sm:inline">
                {t('step4.byStage', { indicator: t(`indicators.${code}`) })}
              </span>
            </h2>
            <p className="m-0 mt-1 text-[15px] text-text-meta">
              {indicatorUnit} {t('step4.perFunctionalUnit')}
            </p>
          </div>
          <label className="flex w-full flex-col gap-1.5 text-[15px] sm:w-auto sm:flex-row sm:items-center sm:gap-2.5">
            <span className="text-text-meta">{t('step4.stage')}</span>
            <select
              value={stage}
              onChange={(e) => { setStage(e.target.value); setShowAllRows(false) }}
              className="min-h-[44px] rounded-brand border border-line bg-surface px-3 py-2 text-text-main"
            >
              <option value={ALL_STAGES}>{t('step4.allStages')}</option>
              {results.processes.map((p) => (
                <option key={p.id} value={p.id}>{p.position} {p.name}</option>
              ))}
            </select>
          </label>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:gap-10">
            <div className="flex w-full justify-center lg:w-auto lg:shrink-0">
              <DonutChart
                slices={slices}
                total={filteredTotal}
                unit={indicatorUnit}
                perUnitLabel={t('step4.perUnitShort')}
                title={t('step4.byStage', { indicator: t(`indicators.${code}`) })}
              />
            </div>

            <ul className="m-0 w-full min-w-0 list-none p-0">
              {slices.length ? slices.map((s) => (
                <li key={s.id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                  <StageDot position={s.position} />
                  <span className="min-w-0 flex-1 font-semibold">{s.label}</span>
                  <span className="whitespace-nowrap text-[15px] text-text-meta">
                    {formatNumber(s.value, lang)}
                  </span>
                  <span className="w-[62px] text-right font-semibold">
                    {formatPercent(s.share, lang)}
                  </span>
                </li>
              )) : (
                <li className="py-2.5 text-text-meta">{t('step4.noRowsForStage')}</li>
              )}
            </ul>
          </div>

          {stageName ? (
            <p className="mt-4 flex flex-wrap items-center gap-3 text-[15px]">
              <span className="font-semibold">{t('step4.stageOnly', { stage: stageName })}</span>
              <Button type="button" variant="quiet" size="sm" onClick={() => setStage(ALL_STAGES)}>
                {t('step4.clearStage')}
              </Button>
            </p>
          ) : (
            <p className="mt-4 max-w-prose text-[15px] text-text-meta">{t('step4.filterNote')}</p>
          )}
        </CardBody>
      </Card>

      {/* Biggest contributors. */}
      <Card className="mt-5">
        <CardHeader>
          <h2 className="text-[18px] sm:text-[20px]">{t('step4.biggestContributors')}</h2>
          <p className="m-0 mt-1 text-[15px] text-text-meta">
            {t('step4.showingOf', {
              shown: formatInteger(shownRows.length, lang),
              total: formatInteger(contributors.sorted.length, lang),
            })}
          </p>
        </CardHeader>
        <CardBody>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {shownRows.map((r) => {
              const p = processById[r.process_id]
              const width = contributors.peak > 0
                ? Math.max(0, (r.impacts[code] / contributors.peak) * 100) : 0
              return (
                <li key={r.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="flex min-w-0 items-center gap-2.5 font-semibold">
                      <StageDot position={p?.position} />
                      {labelOf(r.vocabulary_id)}
                    </span>
                    <span className="text-[15px] text-text-meta">
                      <span className="font-semibold text-text-main">
                        {formatNumber(r.impacts[code], lang)}
                      </span>{' '}
                      {indicatorUnit}
                      <span className="ml-2">{formatPercent(r.shares[code], lang)}</span>
                    </span>
                  </div>
                  <div className="mt-1 h-3 w-full overflow-hidden rounded-brand bg-surface-alt">
                    <div
                      className="h-full rounded-brand"
                      style={{
                        width: `${width}%`,
                        background: stageFill(p?.position),
                        minWidth: r.impacts[code] > 0 ? '2px' : 0,
                      }}
                    />
                  </div>
                  <p className="m-0 mt-1 text-[14px] text-text-meta">
                    {p?.name} — {formatNumber(r.q_fu, lang)} {r.unit} — {t(`quality.${r.data_quality}`)}
                  </p>
                </li>
              )
            })}
          </ul>
          {contributors.sorted.length > TOP_CONTRIBUTORS ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-4 w-full justify-center sm:w-auto"
              onClick={() => setShowAllRows(!showAllRows)}
            >
              {showAllRows
                ? t('step4.showingOf', {
                  shown: formatInteger(TOP_CONTRIBUTORS, lang),
                  total: formatInteger(contributors.sorted.length, lang),
                })
                : t('step4.seeAllRows', { count: formatInteger(contributors.sorted.length, lang) })}
            </Button>
          ) : null}
        </CardBody>
      </Card>

      {/* Inventory, with the data quality analysis inside it. */}
      <Card className="mt-5">
        <CardHeader>
          <h2 className="text-[18px] sm:text-[20px]">{t('step4.inventoryAndQuality')}</h2>
        </CardHeader>
        <CardBody>
          <div className="rounded-brand border border-line bg-surface-alt px-4 py-3.5">
            <p className="m-0 mb-2 text-[15px] font-semibold">{t('step4.qualityShare')}</p>
            <div className="flex h-[18px] overflow-hidden rounded-brand border border-line">
              {DATA_QUALITY_LEVELS.map((level) => {
                const pct = qualityShares[level].share ?? 0
                if (!(pct > 0)) return null
                return (
                  <div
                    key={level}
                    title={`${t(`quality.${level}`)} ${formatPercent(pct, lang)}`}
                    style={{ width: `${pct}%`, background: QUALITY_FILL[level] }}
                  />
                )
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-text-meta">
              {DATA_QUALITY_LEVELS.map((level) => (
                <span key={level} className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 w-3 rounded-sm border"
                    style={{ background: QUALITY_FILL[level], borderColor: QUALITY_LINE[level] }}
                  />
                  {t(`quality.${level}`)}
                  <strong className="text-text-main">{formatPercent(qualityShares[level].share, lang)}</strong>
                </span>
              ))}
              {weakest ? (
                <span className="text-text-main">
                  {t('step4.weakestStage')}{' '}
                  <strong>
                    {weakest.name}, {formatNumber(weakest.scores[code], lang)}{' '}
                    {t(`quality.${weakest.badges[code]}`)}
                  </strong>
                </span>
              ) : null}
            </div>
          </div>

          {/* Narrow screens get cards, wide screens get the table. */}
          <ul className="m-0 mt-4 list-none p-0 md:hidden">
            {stageRows.map((r) => {
              const p = processById[r.process_id]
              return (
                <li key={r.id} className="border-b border-line py-3 last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold">{labelOf(r.vocabulary_id)}</span>
                    <span className="whitespace-nowrap font-semibold">
                      {formatNumber(r.impacts[code], lang)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-text-meta">
                    <span className="flex items-center gap-1.5"><StageDot position={p?.position} />{p?.name}</span>
                    <span>{formatNumber(r.q_fu, lang)} {r.unit}</span>
                    <span>{formatPercent(r.shares[code], lang)}</span>
                    <QualityPill level={r.data_quality} label={t(`quality.${r.data_quality}`)} />
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full text-left text-[15px]">
              <thead>
                <tr className="bg-surface-alt">
                  <th scope="col" className="px-2.5 py-2">{t('step4.stage')}</th>
                  <th scope="col" className="px-2.5 py-2">{t('common.type')}</th>
                  <th scope="col" className="px-2.5 py-2 text-right">{t('exportDoc.quantityPerFU')}</th>
                  <th scope="col" className="px-2.5 py-2">{t('common.unit')}</th>
                  <th scope="col" className="px-2.5 py-2 text-right">{t('common.impact')}</th>
                  <th scope="col" className="px-2.5 py-2 text-right">{t('common.share')}</th>
                  <th scope="col" className="px-2.5 py-2">{t('common.dataQuality')}</th>
                </tr>
              </thead>
              <tbody>
                {stageRows.map((r) => {
                  const p = processById[r.process_id]
                  return (
                    <tr key={r.id} className="border-t border-line">
                      <td className="px-2.5 py-1.5">
                        <span className="flex items-center gap-2"><StageDot position={p?.position} />{p?.name}</span>
                      </td>
                      <td className="px-2.5 py-1.5">{labelOf(r.vocabulary_id)}</td>
                      <td className="px-2.5 py-1.5 text-right">{formatNumber(r.q_fu, lang)}</td>
                      <td className="px-2.5 py-1.5">{r.unit}</td>
                      <td className="px-2.5 py-1.5 text-right font-semibold">
                        {formatNumber(r.impacts[code], lang)}
                      </td>
                      <td className="px-2.5 py-1.5 text-right">{formatPercent(r.shares[code], lang)}</td>
                      <td className="px-2.5 py-1.5">
                        <QualityPill level={r.data_quality} label={t(`quality.${r.data_quality}`)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <h3 className="mt-6 text-[16px]">{t('step4.processBadges')}</h3>
          <ul className="m-0 mt-2 flex list-none flex-wrap gap-2 p-0">
            {results.processes.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-brand border border-line bg-surface px-3 py-1.5">
                <StageDot position={p.position} />
                <span>{p.name}</span>
                {p.badges[code] ? (
                  <>
                    <span className="font-semibold">{formatNumber(p.scores[code], lang)}</span>
                    <Badge tone={BADGE_TONE[p.badges[code]]}>{t(`quality.${p.badges[code]}`)}</Badge>
                  </>
                ) : (
                  <Badge>{t('common.noData')}</Badge>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 max-w-prose text-[15px] text-text-meta">{t('quality.scale')}</p>
        </CardBody>
      </Card>

      {/* Downloads and the disclaimer. */}
      <FieldError>{error}</FieldError>
      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
        <Button type="button" disabled={busy === 'pdf'} onClick={downloadPdf} className="justify-center">
          {busy === 'pdf' ? t('step4.preparing') : t('step4.downloadPdf')}
        </Button>
        <Button type="button" variant="secondary" disabled={busy === 'excel'} onClick={downloadExcel} className="justify-center">
          {busy === 'excel' ? t('step4.preparing') : t('step4.downloadExcel')}
        </Button>
      </div>

      <Card className="mt-5">
        <CardBody>
          <h3 className="text-[18px]">{t('step4.limitations')}</h3>
          <ol className="mt-2 max-w-prose list-decimal space-y-1.5 pl-5">
            {(Array.isArray(t('limitations')) ? t('limitations') : []).map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ol>
          <p className="mt-4 max-w-prose font-semibold text-action">{t('disclaimer')}</p>
        </CardBody>
      </Card>
    </div>
  )
}
