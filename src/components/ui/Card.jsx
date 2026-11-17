import { cn } from '../../lib/cn.js'

export default function Card({ as: Tag = 'div', className, children, tone = 'plain' }) {
  return (
    <Tag className={cn(
      'rounded-brand border border-line',
      tone === 'alt' ? 'bg-surface-alt' : 'bg-surface',
      className,
    )}>
      {children}
    </Tag>
  )
}

export function CardHeader({ children, className }) {
  return <div className={cn('border-b border-line px-5 py-3.5', className)}>{children}</div>
}

export function CardBody({ children, className }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>
}
