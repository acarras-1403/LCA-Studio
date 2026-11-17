import { useI18n } from '../lib/i18n.jsx'
import { CHAIN_GEOMETRY, layoutChain, wrapLabel } from './chainLayout.js'

/**
 * @param items [{ name, fill, textColor, caption, muted }]
 */
export default function ChainDiagram({ items, title, showFlowLabels = false, idPrefix = 'chain' }) {
  const { t } = useI18n()
  const { boxes, width, height, geo } = layoutChain(items.length)
  const arrowId = `${idPrefix}-arrow`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={title}
      style={{ maxWidth: width > 760 ? '100%' : `${width}px` }}
    >
      <defs>
        <marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)" />
        </marker>
      </defs>

      {boxes.map((b, i) => {
        const item = items[i]
        const lines = wrapLabel(item.name)
        const next = boxes[i + 1]
        const sameRow = next && next.row === b.row
        return (
          <g key={i}>
            {sameRow ? (
              <line
                x1={b.x + b.w + 6} y1={b.y + b.h / 2}
                x2={next.x - 6} y2={next.y + next.h / 2}
                stroke="var(--accent)" strokeWidth="2" markerEnd={`url(#${arrowId})`}
              />
            ) : null}
            {next && !sameRow ? (
              <path
                d={`M ${b.x + b.w / 2} ${b.y + b.h + 8} V ${b.y + b.h + geo.rowGap / 2}
                    H ${next.x + next.w / 2} V ${next.y - 8}`}
                fill="none" stroke="var(--accent)" strokeWidth="2"
                markerEnd={`url(#${arrowId})`}
              />
            ) : null}

            {showFlowLabels ? (
              <>
                <line x1={b.x + b.w / 2} y1={b.y - 18} x2={b.x + b.w / 2} y2={b.y - 4}
                  stroke="var(--accent)" strokeWidth="1.5" markerEnd={`url(#${arrowId})`} />
                <text x={b.x + b.w / 2} y={b.y - 22} textAnchor="middle"
                  fontSize="11" fill="var(--text-meta)">{t('step2.inputs')}</text>
                <line x1={b.x + b.w / 2} y1={b.y + b.h + 4} x2={b.x + b.w / 2} y2={b.y + b.h + 18}
                  stroke="var(--accent)" strokeWidth="1.5" markerEnd={`url(#${arrowId})`} />
                <text x={b.x + b.w / 2} y={b.y + b.h + 31} textAnchor="middle"
                  fontSize="11" fill="var(--text-meta)">{t('step2.outputs')}</text>
              </>
            ) : null}

            <rect
              x={b.x} y={b.y} width={b.w} height={b.h} rx="7"
              fill={item.fill || 'var(--surface)'}
              stroke={item.muted ? 'var(--line)' : 'var(--action)'}
              strokeWidth="1.5"
            />
            <text
              x={b.x + b.w / 2}
              y={b.y + b.h / 2 - (lines.length - 1) * 7 - (item.caption ? 7 : 0)}
              textAnchor="middle" fontSize="13" fontWeight="600"
              fill={item.textColor || 'var(--text-main)'}
            >
              {lines.map((l, li) => (
                <tspan key={li} x={b.x + b.w / 2} dy={li === 0 ? 0 : 15}>{l}</tspan>
              ))}
            </text>
            {item.caption ? (
              <text
                x={b.x + b.w / 2}
                y={b.y + b.h / 2 + (lines.length - 1) * 7 + 19}
                textAnchor="middle" fontSize="13" fontWeight="600"
                fill={item.textColor || 'var(--text-meta)'}
              >
                {item.caption}
              </text>
            ) : null}
            <text x={b.x + 7} y={b.y + 14} fontSize="11"
              fill={item.textColor || 'var(--text-meta)'} opacity="0.8">
              {i + 1}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
