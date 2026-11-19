import { useI18n } from '../lib/i18n.jsx'

/** Fictional-data banner. Spec requires it on every view. */
export default function Banner() {
  const { t } = useI18n()
  return (
    <div className="border-b border-line bg-surface-alt">
      <p className="mx-auto max-w-6xl px-4 py-1.5 text-[14px] font-semibold text-text-main sm:py-2 sm:text-[15px]">
        {t('app.banner')}
      </p>
    </div>
  )
}
