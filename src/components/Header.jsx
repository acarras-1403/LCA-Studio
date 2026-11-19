import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n.jsx'
import { useTheme } from '../lib/theme.jsx'
import { cn } from '../lib/cn.js'

function Segmented({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex overflow-hidden rounded-brand border border-line">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            title={o.title || o.label}
            className={cn(
              'px-2.5 py-1.5 text-[14px] font-semibold transition-colors sm:text-[15px]',
              active ? 'bg-action text-action-fg' : 'bg-surface text-action hover:bg-surface-alt',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export default function Header() {
  const { t, lang, setLang } = useI18n()
  const { theme, setTheme } = useTheme()
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:py-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <Link
            to="/"
            className="shrink-0 font-serif text-[20px] font-semibold text-action no-underline hover:text-action-hover sm:text-[26px]"
          >
            {t('app.name')}
          </Link>
          <span className="hidden text-[15px] text-text-meta md:inline">{t('app.wordmark')}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <Link to="/" className="hidden text-[15px] font-semibold sm:inline">{t('app.home')}</Link>
          <Segmented
            label={t('app.language')}
            value={lang}
            onChange={setLang}
            options={[{ value: 'en', label: 'EN' }, { value: 'es', label: 'ES' }]}
          />
          {/* Sun and moon on a phone, words once there is room. */}
          <Segmented
            label={t('app.theme')}
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: <LightIcon />, title: t('app.themeLight') },
              { value: 'dark', label: <DarkIcon />, title: t('app.themeDark') },
            ]}
          />
        </div>
      </div>
    </header>
  )
}

function LightIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" role="img" aria-label="Light">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </svg>
  )
}

function DarkIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Dark">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </svg>
  )
}
