export function SkeletonCard() {
  return (
    <div className="bg-white rounded-sm border border-stone-200/80 overflow-hidden animate-pulse">
      <div className="w-full aspect-3/4 bg-stone-200" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-1/3 bg-stone-200 rounded-sm" />
        <div className="h-5 w-4/5 bg-stone-200 rounded-sm" />
        <div className="h-4 w-1/4 bg-stone-200 rounded-sm pt-2" />
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonDetail() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 animate-pulse">
      <div className="space-y-4">
        <div className="aspect-3/4 bg-stone-200 rounded-sm w-full" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square bg-stone-200 rounded-sm" />
          ))}
        </div>
      </div>
      <div className="space-y-6">
        <div className="h-4 w-24 bg-stone-200 rounded-sm" />
        <div className="h-10 w-3/4 bg-stone-200 rounded-sm" />
        <div className="h-8 w-32 bg-stone-200 rounded-sm" />
        <div className="space-y-2 pt-4 border-t border-stone-200">
          <div className="h-4 w-full bg-stone-200 rounded-sm" />
          <div className="h-4 w-5/6 bg-stone-200 rounded-sm" />
          <div className="h-4 w-4/6 bg-stone-200 rounded-sm" />
        </div>
        <div className="h-12 w-full bg-stone-200 rounded-sm mt-8" />
      </div>
    </div>
  )
}
