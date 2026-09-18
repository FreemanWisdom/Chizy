import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Upload,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import {
  uploadProductImage,
  getProductImageUrl,
  deleteProductImageFromStorage,
} from '../../lib/imageUtils'
import { generateSlug, ensureUniqueProductSlug } from '../../lib/slugUtils'
import { Button } from '../../components/common/Button'

export function AdminProductEditPage() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [isSlugManual, setIsSlugManual] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [isFeatured, setIsFeatured] = useState(false)

  // Associated images state
  const [images, setImages] = useState([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [newImageFiles, setNewImageFiles] = useState([])

  // Categories list
  const [categories, setCategories] = useState([])

  // Processing & feedback state
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  // Fetch categories and existing product details (if editing)
  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      try {
        setLoading(true)

        // 1. Fetch categories
        const { data: cats, error: catErr } = await supabase
          .from('categories')
          .select('id, name')
          .order('name')
        if (!catErr && isMounted) setCategories(cats || [])

        // 2. If editing, fetch product record
        if (isEditing) {
          const { data: prod, error: prodErr } = await supabase
            .from('products')
            .select(`
              id,
              name,
              slug,
              category_id,
              price,
              description,
              is_published,
              is_featured,
              product_images ( id, storage_path, alt_text, sort_order )
            `)
            .eq('id', id)
            .single()

          if (prodErr) throw prodErr

          if (isMounted && prod) {
            setName(prod.name)
            setSlug(prod.slug)
            setIsSlugManual(true)
            setCategoryId(prod.category_id || '')
            setPrice(prod.price)
            setDescription(prod.description || '')
            setIsPublished(prod.is_published)
            setIsFeatured(prod.is_featured)

            const sorted = [...(prod.product_images || [])].sort(
              (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
            )
            setImages(sorted)
          }
        }
      } catch (err) {
        console.error('Error loading product details:', err)
        if (isMounted) {
          setFeedback({ type: 'error', message: 'Could not load product details.' })
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initialize()

    return () => {
      isMounted = false
    }
  }, [id, isEditing])

  // Automatically update slug when name changes (unless user manually touched slug)
  const handleNameChange = (e) => {
    const newName = e.target.value
    setName(newName)
    if (!isSlugManual) {
      setSlug(generateSlug(newName))
    }
  }

  const handleSlugChange = (e) => {
    setIsSlugManual(true)
    setSlug(generateSlug(e.target.value))
  }

  // Handle image upload for an existing product
  const handleUploadImages = async (files) => {
    if (!id || files.length === 0) return
    try {
      setUploadingImages(true)
      const currentHighestSort = images.reduce(
        (max, img) => Math.max(max, img.sort_order ?? 0),
        -1
      )

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const { path, error: uploadErr } = await uploadProductImage(file, id)
        if (uploadErr) {
          console.error('Failed to upload file:', file.name, uploadErr)
          continue
        }

        // Insert row in public.product_images
        const nextSort = currentHighestSort + 1 + i
        const { data: imgRecord, error: dbErr } = await supabase
          .from('product_images')
          .insert({
            product_id: id,
            storage_path: path,
            alt_text: name,
            sort_order: nextSort,
          })
          .select()
          .single()

        if (dbErr) {
          console.error('Failed to insert product_images record:', dbErr)
          // Clean up uploaded file so we do not leave orphaned file in storage bucket
          await deleteProductImageFromStorage(path)
          continue
        }

        if (imgRecord) {
          setImages((prev) => [...prev, imgRecord])
        }
      }

      setFeedback({ type: 'success', message: 'Images uploaded successfully.' })
    } catch (err) {
      console.error('Error in handleUploadImages:', err)
      setFeedback({ type: 'error', message: 'Failed to upload one or more images.' })
    } finally {
      setUploadingImages(false)
    }
  }

  // Delete an image
  const handleDeleteImage = async (image) => {
    try {
      // 1. Remove from database
      const { error: dbErr } = await supabase
        .from('product_images')
        .delete()
        .eq('id', image.id)
      if (dbErr) throw dbErr

      // 2. Remove file from storage
      await deleteProductImageFromStorage(image.storage_path)

      setImages((prev) => prev.filter((img) => img.id !== image.id))
      setFeedback({ type: 'success', message: 'Image deleted.' })
    } catch (err) {
      console.error('Error deleting image:', err)
      setFeedback({ type: 'error', message: 'Could not delete image.' })
    }
  }

  // Move image order up/down
  const handleMoveImage = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= images.length) return

    const newImages = [...images]
    const currentItem = newImages[index]
    const swapItem = newImages[targetIndex]

    // Swap sort_order
    const tempSort = currentItem.sort_order ?? index
    currentItem.sort_order = swapItem.sort_order ?? targetIndex
    swapItem.sort_order = tempSort

    newImages[index] = swapItem
    newImages[targetIndex] = currentItem

    setImages(newImages)

    // Persist new sort_order to Supabase
    await Promise.all([
      supabase
        .from('product_images')
        .update({ sort_order: currentItem.sort_order })
        .eq('id', currentItem.id),
      supabase
        .from('product_images')
        .update({ sort_order: swapItem.sort_order })
        .eq('id', swapItem.id),
    ])
  }

  // Submit product form (Save / Update)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setFeedback(null)

    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'Product name is required.' })
      return
    }

    const numericPrice = parseFloat(price)
    if (isNaN(numericPrice) || numericPrice < 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid price in Naira.' })
      return
    }

    try {
      setSaving(true)

      // Ensure slug uniqueness
      const uniqueSlug = await ensureUniqueProductSlug(
        supabase,
        slug || name,
        isEditing ? id : null
      )

      const productPayload = {
        name: name.trim(),
        slug: uniqueSlug,
        category_id: categoryId || null,
        price: numericPrice,
        description: description.trim() || null,
        is_published: isPublished,
        is_featured: isFeatured,
        updated_at: new Date().toISOString(),
      }

      if (isEditing) {
        // Update product
        const { error } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', id)

        if (error) throw error

        setFeedback({ type: 'success', message: 'Product updated successfully.' })
      } else {
        // Create new product
        const { data: newProd, error } = await supabase
          .from('products')
          .insert(productPayload)
          .select()
          .single()

        if (error) throw error

        // If new image files were queued during creation, upload them now
        if (newImageFiles.length > 0 && newProd) {
          for (let i = 0; i < newImageFiles.length; i++) {
            const file = newImageFiles[i]
            const { path, error: uploadErr } = await uploadProductImage(file, newProd.id)
            if (!uploadErr && path) {
              const { error: dbErr } = await supabase.from('product_images').insert({
                product_id: newProd.id,
                storage_path: path,
                alt_text: newProd.name,
                sort_order: i,
              })
              if (dbErr) {
                console.error('Failed to create product_images record:', dbErr)
                await deleteProductImageFromStorage(path)
              }
            }
          }
        }

        navigate(`/admin/products/${newProd.id}/edit`, { replace: true })
        setFeedback({ type: 'success', message: 'Product created successfully! You can now manage photos.' })
      }
    } catch (err) {
      console.error('Error saving product:', err)
      setFeedback({ type: 'error', message: err.message || 'Failed to save product.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-stone-500 text-xs">
        Loading product details...
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Top breadcrumb & header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div className="space-y-1">
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Products</span>
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            {isEditing ? 'Edit Boutique Piece' : 'Add New Boutique Piece'}
          </h1>
          <p className="text-xs text-stone-500">
            Configure piece attributes, assign collection categories, set Naira pricing, and manage gallery images.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/products')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="product-form"
            variant="primary"
            size="sm"
            loading={saving}
            icon={Save}
          >
            {isEditing ? 'Update Piece' : 'Save & Continue'}
          </Button>
        </div>
      </div>

      {/* Feedback Message */}
      {feedback && (
        <div
          className={`p-4 rounded-sm text-xs flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-stone-700 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Product Form */}
      <form id="product-form" onSubmit={handleSubmit} className="space-y-8">
        {/* Core Attributes Card */}
        <div className="bg-white rounded-sm border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <h2 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
            Core Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Product Name */}
            <div className="sm:col-span-2">
              <label
                htmlFor="product-name"
                className="block text-xs uppercase tracking-wider font-semibold text-stone-700 mb-1.5"
              >
                Piece Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="product-name"
                type="text"
                required
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. Royal Ankara Flared Midi Gown"
                className="w-full bg-stone-50 border border-stone-300 rounded-sm px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>

            {/* Product Slug */}
            <div>
              <label
                htmlFor="product-slug"
                className="block text-xs uppercase tracking-wider font-semibold text-stone-700 mb-1.5"
              >
                URL Slug <span className="text-rose-500">*</span>
              </label>
              <input
                id="product-slug"
                type="text"
                required
                value={slug}
                onChange={handleSlugChange}
                placeholder="royal-ankara-flared-midi-gown"
                className="w-full bg-stone-50 border border-stone-300 rounded-sm px-3.5 py-2.5 text-xs font-mono text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
              />
              <p className="text-[11px] text-stone-400 mt-1">
                Unique web link identifier: /product/{slug || '...'}
              </p>
            </div>

            {/* Category Dropdown */}
            <div>
              <label
                htmlFor="product-category"
                className="block text-xs uppercase tracking-wider font-semibold text-stone-700 mb-1.5"
              >
                Category
              </label>
              <select
                id="product-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-sm px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
              >
                <option value="">-- Uncategorized --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price in Naira */}
            <div>
              <label
                htmlFor="product-price"
                className="block text-xs uppercase tracking-wider font-semibold text-stone-700 mb-1.5"
              >
                Price (₦ Naira) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                  ₦
                </span>
                <input
                  id="product-price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="35000"
                  className="w-full bg-stone-50 border border-stone-300 rounded-sm pl-8 pr-4 py-2.5 text-xs font-semibold text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
                />
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                Amount customer pays (e.g. 35000 for ₦35,000)
              </p>
            </div>

            {/* Publication & Feature Flags */}
            <div className="flex flex-col justify-center space-y-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded-xs text-stone-900 border-stone-300 focus:ring-stone-900"
                />
                <span className="text-xs font-semibold text-stone-800">
                  Published (visible to online customers)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded-xs text-stone-900 border-stone-300 focus:ring-stone-900"
                />
                <span className="text-xs font-semibold text-stone-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Featured Collection (highlight on homepage)
                </span>
              </label>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label
                htmlFor="product-description"
                className="block text-xs uppercase tracking-wider font-semibold text-stone-700 mb-1.5"
              >
                Piece Description & Fabric Notes
              </label>
              <textarea
                id="product-description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the silhouette, fabric quality, styling recommendations, sizing advice, or custom tailoring availability..."
                className="w-full bg-stone-50 border border-stone-300 rounded-sm p-3.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Product Images Section */}
        <div className="bg-white rounded-sm border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900">
                Piece Photography & Gallery
              </h2>
              <p className="text-xs text-stone-500">
                Uploaded to Supabase Storage (<code className="font-mono text-stone-600">product-images</code> bucket). The first image serves as the primary catalogue cover.
              </p>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-6">
              {/* Upload Input for Existing Product */}
              <div>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-300 hover:border-stone-500 rounded-sm p-6 cursor-pointer bg-stone-50/50 hover:bg-stone-50 transition-colors">
                  <Upload className="w-8 h-8 text-stone-400 mb-2" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                    {uploadingImages ? 'Uploading photos to Supabase Storage...' : 'Upload Photos'}
                  </span>
                  <span className="text-[11px] text-stone-400 mt-1">
                    Select one or multiple images (JPG, PNG, WebP)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    disabled={uploadingImages}
                    onChange={(e) => {
                      if (e.target.files) {
                        handleUploadImages(Array.from(e.target.files))
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Gallery List with Sort & Delete */}
              {images.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs border border-stone-200 rounded-xs bg-stone-50/30">
                  <ImageIcon className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                  No photos uploaded for this piece yet. Upload above.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {images.map((img, idx) => {
                    const imgUrl = getProductImageUrl(img.storage_path)
                    const isCover = idx === 0

                    return (
                      <div
                        key={img.id}
                        className={`relative bg-white rounded-xs border overflow-hidden flex flex-col justify-between ${
                          isCover ? 'border-[#b08d5b] ring-1 ring-[#b08d5b]/30' : 'border-stone-200'
                        }`}
                      >
                        <div className="aspect-3/4 w-full bg-stone-100 relative">
                          <img
                            src={imgUrl}
                            alt={img.alt_text || name}
                            className="w-full h-full object-cover"
                          />
                          {isCover && (
                            <span className="absolute top-2 left-2 bg-stone-900/90 text-[#dec07e] text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-xs">
                              Cover Photo
                            </span>
                          )}
                        </div>

                        {/* Controls Bar */}
                        <div className="p-3 bg-stone-50 flex items-center justify-between border-t border-stone-100">
                          <span className="text-[11px] text-stone-500 font-mono">
                            Order: #{idx + 1}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 rounded-xs hover:bg-stone-200 text-stone-600 disabled:opacity-30 disabled:hover:bg-transparent"
                              title="Move left/up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'down')}
                              disabled={idx === images.length - 1}
                              className="p-1 rounded-xs hover:bg-stone-200 text-stone-600 disabled:opacity-30 disabled:hover:bg-transparent"
                              title="Move right/down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteImage(img)}
                              className="p-1 rounded-xs hover:bg-rose-100 text-rose-600 ml-1"
                              title="Delete photo permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-stone-600 leading-relaxed">
                You can select images now to be uploaded automatically when you save this product, or upload and arrange them on the next screen.
              </p>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-300 rounded-sm p-6 cursor-pointer bg-stone-50/50 hover:bg-stone-50 transition-colors">
                <Upload className="w-7 h-7 text-stone-400 mb-2" />
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Select Initial Photos
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      setNewImageFiles(Array.from(e.target.files))
                    }
                  }}
                  className="hidden"
                />
              </label>

              {newImageFiles.length > 0 && (
                <div className="p-3 bg-stone-100 rounded-xs text-xs text-stone-700">
                  <strong>{newImageFiles.length}</strong> photo(s) selected to upload upon saving:
                  <ul className="list-disc pl-5 mt-1 text-[11px] text-stone-500">
                    {newImageFiles.map((f, i) => (
                      <li key={i}>{f.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Save Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => navigate('/admin/products')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={saving}
            icon={Save}
          >
            {isEditing ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  )
}
