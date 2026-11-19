import { useI18n } from '../lib/i18n.jsx'
import { formatNumber, formatPercent } from '../lib/format.js'
import { stageFill } from '../lib/palette.js'

const SIZE = 200
const RADIUS = 70
const STROKE = 34
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Contribution by life cycle stage, as a ring with the total in the middle.
 * Segments are drawn largest first, so the eye lands on what matters.
 *
 * @param slices [{ id, label, position, value, share }] already filtered
 * @param total  the number printed in the middle
 */
export default function DonutChart({ slices, total, unit, perUnitLabel, title }) {
  const { t, lang } = useI18n()
  const positive = slices.filter((s) => s.value > 0)
  const sum = positive.reduce((a, s) => a + s.value, 0)

  let offset = 0
  const segments = positive.map((s) => {
    const length = sum > 0 ? (s.value / sum) * CIRCUMFERENCE : 0
    const seg = { ...s, length, offset }
    offset += length
    return seg
  })

  const description = positive.length
    ? positive.map((s) => `${s.label} ${formatPercent(s.share, lang)}`).join(', ')
    : t('step4.noDataTitle')

  return (
    <figure className="m-0 flex flex-col items-center gap-2">
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-auto w-full max-w-[260px]"
      role="img"
      aria-label={`${title}. ${description}`}
    >
      <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`} fill="none" strokeWidth={STROKE}>
        {sum > 0 ? segments.map((s) => (
          <circle
            key={s.id}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={stageFill(s.position)}
            strokeDasharray={`${s.length} ${CIRCUMFERENCE}`}
            strokeDashoffset={-s.offset}
          />
        )) : (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="var(--nodata)"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          />
        )}
      </g>
      {/* Only the number and its unit fit inside the ring; the rest is a caption. */}
      <text
        x={SIZE / 2} y={SIZE / 2 + 2} textAnchor="middle"
        className="fill-[var(--action)] font-serif text-[30px] font-semibold"
      >
        {formatNumber(total, lang)}
      </text>
      <text x={SIZE / 2} y={SIZE / 2 + 22} textAnchor="middle" className="fill-[var(--text-meta)] text-[12px]">
        {unit}
      </text>
    </svg>
    <figcaption className="text-[13px] text-text-meta">{perUnitLabel}</figcaption>
    </figure>
  )
}
