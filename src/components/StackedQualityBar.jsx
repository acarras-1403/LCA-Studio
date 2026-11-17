import { useI18n } from '../lib/i18n.jsx'
import { formatPercent } from '../lib/format.js'
import { DATA_QUALITY_LEVELS } from '../lib/indicators.js'

// Three levels, distinguished by fill strength of the single action colour plus
// a written legend, so the split never relies on colour alone.
const FILLS = {
  measured: 'var(--action)',
  calculated: 'var(--accent)',
  estimated: 'var(--surface-alt)',
}
const EDGE = {
  measured: 'var(--action)',
  calculated: 'var(--accent)',
  estimated: 'var(--line)',
}

export default function StackedQualityBar({ shares }) {
  const { t, lang } = useI18n()
  const any = DATA_QUALITY_LEVELS.some((l) => (shares?.[l]?.share ?? 0) > 0)
  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden rounded-brand border border-line bg-surface">
        {any ? DATA_QUALITY_LEVELS.map((level) => {
          const pct = shares?.[level]?.share ?? 0
          if (!(pct > 0)) return null
          return (
            <div
              key={level}
              title={`${t(`quality.${level}`)} ${formatPercent(pct, lang)}`}
              style={{ width: `${pct}%`, background: FILLS[level], borderRight: `1px solid ${EDGE[level]}` }}
            />
          )
        }) : null}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 p-0 text-[15px] text-text-meta">
        {DATA_QUALITY_LEVELS.map((level) => (
          <li key={level} className="flex list-none items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 rounded-sm border"
              style={{ background: FILLS[level], borderColor: EDGE[level] }}
            />
            <span>{t(`quality.${level}`)}</span>
            <span className="font-semibold text-text-main">
              {formatPercent(shares?.[level]?.share, lang)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
