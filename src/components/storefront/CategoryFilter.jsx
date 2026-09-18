export function CategoryFilter({
  categories = [],
  activeCategory = 'all',
  onSelectCategory,
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
      <button
        type="button"
        onClick={() => onSelectCategory('all')}
        className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold rounded-full transition-all shrink-0 select-none ${
          activeCategory === 'all'
            ? 'bg-stone-900 text-stone-50 shadow-xs'
            : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
        }`}
      >
        All Pieces
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelectCategory(cat.id)}
          className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold rounded-full transition-all shrink-0 select-none ${
            activeCategory === cat.id
              ? 'bg-stone-900 text-stone-50 shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
