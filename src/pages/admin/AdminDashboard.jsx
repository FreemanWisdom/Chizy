import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  Sparkles,
  FolderTree,
  Eye,
  Plus,
  ArrowRight,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { formatNaira } from '../../config/currency'
import { getProductImageUrl } from '../../lib/imageUtils'
import { Badge } from '../../components/common/Badge'

export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    publishedProducts: 0,
    featuredProducts: 0,
    categoriesCount: 0,
  })
  const [recentProducts, setRecentProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const queryStatsAndRecent = async () => {
    try {
      // 1. Total products count
      const { count: totalCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      // 2. Published products count
      const { count: pubCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true)

      // 3. Featured products count
      const { count: featCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_featured', true)

      // 4. Categories count
      const { count: catCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })

      // 5. Recent products list (top 5)
      const { data: recent } = await supabase
        .from('products')
        .select(`
          id,
          name,
          slug,
          price,
          is_published,
          is_featured,
          created_at,
          categories ( name ),
          product_images ( id, storage_path, sort_order )
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      return {
        stats: {
          totalProducts: totalCount || 0,
          publishedProducts: pubCount || 0,
          featuredProducts: featCount || 0,
          categoriesCount: catCount || 0,
        },
        recent: recent || [],
      }
    } catch (err) {
      console.error('Error fetching admin dashboard stats:', err)
      return null
    }
  }

  const fetchDashboardData = async () => {
    setLoading(true)
    const result = await queryStatsAndRecent()
    if (result) {
      setStats(result.stats)
      setRecentProducts(result.recent)
    }
    setLoading(false)
  }

  useEffect(() => {
    let isMounted = true

    queryStatsAndRecent().then((result) => {
      if (isMounted) {
        if (result) {
          setStats(result.stats)
          setRecentProducts(result.recent)
        }
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="space-y-8">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Boutique Overview
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Real-time catalogue statistics and inventory management for Mimiandwizzy Boutique.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-stone-300 rounded-sm bg-white hover:bg-stone-50 text-stone-700 transition-colors"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#dec07e]" />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Products */}
        <div className="bg-white p-5 rounded-sm border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-stone-500">
              Total Products
            </span>
            <div className="p-2 rounded-full bg-stone-100 text-stone-700">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-stone-900 font-serif">
            {loading ? '...' : stats.totalProducts}
          </div>
          <p className="text-[11px] text-stone-400">All registered catalogue items</p>
        </div>

        {/* Published Products */}
        <div className="bg-white p-5 rounded-sm border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-stone-500">
              Published Live
            </span>
            <div className="p-2 rounded-full bg-emerald-50 text-emerald-700">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-800 font-serif">
            {loading ? '...' : stats.publishedProducts}
          </div>
          <p className="text-[11px] text-stone-400">Visible to customers online</p>
        </div>

        {/* Featured Products */}
        <div className="bg-white p-5 rounded-sm border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-stone-500">
              Featured Pieces
            </span>
            <div className="p-2 rounded-full bg-amber-50 text-amber-700">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-800 font-serif">
            {loading ? '...' : stats.featuredProducts}
          </div>
          <p className="text-[11px] text-stone-400">Highlighted on homepage</p>
        </div>

        {/* Categories */}
        <div className="bg-white p-5 rounded-sm border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-stone-500">
              Categories
            </span>
            <div className="p-2 rounded-full bg-stone-100 text-stone-700">
              <FolderTree className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-stone-900 font-serif">
            {loading ? '...' : stats.categoriesCount}
          </div>
          <p className="text-[11px] text-stone-400">Organized product sections</p>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/admin/products/new"
          className="group bg-stone-900 text-stone-100 p-5 rounded-sm border border-stone-800 hover:bg-stone-800 transition-colors space-y-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-[#dec07e] font-semibold">
              Catalogue Action
            </span>
            <Plus className="w-4 h-4 text-[#dec07e]" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-white">
              Add New Product
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              Create a new piece, set price in Naira, assign category, and upload images.
            </p>
          </div>
          <div className="pt-2 text-xs text-[#dec07e] font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Open Creator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to="/admin/categories"
          className="group bg-white text-stone-900 p-5 rounded-sm border border-stone-200 hover:border-stone-400 transition-colors space-y-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-stone-400 font-semibold">
              Taxonomy
            </span>
            <FolderTree className="w-4 h-4 text-stone-500" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-900">
              Manage Categories
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Create collections, rename categories, or activate/deactivate sections.
            </p>
          </div>
          <div className="pt-2 text-xs text-stone-900 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>View Categories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to="/"
          target="_blank"
          className="group bg-white text-stone-900 p-5 rounded-sm border border-stone-200 hover:border-stone-400 transition-colors space-y-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-stone-400 font-semibold">
              Preview
            </span>
            <ExternalLink className="w-4 h-4 text-stone-500" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-900">
              Customer Storefront
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              View the boutique live as customers experience it, including WhatsApp order flows.
            </p>
          </div>
          <div className="pt-2 text-xs text-stone-900 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Open in New Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* Recent Products Table */}
      <div className="bg-white rounded-sm border border-stone-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-stone-900">
              Recently Created Pieces
            </h2>
            <p className="text-xs text-stone-500">
              Latest items added to the boutique catalogue.
            </p>
          </div>
          <Link
            to="/admin/products"
            className="text-xs font-semibold uppercase tracking-wider text-[#b08d5b] hover:text-stone-950 transition-colors"
          >
            View All Products &rarr;
          </Link>
        </div>

        {recentProducts.length === 0 ? (
          <div className="p-8 text-center text-stone-500 text-xs">
            No products have been added yet. Click &quot;Add Product&quot; to begin building the boutique catalogue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 border-b border-stone-200 text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
                <tr>
                  <th className="px-6 py-3">Piece</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recentProducts.map((item) => {
                  const sortedImgs = [...(item.product_images || [])].sort(
                    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
                  )
                  const thumb = sortedImgs[0]?.storage_path
                    ? getProductImageUrl(sortedImgs[0].storage_path)
                    : null

                  return (
                    <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="px-6 py-3.5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xs bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                          {thumb ? (
                            <img src={thumb} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400 font-serif">
                              C
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-stone-900 line-clamp-1">{item.name}</p>
                          <p className="text-[11px] text-stone-400 font-mono">/{item.slug}</p>
                        </div>
                      </td>

                      <td className="px-6 py-3.5">
                        <Badge variant="category" size="sm">
                          {item.categories?.name || 'Uncategorized'}
                        </Badge>
                      </td>

                      <td className="px-6 py-3.5 font-semibold text-stone-900">
                        {formatNaira(item.price)}
                      </td>

                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Badge variant={item.is_published ? 'published' : 'draft'} size="sm">
                            {item.is_published ? 'Published' : 'Draft'}
                          </Badge>
                          {item.is_featured && (
                            <Badge variant="featured" size="sm">
                              Featured
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-3.5 text-right space-x-2">
                        <Link
                          to={`/admin/products/${item.id}/edit`}
                          className="font-semibold text-stone-800 hover:text-stone-950 underline underline-offset-2"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
