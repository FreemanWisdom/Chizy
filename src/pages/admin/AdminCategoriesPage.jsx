import { useState, useEffect } from 'react'
import {
  Plus,
  FolderTree,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { generateSlug, ensureUniqueCategorySlug } from '../../lib/slugUtils'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState(null)

  // Create / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [isSlugManual, setIsSlugManual] = useState(false)
  const [saving, setSaving] = useState(false)

  // Delete Safety Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [associatedProductCount, setAssociatedProductCount] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchCategoryData = async () => {
    try {
      // 1. Fetch categories
      const { data: cats, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error

      // 2. Fetch product count per category
      const { data: prods } = await supabase
        .from('products')
        .select('category_id')

      const counts = {}
      ;(prods || []).forEach((p) => {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1
        }
      })

      const enriched = (cats || []).map((cat) => ({
        ...cat,
        productCount: counts[cat.id] || 0,
      }))

      return enriched
    } catch (err) {
      console.error('Error fetching categories:', err)
      return null
    }
  }

  const loadCategories = async () => {
    setLoading(true)
    const enriched = await fetchCategoryData()
    if (enriched) {
      setCategories(enriched)
    } else {
      setFeedback({ type: 'error', message: 'Failed to load categories.' })
    }
    setLoading(false)
  }

  useEffect(() => {
    let isMounted = true

    fetchCategoryData().then((enriched) => {
      if (isMounted) {
        if (enriched) {
          setCategories(enriched)
        } else {
          setFeedback({ type: 'error', message: 'Failed to load categories.' })
        }
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  // Open modal for new category
  const handleOpenCreateModal = () => {
    setEditingCategory(null)
    setFormName('')
    setFormSlug('')
    setFormDescription('')
    setFormIsActive(true)
    setIsSlugManual(false)
    setModalOpen(true)
  }

  // Open modal for editing category
  const handleOpenEditModal = (cat) => {
    setEditingCategory(cat)
    setFormName(cat.name)
    setFormSlug(cat.slug)
    setFormDescription(cat.description || '')
    setFormIsActive(cat.is_active)
    setIsSlugManual(true)
    setModalOpen(true)
  }

  // Handle name change with auto slug
  const handleNameChange = (e) => {
    const val = e.target.value
    setFormName(val)
    if (!isSlugManual) {
      setFormSlug(generateSlug(val))
    }
  }

  // Submit Category Form (Create or Update)
  const handleSaveCategory = async (e) => {
    e.preventDefault()
    if (!formName.trim()) {
      setFeedback({ type: 'error', message: 'Category name is required.' })
      return
    }

    try {
      setSaving(true)
      const uniqueSlug = await ensureUniqueCategorySlug(
        supabase,
        formSlug || formName,
        editingCategory?.id
      )

      const payload = {
        name: formName.trim(),
        slug: uniqueSlug,
        description: formDescription.trim() || null,
        is_active: formIsActive,
        updated_at: new Date().toISOString(),
      }

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editingCategory.id)

        if (error) throw error
        setFeedback({ type: 'success', message: 'Category updated successfully.' })
      } else {
        const { error } = await supabase.from('categories').insert(payload)
        if (error) throw error
        setFeedback({ type: 'success', message: 'Category created successfully.' })
      }

      setModalOpen(false)
      loadCategories()
    } catch (err) {
      console.error('Error saving category:', err)
      setFeedback({ type: 'error', message: err.message || 'Failed to save category.' })
    } finally {
      setSaving(false)
    }
  }

  // Quick toggle active status
  const handleToggleActive = async (cat) => {
    try {
      const nextStatus = !cat.is_active
      const { error } = await supabase
        .from('categories')
        .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', cat.id)

      if (error) throw error

      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: nextStatus } : c))
      )
      setFeedback({
        type: 'success',
        message: `Category "${cat.name}" is now ${nextStatus ? 'Active' : 'Inactive'}.`,
      })
    } catch (err) {
      console.error('Error toggling category status:', err)
      setFeedback({ type: 'error', message: 'Failed to toggle category status.' })
    }
  }

  // Safe delete prompt
  const handlePromptDelete = async (cat) => {
    setCategoryToDelete(cat)
    setAssociatedProductCount(cat.productCount || 0)
    setDeleteModalOpen(true)
  }

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return
    try {
      setIsDeleting(true)
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryToDelete.id)

      if (error) throw error

      setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id))
      setFeedback({
        type: 'success',
        message: `Category "${categoryToDelete.name}" was deleted.`,
      })
      setDeleteModalOpen(false)
      setCategoryToDelete(null)
    } catch (err) {
      console.error('Error deleting category:', err)
      setFeedback({ type: 'error', message: err.message || 'Failed to delete category.' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Category Management
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Organize boutique collections and toggle display visibility in the storefront.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadCategories}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-stone-300 rounded-sm bg-white hover:bg-stone-50 text-stone-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleOpenCreateModal}
            icon={Plus}
          >
            Add Category
          </Button>
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
            className="text-stone-400 hover:text-stone-700 font-semibold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Categories Table */}
      <div className="bg-white rounded-sm border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400 text-xs">
            Loading categories from database...
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FolderTree className="w-8 h-8 mx-auto text-stone-400 stroke-1" />
            <p className="font-serif text-lg font-bold text-stone-900">
              No categories created yet
            </p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Create categories like &quot;Ready-to-Wear&quot;, &quot;Ankara Silhouettes&quot;, or &quot;Evening Gowns&quot; to organize boutique pieces.
            </p>
            <div className="pt-2">
              <Button variant="primary" size="sm" onClick={handleOpenCreateModal} icon={Plus}>
                Create First Category
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 border-b border-stone-200 text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
                <tr>
                  <th className="px-6 py-3">Category Name</th>
                  <th className="px-6 py-3">Slug</th>
                  <th className="px-6 py-3">Assigned Products</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-semibold text-stone-900">{cat.name}</p>
                      {cat.description && (
                        <p className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                          {cat.description}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-3.5 font-mono text-stone-500 text-[11px]">
                      {cat.slug}
                    </td>

                    <td className="px-6 py-3.5">
                      <span className="font-semibold text-stone-900">
                        {cat.productCount}
                      </span>{' '}
                      <span className="text-stone-400">
                        {cat.productCount === 1 ? 'piece' : 'pieces'}
                      </span>
                    </td>

                    <td className="px-6 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(cat)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                          cat.is_active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                        }`}
                        title="Click to toggle category active status"
                      >
                        {cat.is_active ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-stone-500" />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-6 py-3.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(cat)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-sm transition-colors"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePromptDelete(cat)}
                        className="inline-flex items-center p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-sm transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create New Category'}
        description="Categories group your pieces on the storefront and enable customer filtering."
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div>
            <label
              htmlFor="category-name"
              className="block text-xs uppercase tracking-wider font-semibold text-stone-700 mb-1"
            >
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="category-name"
              type="text"
              required
              value={formName}
              onChange={handleNameChange}
              placeholder="e.g. Ankara Silhouettes"
              className="w-full bg-stone-50 border border-stone-300 rounded-sm px-3.5 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          <div>
            <label
              htmlFor="category-slug"
              className="block text-xs uppercase tracking-wider font-semibold text-stone-700 mb-1"
            >
              URL Slug <span className="text-rose-500">*</span>
            </label>
            <input
              id="category-slug"
              type="text"
              required
              value={formSlug}
              onChange={(e) => {
                setIsSlugManual(true)
                setFormSlug(generateSlug(e.target.value))
              }}
              placeholder="ankara-silhouettes"
              className="w-full bg-stone-50 border border-stone-300 rounded-sm px-3.5 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          <div>
            <label
              htmlFor="category-desc"
              className="block text-xs uppercase tracking-wider font-semibold text-stone-700 mb-1"
            >
              Description (Optional)
            </label>
            <textarea
              id="category-desc"
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Brief summary of this collection..."
              className="w-full bg-stone-50 border border-stone-300 rounded-sm p-3 text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="w-4 h-4 rounded-xs text-stone-900 border-stone-300 focus:ring-stone-900"
              />
              <span className="text-xs font-semibold text-stone-800">
                Active Category (visible in customer filter pills)
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={saving}>
              {editingCategory ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Safe Delete Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Category"
        description="Verify consequences before deleting boutique categories."
      >
        <div className="space-y-4">
          {associatedProductCount > 0 ? (
            <div className="p-4 rounded-sm bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Notice: {associatedProductCount} piece(s) linked</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                There are currently <strong>{associatedProductCount}</strong> boutique piece(s) assigned to &quot;{categoryToDelete?.name}&quot;. 
                Deleting this category will set those products&apos; category to unassigned (<code className="font-mono text-amber-900">null</code>).
              </p>
              <p className="text-[11px] text-amber-800 font-medium">
                Recommendation: You can deactivate this category instead to hide it from customer filters while keeping pieces categorized.
              </p>
            </div>
          ) : (
            <p className="text-xs text-stone-600">
              Are you sure you want to delete category &quot;{categoryToDelete?.name}&quot;? No products are currently assigned to it.
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            {associatedProductCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  if (categoryToDelete) {
                    await handleToggleActive(categoryToDelete)
                    setDeleteModalOpen(false)
                  }
                }}
              >
                Deactivate Instead
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              loading={isDeleting}
            >
              Delete Category
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
