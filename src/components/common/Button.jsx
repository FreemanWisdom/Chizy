import { Loader2 } from 'lucide-react'

export function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  onClick,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-sm'

  const variants = {
    primary:
      'bg-stone-900 text-stone-50 hover:bg-stone-800 active:bg-stone-950 focus:ring-stone-900 shadow-sm',
    gold:
      'bg-[#C5A880] text-stone-950 hover:bg-[#b08d5b] active:bg-[#936f45] focus:ring-[#C5A880] shadow-sm font-semibold',
    secondary:
      'bg-stone-100 text-stone-900 hover:bg-stone-200 active:bg-stone-300 focus:ring-stone-400',
    outline:
      'border border-stone-300 text-stone-800 bg-transparent hover:bg-stone-50 hover:border-stone-400 active:bg-stone-100 focus:ring-stone-400',
    ghost:
      'text-stone-700 hover:bg-stone-100 hover:text-stone-900 focus:ring-stone-300',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus:ring-rose-500 shadow-sm',
    whatsapp:
      'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus:ring-emerald-500 shadow-sm',
  }

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 tracking-wide',
    md: 'text-sm px-4 py-2.5 gap-2 tracking-wide',
    lg: 'text-base px-6 py-3.5 gap-2.5 tracking-wide uppercase font-semibold text-xs',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>Please wait...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 shrink-0" />}
          {children}
        </>
      )}
    </button>
  )
}
