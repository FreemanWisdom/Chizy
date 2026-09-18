export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full tracking-wider uppercase'

  const variants = {
    default: 'bg-stone-100 text-stone-700 border border-stone-200',
    featured: 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold',
    published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    draft: 'bg-stone-100 text-stone-500 border border-stone-200',
    category: 'bg-stone-100 text-stone-800 border border-stone-200/80',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    gold: 'bg-[#faf5ee] text-[#84633b] border border-[#ecd6ab]',
  }

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-xs px-3 py-1.5',
  }

  return (
    <span className={`${baseStyles} ${variants[variant] || variants.default} ${sizes[size] || sizes.md} ${className}`}>
      {children}
    </span>
  )
}
