import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n.jsx'
import { useTheme } from '../lib/theme.jsx'
import { useStudy } from './StudyLayout.jsx'
import { computeResults, heatPosition, mixHex, readableOn } from '../lib/calc.js'
import { byCode } from '../lib/indicators.js'
import { formatNumber, formatPercent } from '../lib/format.js'
import Button from '../components/ui/Button.jsx'
import Card, { CardBody, CardHeader } from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import BarChart from '../components/BarChart.jsx'
import StackedQualityBar from '../components/StackedQualityBar.jsx'
import ChainDiagram from '../components/ChainDiagram.jsx'
import { publicImageUrl } from '../lib/supabase.js'
import { downloadBlob } from '../lib/slug.js'
import { exportFileName } from '../lib/exportName.js'
import { FieldError } from '../components/ui/Field.jsx'

const BADGE_TONE = { good: 'good', fair: 'fair', poor: 'poor' }

export default function Step4Results() {
  const { t, lang } = useI18n()
  const { isDark } = useTheme()
  const { study, product, company, processes, rows, vocabularyMap } = useStudy()

  const results = useMemo(
    () => computeResults(study, processes, rows, vocabularyMap),
    [study, processes, rows, vocabularyMap],
  )
  const [active, setActive] = useState(results.indicators[0] || 'gwp')
  const [sortBy, setSortBy] = useState('impact')
  const [limitationsOpen, setLimitationsOpen] = useState(false)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  const code = results.indicators.includes(active) ? active : results.indicators[0]

  const heatColours = useMemo(() => {
    const low = isDark ? '#343F2E' : '#E6EBE1'
    const high = isDark ? '#D4717F' : '#7A1F2B'
    return { low, high }
  }, [isDark])

  const processNameById = useMemo(
    () => Object.fromEntries(results.processes.map((p) => [p.id, p.name])),
    [results.processes],
  )

  const sortedRows = useMemo(() => {
    const list = [...results.rows]
    const label = (r) => {
      const v = vocabularyMap[r.vocabulary_id]
      return v ? (lang === 'es' ? v.label_es : v.label_en) : r.vocabulary_id
    }
    const comparators = {
      impact: (a, b) => b.impacts[code] - a.impacts[code],
      process: (a, b) => (processNameById[a.process_id] || '')
        .localeCompare(processNameById[b.process_id] || ''),
      type: (a, b) => label(a).localeCompare(label(b)),
      quality: (a, b) => a.score - b.score || b.impacts[code] - a.impacts[code],
      quantity: (a, b) => b.q_fu - a.q_fu,
    }
    return list.sort(comparators[sortBy] || comparators.impact)
  }, [results.rows, code, sortBy, vocabularyMap, lang, processNameById])

  async function downloadExcel() {
    setBusy('excel')
    setError(null)
    try {
      const { buildExportWorkbook } = await import('../excel/exportWorkbook.js')
      const blob = await buildExportWorkbook({
        lang, study, product, company, results, vocabularyMap,
      })
      downloadBlob(blob, exportFileName({ company, product, study, lang, extension: 'xlsx' }))
    } catch {
      setError(t('common.error'))
    } finally { setBusy(null) }
  }

  async function downloadPdf() {
    setBusy('pdf')
    setError(null)
    try {
      const { buildReport } = await import('../pdf/report.js')
      const blob = await buildReport({
        lang, study, product, company, results, vocabularyMap,
        imageUrl: publicImageUrl(product?.image_path),
      })
      downloadBlob(blob, exportFileName({ company, product, study, lang, extension: 'pdf' }))
    } catch {
      setError(t('common.error'))
    } finally { setBusy(null) }
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

  const labelOf = (id) => {
    const v = vocabularyMap[id]
    if (!v) return id
    return lang === 'es' ? v.label_es : v.label_en
  }

  const heatItems = results.processes.map((p) => {
    if (!p.hasData) {
      return {
        name: p.name, muted: true, fill: 'var(--nodata)',
        textColor: 'var(--nodata-fg)', caption: t('common.noData'),
      }
    }
    const pos = heatPosition(p.totals[code], results.maxProcess[code])
    const fill = mixHex(heatColours.low, heatColours.high, pos)
    return {
      name: p.name,
      fill,
      textColor: readableOn(fill),
      caption: p.shares[code] == null ? formatPercent(0, lang) : formatPercent(p.shares[code], lang),
    }
  })

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-[24px]">{t('step4.title')}</h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy === 'pdf'} onClick={downloadPdf}>
            {busy === 'pdf' ? t('step4.preparing') : t('step4.downloadPdf')}
          </Button>
          <Button type="button" variant="secondary" disabled={busy === 'excel'} onClick={downloadExcel}>
            {busy === 'excel' ? t('step4.preparing') : t('step4.downloadExcel')}
          </Button>
        </div>
      </div>
      <FieldError>{error}</FieldError>

      <section className="mb-6">
        <h3 className="sr-only">{t('step4.totals')}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.indicators.map((c) => (
            <Card key={c} tone={c === code ? 'alt' : 'plain'}>
              <CardBody>
                <p className="m-0 text-[15px] text-text-muted">{t(`indicators.${c}`)}</p>
                <p className="m-0 mt-1 font-serif text-[26px] font-semibold text-action">
                  {formatNumber(results.totals[c], lang)}
                </p>
                <p className="m-0 text-[15px] text-text-meta">
                  {byCode[c].unit} {t('step4.perFunctionalUnit')}
                </p>
                <p className="m-0 mt-2 text-[15px]">
                  <span className="text-text-meta">{t('step4.largestProcess')}: </span>
                  <span className="font-semibold">
                    {results.topProcess[c]?.name || t('common.none')}
                  </span>
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <div
        role="tablist"
        aria-label={t('step4.indicator')}
        className="mb-6 flex flex-wrap gap-1 border-b border-line"
      >
        {results.indicators.map((c) => (
          <button
            key={c}
            role="tab"
            type="button"
            aria-selected={c === code}
            onClick={() => setActive(c)}
            className={[
              'border-b-2 px-3 py-2 text-[15px] font-semibold',
              c === code ? 'border-action text-action' : 'border-transparent text-text-main hover:border-sage',
            ].join(' ')}
          >
            {t(`indicatorsShort.${c}`)}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-[19px]">{t('step4.contributionPerProcess')}</h3>
            <p className="m-0 mt-0.5 text-[15px] text-text-meta">
              {t(`indicators.${code}`)} — {byCode[code].unit} {t('step4.perFunctionalUnit')}
            </p>
          </CardHeader>
          <CardBody>
            <BarChart
              unit={byCode[code].unit}
              items={results.processes.map((p) => ({
                label: p.name, value: p.totals[code], share: p.shares[code], noData: !p.hasData,
              }))}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-[19px]">{t('step4.heatMap')}</h3>
            <p className="m-0 mt-0.5 text-[15px] text-text-meta">{t('step4.heatMapHelp')}</p>
          </CardHeader>
          <CardBody className="overflow-x-auto">
            <ChainDiagram items={heatItems} title={t('step4.heatMap')} idPrefix="heat" />
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[14px] text-text-meta">
              <span className="flex items-center gap-2">
                <span>{t('step4.heatLegendLow')}</span>
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-24 rounded-sm border border-line"
                  style={{ background: `linear-gradient(90deg, ${heatColours.low}, ${heatColours.high})` }}
                />
                <span>{t('step4.heatLegendHigh')}</span>
              </span>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 rounded-sm border border-line"
                  style={{ background: 'var(--nodata)' }}
                />
                <span>{t('common.noData')}</span>
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[19px]">{t('step4.hotspots')}</h3>
          <label className="flex items-center gap-2 text-[15px]">
            <span className="text-text-meta">{t('step4.sortBy')}</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-brand border border-line bg-surface px-2 py-1"
            >
              <option value="impact">{t('common.impact')}</option>
              <option value="process">{t('common.process')}</option>
              <option value="type">{t('common.type')}</option>
              <option value="quantity">{t('common.quantity')}</option>
              <option value="quality">{t('common.dataQuality')}</option>
            </select>
          </label>
        </CardHeader>
        <CardBody className="overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <thead>
              <tr className="bg-surface-alt">
                <th scope="col" className="px-2.5 py-2">{t('common.process')}</th>
                <th scope="col" className="px-2.5 py-2">{t('common.type')}</th>
                <th scope="col" className="px-2.5 py-2 text-right">{t('exportDoc.quantityPerFU')}</th>
                <th scope="col" className="px-2.5 py-2">{t('common.unit')}</th>
                <th scope="col" className="px-2.5 py-2 text-right">{t('common.impact')}</th>
                <th scope="col" className="px-2.5 py-2 text-right">{t('common.share')}</th>
                <th scope="col" className="px-2.5 py-2">{t('common.dataQuality')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-2.5 py-1.5">{processNameById[r.process_id]}</td>
                  <td className="px-2.5 py-1.5">{labelOf(r.vocabulary_id)}</td>
                  <td className="px-2.5 py-1.5 text-right">{formatNumber(r.q_fu, lang)}</td>
                  <td className="px-2.5 py-1.5">{r.unit}</td>
                  <td className="px-2.5 py-1.5 text-right font-semibold">
                    {formatNumber(r.impacts[code], lang)}
                  </td>
                  <td className="px-2.5 py-1.5 text-right">{formatPercent(r.shares[code], lang)}</td>
                  <td className="px-2.5 py-1.5">{t(`quality.${r.data_quality}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card className="mt-5">
        <CardHeader><h3 className="text-[19px]">{t('step4.dataQualityPanel')}</h3></CardHeader>
        <CardBody>
          <h4 className="text-[16px]">{t('step4.qualityShare')}</h4>
          <div className="mt-3 space-y-4">
            {results.indicators.map((c) => (
              <div key={c}>
                <p className="m-0 mb-1 text-[15px] font-semibold">{t(`indicators.${c}`)}</p>
                <StackedQualityBar shares={results.qualityShares[c]} />
              </div>
            ))}
          </div>

          <h4 className="mt-6 text-[16px]">
            {t('step4.processBadges')} — {t(`indicators.${code}`)}
          </h4>
          <ul className="m-0 mt-2 flex list-none flex-wrap gap-2 p-0">
            {results.processes.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-brand border border-line bg-surface px-3 py-1.5">
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

      <Card className="mt-5">
        <CardBody>
          <Button
            type="button"
            variant="quiet"
            aria-expanded={limitationsOpen}
            onClick={() => setLimitationsOpen(!limitationsOpen)}
          >
            {limitationsOpen ? t('step4.hideLimitations') : t('step4.showLimitations')}
          </Button>
          {limitationsOpen ? (
            <>
              <h3 className="mt-3 text-[19px]">{t('step4.limitations')}</h3>
              <ol className="mt-2 max-w-prose space-y-1.5 pl-5">
                {(Array.isArray(t('limitations')) ? t('limitations') : []).map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ol>
              <p className="mt-4 max-w-prose font-semibold text-action">{t('disclaimer')}</p>
            </>
          ) : null}
        </CardBody>
      </Card>
    </div>
  )
}
