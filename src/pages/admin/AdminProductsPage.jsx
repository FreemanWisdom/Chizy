import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  Trash2,
  Edit,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  UploadCloud,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { formatNaira } from '../../config/currency'
import { getProductImageUrl, deleteMultipleImagesFromStorage } from '../../lib/imageUtils'
import { Badge } from '../../components/common/Badge'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'

export function AdminProductsPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'published', 'draft'

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const fetchProductsAndCategories = async () => {
    try {
      // 1. Categories
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')

      // 2. All products with images and categories
      const { data: prods, error } = await supabase
        .from('products')
        .select(`
          id,
          category_id,
          name,
          slug,
          price,
          is_published,
          is_featured,
          created_at,
          categories ( id, name ),
          product_images ( id, storage_path, sort_order )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { cats: cats || [], prods: prods || [] }
    } catch (err) {
      console.error('Error fetching admin products:', err)
      return null
    }
  }

  const loadData = async () => {
    setLoading(true)
    const result = await fetchProductsAndCategories()
    if (result) {
      setCategories(result.cats)
      setProducts(result.prods)
    } else {
      setFeedback({ type: 'error', message: 'Failed to load products list.' })
    }
    setLoading(false)
  }

  useEffect(() => {
    let isMounted = true

    fetchProductsAndCategories().then((result) => {
      if (isMounted) {
        if (result) {
          setCategories(result.cats)
          setProducts(result.prods)
        } else {
          setFeedback({ type: 'error', message: 'Failed to load products list.' })
        }
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  // Quick toggle is_published
  const handleTogglePublished = async (productId, currentStatus) => {
    try {
      const nextStatus = !currentStatus
      const { error } = await supabase
        .from('products')
        .update({ is_published: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', productId)

      if (error) throw error

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_published: nextStatus } : p))
      )
      setFeedback({
        type: 'success',
        message: `Product marked as ${nextStatus ? 'Published' : 'Draft'}.`,
      })
    } catch (err) {
      console.error('Error toggling publication:', err)
      setFeedback({ type: 'error', message: 'Failed to update publication status.' })
    }
  }

  // Quick toggle is_featured
  const handleToggleFeatured = async (productId, currentStatus) => {
    try {
      const nextStatus = !currentStatus
      const { error } = await supabase
        .from('products')
        .update({ is_featured: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', productId)

      if (error) throw error

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_featured: nextStatus } : p))
      )
      setFeedback({
        type: 'success',
        message: `Product ${nextStatus ? 'added to' : 'removed from'} featured pieces.`,
      })
    } catch (err) {
      console.error('Error toggling featured:', err)
      setFeedback({ type: 'error', message: 'Failed to update featured status.' })
    }
  }

  // Delete flow
  const promptDelete = (product) => {
    setProductToDelete(product)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!productToDelete) return
    try {
      setIsDeleting(true)

      // 1. Clean up associated storage files from Supabase Storage
      const storagePaths = (productToDelete.product_images || [])
        .map((img) => img.storage_path)
        .filter(Boolean)

      if (storagePaths.length > 0) {
        await deleteMultipleImagesFromStorage(storagePaths)
      }

      // 2. Delete product record from public.products (cascades to product_images)
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id)

      if (error) throw error

      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id))
      setFeedback({
        type: 'success',
        message: `"${productToDelete.name}" was permanently deleted along with its storage assets.`,
      })
      setDeleteModalOpen(false)
      setProductToDelete(null)
    } catch (err) {
      console.error('Error deleting product:', err)
      setFeedback({ type: 'error', message: err.message || 'Failed to delete product.' })
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtered in-memory list
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category_id !== selectedCategory) {
        return false
      }
      // Status filter
      if (statusFilter === 'published' && !item.is_published) return false
      if (statusFilter === 'draft' && item.is_published) return false

      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        const matchesName = item.name?.toLowerCase().includes(term)
        const matchesSlug = item.slug?.toLowerCase().includes(term)
        const matchesCat = item.categories?.name?.toLowerCase().includes(term)
        if (!matchesName && !matchesSlug && !matchesCat) return false
      }
      return true
    })
  }, [products, selectedCategory, statusFilter, searchTerm])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Product Management
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Create, edit, price, and manage boutique fashion pieces and photos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-stone-300 rounded-sm bg-white hover:bg-stone-50 text-stone-700 transition-colors"
            title="Refresh product list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin/products/bulk"
            className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors shadow-xs"
            title="Bulk upload multiple products at once"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#dec07e]" />
            <span>Bulk Upload</span>
          </Link>

          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#dec07e]" />
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-sm text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-stone-700 text-xs font-semibold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-sm border border-stone-200 shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search piece name or slug..."
            className="w-full bg-stone-50 border border-stone-300 rounded-sm pl-10 pr-4 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 focus:bg-white transition-colors"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-stone-50 border border-stone-300 rounded-sm px-3 py-2 text-xs text-stone-700 focus:outline-none focus:border-stone-900"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-stone-50 border border-stone-300 rounded-sm px-3 py-2 text-xs text-stone-700 focus:outline-none focus:border-stone-900"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published Only</option>
            <option value="draft">Draft Only</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-sm border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400 text-xs">
            Loading products from Supabase...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="font-serif text-lg font-bold text-stone-900">
              No products found
            </p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              No products match the active filters or search terms. Try clearing your filters or create a new piece.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
              <Link
                to="/admin/products/new"
                className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 px-4 py-2 text-xs uppercase tracking-wider font-semibold rounded-xs shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#dec07e]" />
                <span>Create Product</span>
              </Link>
              <Link
                to="/admin/products/bulk"
                className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 px-4 py-2 text-xs uppercase tracking-wider font-semibold rounded-xs transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5 text-[#dec07e]" />
                <span>Bulk Upload</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 border-b border-stone-200 text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
                <tr>
                  <th className="px-5 py-3">Piece Details</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">Published</th>
                  <th className="px-5 py-3">Featured</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.map((product) => {
                  const sortedImgs = [...(product.product_images || [])].sort(
                    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
                  )
                  const thumb = sortedImgs[0]?.storage_path
                    ? getProductImageUrl(sortedImgs[0].storage_path)
                    : null

                  return (
                    <tr key={product.id} className="hover:bg-stone-50/80 transition-colors">
                      {/* Product details & thumbnail */}
                      <td className="px-5 py-3 flex items-center gap-3">
                        <div className="w-12 h-14 rounded-xs bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 font-serif text-sm">
                              C
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-stone-900 truncate max-w-[200px] sm:max-w-[260px]">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-stone-400 font-mono">
                              /{product.slug}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              ({sortedImgs.length} {sortedImgs.length === 1 ? 'photo' : 'photos'})
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Badge variant="category" size="sm">
                          {product.categories?.name || 'Uncategorized'}
                        </Badge>
                      </td>

                      {/* Price in Naira */}
                      <td className="px-5 py-3 font-semibold text-stone-900 whitespace-nowrap">
                        {formatNaira(product.price)}
                      </td>

                      {/* Published Toggle */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleTogglePublished(product.id, product.is_published)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                            product.is_published
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                          }`}
                          title="Click to toggle publication"
                        >
                          {product.is_published ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Published</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-stone-500" />
                              <span>Draft</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Featured Toggle */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(product.id, product.is_featured)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                            product.is_featured
                              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                              : 'bg-stone-100 text-stone-400 hover:bg-stone-200 hover:text-stone-700'
                          }`}
                          title="Click to toggle featured collection status"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${product.is_featured ? 'text-amber-600' : 'text-stone-400'}`} />
                          <span>{product.is_featured ? 'Featured' : 'Standard'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3 text-right whitespace-nowrap space-x-2">
                        {product.is_published && (
                          <Link
                            to={`/product/${product.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-stone-400 hover:text-stone-800 inline-block"
                            title="View on storefront"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}

                        <Link
                          to={`/admin/products/${product.id}/edit`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-sm transition-colors"
                          title="Edit product"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => promptDelete(product)}
                          className="inline-flex items-center p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-sm transition-colors"
                          title="Delete product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Boutique Piece"
        description="Permanently remove this product from the database and delete all associated image files."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-sm bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 space-y-1">
              <p className="font-semibold">
                Are you sure you want to delete &quot;{productToDelete?.name}&quot;?
              </p>
              <p>
                This action is irreversible. All uploaded photos in the Supabase Storage bucket for this product will also be permanently removed.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={confirmDelete}
              loading={isDeleting}
            >
              Delete Product & Photos
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
