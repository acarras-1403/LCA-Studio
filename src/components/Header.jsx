import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n.jsx'
import { useTheme } from '../lib/theme.jsx'
import { cn } from '../lib/cn.js'

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="sr-only">{label}</span>
      <div role="group" aria-label={label} className="flex overflow-hidden rounded-brand border border-line">
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={cn(
                'px-2.5 py-1 text-[15px] font-semibold transition-colors',
                active ? 'bg-action text-action-fg' : 'bg-surface text-action hover:bg-surface-alt',
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Header() {
  const { t, lang, setLang } = useI18n()
  const { theme, setTheme } = useTheme()
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-baseline gap-3">
          <Link to="/" className="font-serif text-[26px] font-semibold text-action no-underline hover:text-action-hover">
            {t('app.name')}
          </Link>
          <span className="hidden text-[15px] text-text-meta sm:inline">{t('app.wordmark')}</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-[15px] font-semibold">{t('app.home')}</Link>
          <Segmented
            label={t('app.language')}
            value={lang}
            onChange={setLang}
            options={[{ value: 'en', label: 'EN' }, { value: 'es', label: 'ES' }]}
          />
          <Segmented
            label={t('app.theme')}
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: t('app.themeLight') },
              { value: 'dark', label: t('app.themeDark') },
            ]}
          />
        </div>
      </div>
    </header>
  )
}
