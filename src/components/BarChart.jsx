import { useI18n } from '../lib/i18n.jsx'
import { formatNumber, formatPercent } from '../lib/format.js'

/**
 * Horizontal bars, one per process in chain order. Granate fill, sage-light
 * track, value and share printed beside each bar. No gridlines or shadows.
 * @param items [{ label, value, share, noData }]
 */
export default function BarChart({ items, unit, max }) {
  const { lang, t } = useI18n()
  const peak = max ?? items.reduce((m, i) => Math.max(m, i.value || 0), 0)
  return (
    <ul className="m-0 list-none space-y-3 p-0">
      {items.map((item, i) => {
        const pct = peak > 0 ? Math.max(0, (item.value / peak) * 100) : 0
        return (
          <li key={i}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="font-semibold text-text-main">
                <span className="mr-1.5 text-text-meta">{i + 1}</span>{item.label}
              </span>
              <span className="text-[15px] text-text-meta">
                {item.noData ? t('common.noData') : (
                  <>
                    <span className="font-semibold text-text-main">{formatNumber(item.value, lang)}</span>
                    {' '}{unit}
                    <span className="ml-2">{formatPercent(item.share, lang)}</span>
                  </>
                )}
              </span>
            </div>
            <div className="mt-1 h-3.5 w-full overflow-hidden rounded-brand bg-surface-alt">
              {item.noData ? null : (
                <div
                  className="h-full rounded-brand bg-action"
                  style={{ width: `${pct}%`, minWidth: item.value > 0 ? '2px' : 0 }}
                />
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
