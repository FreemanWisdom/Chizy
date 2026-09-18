import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { CategoryFilter } from '../../components/storefront/CategoryFilter'
import { ProductGrid } from '../../components/storefront/ProductGrid'

export function CataloguePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedCategory = searchParams.get('category') || 'all'
  const isFeaturedParam = searchParams.get('featured') === 'true'

  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState(isFeaturedParam ? 'featured' : 'newest')

  // Load categories and products
  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        // 1. Fetch active categories
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('id, name, slug, description')
          .eq('is_active', true)
          .order('name')

        if (catError) console.error('Error fetching categories:', catError)
        if (isMounted) setCategories(catData || [])

        // 2. Fetch published products with relations
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select(`
            id,
            category_id,
            name,
            slug,
            description,
            price,
            is_published,
            is_featured,
            created_at,
            categories ( id, name, slug ),
            product_images ( id, storage_path, alt_text, sort_order )
          `)
          .eq('is_published', true)
          .order('created_at', { ascending: false })

        if (prodError) console.error('Error fetching products:', prodError)
        if (isMounted) setProducts(prodData || [])
      } catch (err) {
        console.error('Error loading catalogue:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  const handleCategorySelect = (catId) => {
    const newParams = new URLSearchParams(searchParams)
    if (catId === 'all') {
      newParams.delete('category')
    } else {
      newParams.set('category', catId)
    }
    setSearchParams(newParams)
  }

  // Filter and sort products in memory
  const filteredProducts = useMemo(() => {
    let list = [...products]

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category_id === selectedCategory)
    }

    // Search term filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          p.categories?.name?.toLowerCase().includes(term)
      )
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'price_asc') {
        return Number(a.price) - Number(b.price)
      }
      if (sortBy === 'price_desc') {
        return Number(b.price) - Number(a.price)
      }
      if (sortBy === 'featured') {
        if (a.is_featured === b.is_featured) {
          return new Date(b.created_at) - new Date(a.created_at)
        }
        return a.is_featured ? -1 : 1
      }
      // 'newest' default
      return new Date(b.created_at) - new Date(a.created_at)
    })

    return list
  }, [products, selectedCategory, searchTerm, sortBy])

  const handleResetFilters = () => {
    setSearchTerm('')
    setSortBy('newest')
    setSearchParams({})
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      {/* Header Banner */}
      <div className="border-b border-stone-200 pb-8 space-y-2">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#b08d5b] font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Mimiandwizzy Boutique Collection</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-950 tracking-tight">
          Boutique Catalogue
        </h1>
        <p className="text-stone-500 text-xs sm:text-sm max-w-xl font-light">
          Browse our boutique fashion pieces. Select any piece to view detailed photos, descriptions, and contact the boutique to place an order.
        </p>
      </div>

      {/* Controls Bar: Search, Category Pills, Sort */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search pieces, fabric, style..."
              className="w-full bg-white border border-stone-300 rounded-sm pl-10 pr-4 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <SlidersHorizontal className="w-4 h-4 text-stone-500 shrink-0" />
            <span className="text-xs text-stone-500 uppercase tracking-wider font-medium">
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-stone-300 rounded-sm px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 font-medium"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="featured">Featured First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="pt-2">
          <CategoryFilter
            categories={categories}
            activeCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
          />
        </div>
      </div>

      {/* Product Grid / Results */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-4 text-xs text-stone-500">
          <span>
            Showing <strong className="text-stone-900 font-semibold">{filteredProducts.length}</strong>{' '}
            {filteredProducts.length === 1 ? 'piece' : 'pieces'}
          </span>
          {(selectedCategory !== 'all' || searchTerm || sortBy !== 'newest') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-stone-600 hover:text-stone-950 underline underline-offset-2"
            >
              Reset filters
            </button>
          )}
        </div>

        <ProductGrid
          products={filteredProducts}
          loading={loading}
          emptyTitle="No items match your criteria"
          emptyMessage="Try adjusting your search or selecting a different category to view more pieces."
          onResetFilter={handleResetFilters}
        />
      </div>
    </div>
  )
}
