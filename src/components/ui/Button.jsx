import { cn } from '../../lib/cn.js'

// Granate is the only action colour. Secondary buttons are outlined granate,
// quiet buttons are text-only. No gradients, no strong shadows.
const VARIANTS = {
  primary: 'bg-action text-action-fg border border-transparent hover:bg-action-hover',
  secondary: 'bg-transparent text-action border border-action hover:bg-action hover:text-action-fg',
  quiet: 'bg-transparent text-action border border-transparent hover:underline',
  danger: 'bg-action text-action-fg border border-transparent hover:bg-action-hover',
}
const SIZES = {
  sm: 'px-3 py-1.5 text-[15px]',
  md: 'px-4 py-2',
  lg: 'px-5 py-2.5',
  icon: 'h-8 w-8 p-0 text-[15px] justify-center',
}

export default function Button({
  as: Tag = 'button', variant = 'primary', size = 'md', className, ...props
}) {
  return (
    <Tag
      className={cn(
        'inline-flex items-center gap-2 rounded-brand font-sans font-semibold',
        'transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-action disabled:hover:text-action-fg',
        VARIANTS[variant], SIZES[size], className,
      )}
      {...props}
    />
  )
}
