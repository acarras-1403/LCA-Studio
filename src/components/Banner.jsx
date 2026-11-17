import { useI18n } from '../lib/i18n.jsx'

/** Fictional-data banner. Spec requires it on every view. */
export default function Banner() {
  const { t } = useI18n()
  return (
    <div className="border-b border-line bg-surface-alt">
      <p className="mx-auto max-w-6xl px-4 py-2 text-[15px] font-semibold text-text-main">
        {t('app.banner')}
      </p>
    </div>
  )
}
