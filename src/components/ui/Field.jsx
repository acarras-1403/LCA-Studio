import { cn } from '../../lib/cn.js'

export function Label({ htmlFor, children, required, className }) {
  return (
    <label htmlFor={htmlFor} className={cn('block font-semibold text-text-main', className)}>
      {children}
      {required ? <span className="ml-1 text-action" aria-hidden="true">*</span> : null}
    </label>
  )
}

export function Help({ children, id }) {
  if (!children) return null
  return <p id={id} className="mt-1 max-w-prose text-[15px] text-text-meta">{children}</p>
}

export function FieldError({ children, id }) {
  if (!children) return null
  return <p id={id} role="alert" className="mt-1 text-[15px] font-semibold text-action">{children}</p>
}

const CONTROL = [
  'w-full rounded-brand border bg-surface px-3 py-2 text-text-main',
  'border-line focus:border-action',
  'disabled:bg-surface-alt disabled:text-text-meta disabled:cursor-not-allowed',
].join(' ')

export function Input({ className, invalid, ...props }) {
  return <input className={cn(CONTROL, invalid && 'border-action', className)} {...props} />
}

export function Select({ className, invalid, children, ...props }) {
  return (
    <select className={cn(CONTROL, 'pr-8', invalid && 'border-action', className)} {...props}>
      {children}
    </select>
  )
}

export function Field({ id, label, help, error, required, children, className }) {
  const helpId = help ? `${id}-help` : undefined
  const errId = error ? `${id}-error` : undefined
  return (
    <div className={cn('mb-5', className)}>
      <Label htmlFor={id} required={required}>{label}</Label>
      <div className="mt-1.5">{children({ id, describedBy: [helpId, errId].filter(Boolean).join(' ') || undefined })}</div>
      <Help id={helpId}>{help}</Help>
      <FieldError id={errId}>{error}</FieldError>
    </div>
  )
}

export function LockedValue({ label, value, help }) {
  return (
    <div className="mb-5">
      <span className="block font-semibold text-text-main">{label}</span>
      <div className="mt-1.5 flex items-center gap-2 rounded-brand border border-line bg-surface-alt px-3 py-2 text-text-main">
        <span>{value}</span>
      </div>
      <Help>{help}</Help>
    </div>
  )
}
