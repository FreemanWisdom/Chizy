import { ShoppingBag } from 'lucide-react'
import { ProductCard } from './ProductCard'
import { SkeletonGrid } from '../common/Skeleton'

export function ProductGrid({
  products = [],
  loading = false,
  emptyTitle = 'No boutique pieces found',
  emptyMessage = 'There are currently no published products matching this selection. Please check another category or check back soon.',
  onResetFilter,
}) {
  if (loading) {
    return <SkeletonGrid count={8} />
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-sm border border-stone-200 p-12 text-center max-w-md mx-auto my-12 space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
          <ShoppingBag className="w-7 h-7 stroke-1 text-stone-400" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif text-xl font-bold text-stone-900">
            {emptyTitle}
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            {emptyMessage}
          </p>
        </div>
        {onResetFilter && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onResetFilter}
              className="text-xs font-semibold uppercase tracking-wider text-[#b08d5b] hover:text-stone-900 transition-colors"
            >
              View All Collections &rarr;
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
