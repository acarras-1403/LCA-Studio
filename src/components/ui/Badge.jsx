import { cn } from '../../lib/cn.js'

// Only granate carries meaning; the scale is conveyed by fill strength plus
// the word itself, never by colour alone.
const TONES = {
  good: 'border-sage-dark text-text-muted bg-surface',
  fair: 'border-action text-action bg-surface',
  poor: 'border-transparent text-action-fg bg-action',
  neutral: 'border-line text-text-meta bg-surface-alt',
}

export default function Badge({ tone = 'neutral', className, children }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-brand border px-2 py-0.5 text-[14px] font-semibold',
      TONES[tone] || TONES.neutral, className,
    )}>
      {children}
    </span>
  )
}
