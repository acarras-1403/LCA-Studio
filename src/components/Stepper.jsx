import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../lib/i18n.jsx'
import { cn } from '../lib/cn.js'

const STEPS = [
  { n: 1, slug: 'scope', key: 'stepper.s1' },
  { n: 2, slug: 'chain', key: 'stepper.s2' },
  { n: 3, slug: 'data', key: 'stepper.s3' },
  { n: 4, slug: 'results', key: 'stepper.s4' },
]

/** A step is reachable only when the previous one is complete. */
export function highestReachableStep(study, processCount, rowCount) {
  if (!study) return 1
  let step = 1
  if (study.annual_production > 0 || processCount > 0) step = 2
  if (processCount > 0) step = 3
  if (rowCount > 0) step = 4
  return step
}

export default function Stepper({ studyId, reachable }) {
  const { t } = useI18n()
  const { pathname } = useLocation()
  return (
    <nav aria-label={t('stepper.step')} className="mb-6 border-b border-line">
      <ol className="flex flex-wrap gap-x-1 gap-y-2">
        {STEPS.map((s) => {
          const to = `/studies/${studyId}/${s.slug}`
          const active = pathname === to
          const open = s.n <= reachable
          const content = (
            <span className="flex items-center gap-2">
              <span className={cn(
                'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[14px] font-semibold',
                active ? 'border-action bg-action text-action-fg'
                  : open ? 'border-action text-action' : 'border-line text-text-meta',
              )}>
                {s.n}
              </span>
              <span className="whitespace-nowrap">{t(s.key)}</span>
            </span>
          )
          const base = 'block border-b-2 px-3 py-2.5 text-[15px] font-semibold no-underline'
          if (!open) {
            return (
              <li key={s.n}>
                <span
                  aria-disabled="true"
                  title={t('stepper.locked')}
                  className={cn(base, 'cursor-not-allowed border-transparent text-text-meta')}
                >
                  {content}
                </span>
              </li>
            )
          }
          return (
            <li key={s.n}>
              <Link
                to={to}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  base,
                  active ? 'border-action text-action' : 'border-transparent text-text-main hover:border-sage',
                )}
              >
                {content}
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
