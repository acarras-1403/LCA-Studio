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

/**
 * Pills that scroll sideways on a phone, a bordered tab row once there is
 * room. The phone version used to wrap onto two lines and push the results off
 * the first screen.
 */
export default function Stepper({ studyId, reachable }) {
  const { t } = useI18n()
  const { pathname } = useLocation()

  return (
    <nav aria-label={t('stepper.step')} className="mb-5 sm:mb-6 sm:border-b sm:border-line">
      <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:gap-1 sm:px-0 sm:pb-0">
        {STEPS.map((s) => {
          const to = `/studies/${studyId}/${s.slug}`
          const active = pathname === to
          const open = s.n <= reachable
          const content = (
            <span className="flex items-center gap-2">
              <span className={cn(
                'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold sm:h-6 sm:w-6 sm:text-[14px]',
                active ? 'border-action bg-action text-action-fg'
                  : open ? 'border-action text-action' : 'border-line text-text-meta',
              )}>
                {s.n}
              </span>
              <span className="whitespace-nowrap">{t(s.key)}</span>
            </span>
          )
          const base = [
            'block shrink-0 rounded-full border px-3 py-2 text-[14px] font-semibold no-underline',
            'sm:rounded-none sm:border-0 sm:border-b-2 sm:px-3 sm:py-2.5 sm:text-[15px]',
          ].join(' ')

          if (!open) {
            return (
              <li key={s.n}>
                <span
                  aria-disabled="true"
                  title={t('stepper.locked')}
                  className={cn(base, 'cursor-not-allowed border-line text-text-meta sm:border-transparent')}
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
                  active
                    ? 'border-action bg-action text-action-fg sm:bg-transparent sm:text-action'
                    : 'border-line text-text-main hover:border-sage sm:border-transparent',
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
