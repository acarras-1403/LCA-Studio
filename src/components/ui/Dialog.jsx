import { useEffect, useRef } from 'react'
import Button from './Button.jsx'
import { useI18n } from '../../lib/i18n.jsx'

export default function Dialog({ open, onClose, title, children, footer, labelledBy = 'dialog-title' }) {
  const { t } = useI18n()
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const el = ref.current?.querySelector('input, select, textarea, button')
    el?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/55 px-4 py-10"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="w-full max-w-xl rounded-brand border border-line bg-surface"
      >
        <div className="border-b border-line px-5 py-3.5">
          <h2 id={labelledBy} className="text-[22px]">{title}</h2>
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5">
          {footer || <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>}
        </div>
      </div>
    </div>
  )
}
