import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  UploadCloud,
  ArrowLeft,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  SlidersHorizontal,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { uploadProductImage, deleteProductImageFromStorage } from '../../lib/imageUtils'
import { ensureUniqueProductSlug } from '../../lib/slugUtils'
import {
  cleanFilenameToName,
  validateBulkItem,
  runConcurrentQueue,
} from '../../lib/bulkUploadUtils'
import { Button } from '../../components/common/Button'

export function AdminBulkUploadPage() {
  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  // Upload Queue State
  const [items, setItems] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({
    completed: 0,
    failed: 0,
    total: 0,
  })
  const [dragActive, setDragActive] = useState(false)

  // Shared Batch Settings State
  const [batchCategory, setBatchCategory] = useState('')
  const [batchPrice, setBatchPrice] = useState('')
  const [batchPublished, setBatchPublished] = useState(true)
  const [batchFeatured, setBatchFeatured] = useState(false)

  // Validation / Feedback State
  const [batchCategoryError, setBatchCategoryError] = useState(false)
  const [generalError, setGeneralError] = useState(null)

  const fileInputRef = useRef(null)
  const itemsRef = useRef(items)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  // Fetch categories on mount
  useEffect(() => {
    let isMounted = true
    const fetchCats = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .order('name')
        if (error) throw error
        if (isMounted) setCategories(data || [])
      } catch (err) {
        console.error('Error loading categories:', err)
      } finally {
        if (isMounted) setLoadingCategories(false)
      }
    }
    fetchCats()
    return () => {
      isMounted = false
    }
  }, [])

  // Warn if navigating away during active upload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isUploading) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isUploading])

  // Revoke all remaining object URLs on unmount
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        if (item.previewUrl) {
          try {
            URL.revokeObjectURL(item.previewUrl)
          } catch {
            // ignore
          }
        }
      })
    }
  }, [])

  // Helper to append new files into the queue
  const addFilesToQueue = useCallback((fileList) => {
    if (!fileList || fileList.length === 0) return

    const newItems = []
    const now = Date.now()

    // Build a set of already-queued filenames for lightweight duplicate detection (spec G)
    const existingNames = new Set(itemsRef.current.map((item) => item.file.name))

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      // Only accept images
      if (!file.type.startsWith('image/')) continue

      // Skip obvious duplicates — same filename already in queue
      if (existingNames.has(file.name)) continue
      // Track within this batch too so duplicates in the same pick are also filtered
      existingNames.add(file.name)

      const previewUrl = URL.createObjectURL(file)
      const cleanName = cleanFilenameToName(file.name)

      newItems.push({
        id: `bulk_${now}_${i}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
        name: cleanName,
        price: '', // Empty means it uses batchPrice
        description: '',
        is_featured: null, // null means it inherits batchFeatured
        isExpanded: false, // Collapsed override drawer
        status: 'idle', // 'idle' | 'uploading' | 'success' | 'error'
        errorMessage: null,
        createdProductId: null,
      })
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems])
      setGeneralError(null)
    }
  }, [])

  // Handle Drag & Drop
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files)
    }
  }

  // Handle file input selection
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files)
      // Reset input value so re-selecting same files works
      e.target.value = ''
    }
  }

  // Remove single item from queue
  const handleRemoveItem = (id) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl) {
        try {
          URL.revokeObjectURL(target.previewUrl)
        } catch {
          // ignore
        }
      }
      return prev.filter((item) => item.id !== id)
    })
  }

  // Clear all pending / failed items from queue
  const handleClearQueue = () => {
    if (isUploading) return
    items.forEach((item) => {
      if (item.previewUrl) {
        try {
          URL.revokeObjectURL(item.previewUrl)
        } catch {
          // ignore
        }
      }
    })
    setItems([])
    setUploadProgress({ completed: 0, failed: 0, total: 0 })
    setGeneralError(null)
  }

  // Update field on a specific queued item
  const handleUpdateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            [field]: value,
            errorMessage:
              item.status === 'error' && (field === 'name' || field === 'price')
                ? null
                : item.errorMessage,
          }
        }
        return item
      })
    )
  }

  // Toggle item expanded options drawer
  const handleToggleExpand = (id) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, isExpanded: !item.isExpanded }
        }
        return item
      })
    )
  }

  // Worker for a single item upload with strict rollback on failure
  const processSingleProductUpload = async (item) => {
    // 1. Resolve effective attributes
    const effectiveName = item.name?.trim() || cleanFilenameToName(item.file.name)
    const rawPrice =
      item.price !== '' && item.price !== null && item.price !== undefined
        ? item.price
        : batchPrice
    const effectivePrice = parseFloat(rawPrice)
    const effectiveCategoryId = batchCategory || null
    const effectivePublished = Boolean(batchPublished)
    const effectiveFeatured =
      item.is_featured !== null && item.is_featured !== undefined
        ? Boolean(item.is_featured)
        : Boolean(batchFeatured)
    const effectiveDescription = item.description?.trim() || null

    // 2. Validate single item with batch fallbacks
    const validation = validateBulkItem(
      { ...item, name: effectiveName, price: rawPrice, category_id: effectiveCategoryId },
      { category_id: batchCategory, price: batchPrice }
    )

    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      }
    }

    let createdProduct
    let uploadedStoragePath

    try {
      // 3. Generate unique slug
      const uniqueSlug = await ensureUniqueProductSlug(supabase, effectiveName)

      // 4. Create product record in public.products
      const { data: newProd, error: prodErr } = await supabase
        .from('products')
        .insert({
          name: effectiveName,
          slug: uniqueSlug,
          category_id: effectiveCategoryId,
          price: effectivePrice,
          description: effectiveDescription,
          is_published: effectivePublished,
          is_featured: effectiveFeatured,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (prodErr) {
        throw new Error(prodErr.message || 'Failed to insert product record.')
      }

      createdProduct = newProd

      // 5. Upload product image to Supabase Storage bucket
      const { path, error: uploadErr } = await uploadProductImage(item.file, createdProduct.id)
      if (uploadErr || !path) {
        // Rollback created product record
        await supabase.from('products').delete().eq('id', createdProduct.id)
        throw new Error(uploadErr?.message || 'Failed to upload product photo.')
      }

      uploadedStoragePath = path

      // 6. Create product_images record in public.product_images
      const { error: imgDbErr } = await supabase.from('product_images').insert({
        product_id: createdProduct.id,
        storage_path: uploadedStoragePath,
        alt_text: effectiveName,
        sort_order: 0,
      })

      if (imgDbErr) {
        // Rollback image file from storage and product from DB
        await deleteProductImageFromStorage(uploadedStoragePath)
        await supabase.from('products').delete().eq('id', createdProduct.id)
        throw new Error(imgDbErr.message || 'Failed to link image to product.')
      }

      return {
        success: true,
        productId: createdProduct.id,
      }
    } catch (err) {
      console.error(`Error processing bulk item "${effectiveName}":`, err)
      return {
        success: false,
        error: err.message || 'Upload failed.',
      }
    }
  }

  // Trigger Bulk Upload Process (Controlled Concurrency = 3)
  const handleStartBulkUpload = async (onlyFailed = false) => {
    if (isUploading) return
    setGeneralError(null)

    // Enforce Category requirement
    if (!batchCategory) {
      setBatchCategoryError(true)
      setGeneralError('Please select a Category in Batch Settings before uploading.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    } else {
      setBatchCategoryError(false)
    }

    // Identify candidate items
    const candidates = items.filter((item) =>
      onlyFailed ? item.status === 'error' : item.status !== 'success'
    )

    if (candidates.length === 0) return

    // Pre-flight check: ensure every candidate has a valid name and price
    let hasInvalid = false
    const validatedItems = items.map((item) => {
      const isCandidate = candidates.some((c) => c.id === item.id)
      if (!isCandidate) return item

      const effectiveName = item.name?.trim() || cleanFilenameToName(item.file.name)
      const rawPrice =
        item.price !== '' && item.price !== null && item.price !== undefined
          ? item.price
          : batchPrice

      const val = validateBulkItem(
        { ...item, name: effectiveName, price: rawPrice, category_id: batchCategory },
        { category_id: batchCategory, price: batchPrice }
      )

      if (!val.isValid) {
        hasInvalid = true
        return { ...item, status: 'error', errorMessage: val.error }
      }
      return item
    })

    if (hasInvalid) {
      setItems(validatedItems)
      setGeneralError(
        'Some products require attention. Please enter a uniform batch price or specify individual prices for highlighted items.'
      )
      return
    }

    setIsUploading(true)
    setUploadProgress({
      completed: 0,
      failed: 0,
      total: candidates.length,
    })

    // Mark candidates as uploading
    setItems((prev) =>
      prev.map((item) => {
        const isTarget = candidates.some((c) => c.id === item.id)
        if (isTarget) {
          return { ...item, status: 'uploading', errorMessage: null }
        }
        return item
      })
    )

    // Run with controlled concurrency limit of 3 workers
    await runConcurrentQueue(
      candidates,
      3,
      async (candidate) => {
        const result = await processSingleProductUpload(candidate)
        return { id: candidate.id, result }
      },
      (index, { id, result }) => {
        // Update per-item state as each completes
        setItems((prev) =>
          prev.map((item) => {
            if (item.id === id) {
              if (result.success) {
                return {
                  ...item,
                  status: 'success',
                  errorMessage: null,
                  createdProductId: result.productId,
                }
              } else {
                return {
                  ...item,
                  status: 'error',
                  errorMessage: result.error,
                }
              }
            }
            return item
          })
        )

        // Update live progress counters
        setUploadProgress((prev) => ({
          ...prev,
          completed: prev.completed + (result.success ? 1 : 0),
          failed: prev.failed + (result.success ? 0 : 1),
        }))
      }
    )

    setIsUploading(false)
  }

  // Counters
  const totalCount = items.length
  const successCount = items.filter((i) => i.status === 'success').length
  const errorCount = items.filter((i) => i.status === 'error').length
  const pendingCount = items.filter((i) => i.status === 'idle').length
  const actionableCount = pendingCount + errorCount

  const allSuccess = totalCount > 0 && successCount === totalCount
  const processedCount = uploadProgress.completed + uploadProgress.failed
  const remainingPending = Math.max(0, uploadProgress.total - processedCount)
  const progressPercent =
    uploadProgress.total > 0
      ? Math.round((processedCount / uploadProgress.total) * 100)
      : 0

  const selectedCategoryName =
    categories.find((c) => c.id === batchCategory)?.name || ''

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Products</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Bulk Product Upload
            </h1>
            <span className="text-[11px] font-semibold uppercase tracking-wider bg-[#dec07e]/15 text-stone-900 px-2.5 py-0.5 rounded-full border border-[#dec07e]/30">
              Batch Fast-Track
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Upload multiple boutique pieces at once. Select your photos, set shared batch details, and publish in one click.
          </p>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClearQueue}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-stone-300 rounded-sm bg-white hover:bg-stone-50 text-stone-700 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5 text-stone-400" />
              <span>Clear Queue</span>
            </button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-xs"
          >
            <UploadCloud className="w-4 h-4 mr-1.5 text-[#dec07e]" />
            <span>{items.length === 0 ? 'Select Photos' : 'Add More Photos'}</span>
          </Button>

          {errorCount > 0 && !isUploading && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleStartBulkUpload(true)}
              className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-rose-600" />
              <span>Retry {errorCount} Failed</span>
            </Button>
          )}

          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={() => handleStartBulkUpload(false)}
            loading={isUploading}
            disabled={isUploading || items.length === 0 || actionableCount === 0}
            className="text-xs tracking-wider uppercase font-semibold"
          >
            <span>
              {isUploading
                ? `Uploading (${processedCount}/${uploadProgress.total})...`
                : `Upload ${actionableCount > 0 ? `${actionableCount} ` : ''}Products`}
            </span>
          </Button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* General Feedback Alert */}
      {generalError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-md flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{generalError}</div>
          <button
            type="button"
            onClick={() => setGeneralError(null)}
            className="text-rose-400 hover:text-rose-700 text-xs font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* PROMINENT BATCH SETTINGS SECTION */}
      <div className="bg-white border border-stone-200 rounded-lg shadow-xs overflow-hidden transition-all">
        {/* Section Header */}
        <div className="bg-gradient-to-r from-stone-900 to-stone-850 px-5 py-3.5 flex items-center justify-between text-stone-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#dec07e] animate-pulse" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#dec07e]">
              Batch Settings
            </h2>
            <span className="text-[11px] text-stone-400 hidden sm:inline">
              &bull; Applied to all selected products
            </span>
          </div>
          <span className="text-[11px] text-stone-300 font-medium">
            {totalCount} {totalCount === 1 ? 'Product' : 'Products'} in Batch
          </span>
        </div>

        {/* Batch Settings Form Controls */}
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Category Selector (Required) */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-stone-700">
                <span>Category</span>
                <span className="text-rose-600 text-[11px] font-normal normal-case">Required</span>
              </label>
              <select
                value={batchCategory}
                onChange={(e) => {
                  setBatchCategory(e.target.value)
                  if (batchCategoryError) setBatchCategoryError(false)
                  if (generalError) setGeneralError(null)
                }}
                disabled={loadingCategories || isUploading}
                className={`w-full bg-stone-50 border rounded-sm px-3 py-2 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-[#dec07e] focus:ring-1 focus:ring-[#dec07e] transition-colors ${
                  batchCategoryError
                    ? 'border-rose-400 bg-rose-50/40 ring-1 ring-rose-400'
                    : 'border-stone-300'
                }`}
              >
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-stone-400">
                Every product in this batch will be assigned to this category.
              </p>
            </div>

            {/* Batch Price (Optional) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Price
                </label>
                <span className="text-stone-400 text-[10px] normal-case">Uniform (Optional)</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-semibold">
                  ₦
                </span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={batchPrice}
                  onChange={(e) => {
                    setBatchPrice(e.target.value)
                    if (generalError) setGeneralError(null)
                  }}
                  disabled={isUploading}
                  placeholder="e.g. 15,000"
                  className="w-full bg-stone-50 border border-stone-300 rounded-sm pl-7 pr-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-[#dec07e] focus:ring-1 focus:ring-[#dec07e]"
                />
              </div>
              <p className="text-[10px] text-stone-400">
                Applies to every item unless an individual price override is typed below.
              </p>
            </div>

            {/* Publish Products Toggle (ON / OFF) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Publish products
              </label>
              <div className="flex items-center justify-between p-2.5 bg-stone-50 border border-stone-300 rounded-sm">
                <div className="pr-2">
                  <span className="text-xs font-medium text-stone-800 block">
                    {batchPublished ? 'Live in Boutique' : 'Hidden as Draft'}
                  </span>
                  <span className="text-[10px] text-stone-400 block">Storefront visibility</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={batchPublished}
                  onClick={() => setBatchPublished((prev) => !prev)}
                  disabled={isUploading}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider transition-colors uppercase ${
                    batchPublished
                      ? 'bg-stone-900 text-[#dec07e]'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  <span>{batchPublished ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>

            {/* Feature Products Toggle (ON / OFF) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Feature products
              </label>
              <div className="flex items-center justify-between p-2.5 bg-stone-50 border border-stone-300 rounded-sm">
                <div className="pr-2">
                  <span className="text-xs font-medium text-stone-800 block">
                    {batchFeatured ? 'Featured Piece' : 'Standard Catalog'}
                  </span>
                  <span className="text-[10px] text-stone-400 block">Show on curated feed</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={batchFeatured}
                  onClick={() => setBatchFeatured((prev) => !prev)}
                  disabled={isUploading}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider transition-colors uppercase ${
                    batchFeatured
                      ? 'bg-stone-900 text-[#dec07e]'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  <span>{batchFeatured ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVE UPLOAD PROGRESS BANNER */}
      {isUploading && (
        <div className="bg-stone-900 text-stone-100 p-5 rounded-lg shadow-lg border border-stone-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-[#dec07e] animate-spin" />
                <span className="font-serif text-base font-semibold text-white tracking-wide">
                  Uploading products...
                </span>
                <span className="font-mono text-xs bg-[#dec07e]/20 text-[#dec07e] px-2 py-0.5 rounded-xs font-semibold">
                  {processedCount} / {uploadProgress.total}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Controlled concurrency: 3 simultaneous product uploads.
              </p>
            </div>

            {/* Counters */}
            <div className="flex items-center gap-3 text-xs bg-stone-950/60 px-3.5 py-2 rounded-sm border border-stone-800">
              <span className="text-emerald-400 font-semibold">
                Completed: {uploadProgress.completed}
              </span>
              <span className="text-stone-700">&bull;</span>
              <span className="text-rose-400 font-semibold">
                Failed: {uploadProgress.failed}
              </span>
              <span className="text-stone-700">&bull;</span>
              <span className="text-stone-300 font-medium">
                Pending: {remainingPending}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-stone-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#dec07e] to-[#c5a880] h-2.5 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* COMPLETION SUMMARY BANNER */}
      {!isUploading && allSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3 text-xs">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <span className="font-semibold text-sm block text-emerald-950">
                {successCount} {successCount === 1 ? 'product' : 'products'} uploaded successfully.
              </span>
              <p className="text-emerald-700 mt-0.5">
                Every photo was uploaded to storage and linked to active products in category "{selectedCategoryName}".
              </p>
            </div>
          </div>
          <Link
            to="/admin/products"
            className="shrink-0 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-sm transition-colors text-center"
          >
            View in Products List &rarr;
          </Link>
        </div>
      )}

      {/* PARTIAL ERROR BANNER */}
      {!isUploading && errorCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3 text-xs">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <span className="font-semibold text-sm block text-amber-950">
                {successCount} uploaded &bull; {errorCount} failed
              </span>
              <p className="text-amber-700 mt-0.5">
                Some items could not be uploaded. You can inspect errors below and retry failed items without re-uploading completed ones.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={() => handleStartBulkUpload(true)}
            className="shrink-0 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            <span>Retry {errorCount} Failed</span>
          </Button>
        </div>
      )}

      {/* EMPTY QUEUE DROPZONE */}
      {items.length === 0 ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? 'border-[#dec07e] bg-[#dec07e]/10 scale-[1.005]'
              : 'border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50/50'
          }`}
        >
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-stone-100 border border-stone-200 text-[#dec07e] mx-auto flex items-center justify-center shadow-xs">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Select Product Photos for Batch Upload
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Select 10, 30, 50, or 100+ photos at once with no limit. Product titles are automatically derived from filenames.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 px-4 py-2.5 rounded-sm transition-colors border border-stone-200">
              <UploadCloud className="w-4 h-4 text-[#dec07e]" />
              <span>Browse Photos from Device</span>
            </div>
            <p className="text-[11px] text-stone-400">
              Supports: JPG, PNG, WebP, AVIF, GIF &bull; Up to 15MB each
            </p>
          </div>
        </div>
      ) : (
        /* QUEUE LIST & TABLE */
        <div className="space-y-3">
          {/* Queue Sub-header Bar */}
          <div className="bg-stone-100 border border-stone-200 px-4 py-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-stone-900">
                {totalCount} {totalCount === 1 ? 'Photo Selected' : 'Photos Selected'}
              </span>
              <span className="text-stone-300">&bull;</span>
              <span className="text-stone-600">
                Category:{' '}
                <strong className={batchCategory ? 'text-stone-900' : 'text-rose-600'}>
                  {selectedCategoryName || 'None selected'}
                </strong>
              </span>
              {batchPrice !== '' && (
                <>
                  <span className="text-stone-300">&bull;</span>
                  <span className="text-stone-600">
                    Shared Price: <strong>₦{parseFloat(batchPrice).toLocaleString()}</strong>
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-stone-500 hidden sm:inline">
                Names are auto-formatted from filenames. Edit inline if needed.
              </span>
            </div>
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="hidden lg:block bg-white border border-stone-200 rounded-lg overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider text-[10px] border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4 w-16">Preview</th>
                    <th className="py-3 px-4 min-w-[260px]">Product Name</th>
                    <th className="py-3 px-4 w-44">Price (₦)</th>
                    <th className="py-3 px-4 w-36">Category</th>
                    <th className="py-3 px-4 w-28 text-center">Overrides</th>
                    <th className="py-3 px-4 w-28 text-center">Status</th>
                    <th className="py-3 px-4 w-16 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-800">
                  {items.map((item, idx) => {
                    const isCompleted = item.status === 'success'
                    const hasError = item.status === 'error'
                    const isItemUploading = item.status === 'uploading'
                    const hasCustomPrice = item.price !== '' && item.price !== null
                    const hasCustomDesc = Boolean(item.description?.trim())
                    const hasCustomFeatured = item.is_featured !== null

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isCompleted
                            ? 'bg-emerald-50/30'
                            : hasError
                            ? 'bg-rose-50/40'
                            : isItemUploading
                            ? 'bg-amber-50/30'
                            : 'hover:bg-stone-50/40'
                        }`}
                      >
                        {/* Index */}
                        <td className="py-2.5 px-4 text-stone-400 font-mono text-[11px] text-center">
                          {idx + 1}
                        </td>

                        {/* Thumbnail */}
                        <td className="py-2.5 px-4">
                          <div className="w-11 h-13 bg-stone-100 rounded-xs border border-stone-200 overflow-hidden relative group shrink-0">
                            <img
                              src={item.previewUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <span className="text-[8px] text-white font-mono uppercase">
                                {(item.file.size / (1024 * 1024)).toFixed(1)}MB
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Product Title (Auto-derived from filename, directly editable) */}
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                            disabled={isCompleted || isUploading}
                            placeholder="Product Title..."
                            className={`w-full bg-white border rounded-sm px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-[#dec07e] ${
                              hasError && !item.name.trim()
                                ? 'border-rose-400 bg-rose-50/30'
                                : 'border-stone-300'
                            }`}
                          />
                          {hasError && item.errorMessage && (
                            <div className="text-[10px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              <span>{item.errorMessage}</span>
                            </div>
                          )}
                        </td>

                        {/* Price (Applies batch price by default or individual override) */}
                        <td className="py-2.5 px-4">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-semibold">
                              ₦
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={item.price}
                              onChange={(e) => handleUpdateItem(item.id, 'price', e.target.value)}
                              disabled={isCompleted || isUploading}
                              placeholder={
                                batchPrice !== ''
                                  ? `${parseFloat(batchPrice).toLocaleString()} (Batch)`
                                  : 'Price...'
                              }
                              className={`w-full bg-white border rounded-sm pl-6 pr-2 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-[#dec07e] ${
                                hasError &&
                                item.price === '' &&
                                batchPrice === ''
                                  ? 'border-rose-400 bg-rose-50/30'
                                  : hasCustomPrice
                                  ? 'border-[#dec07e] bg-amber-50/10'
                                  : 'border-stone-300'
                              }`}
                            />
                          </div>
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            {hasCustomPrice ? (
                              <span className="text-amber-700 font-medium">Individual override</span>
                            ) : batchPrice !== '' ? (
                              <span className="text-stone-500">Shared batch price</span>
                            ) : (
                              <span className="text-rose-500">Needs price</span>
                            )}
                          </div>
                        </td>

                        {/* Category (Inherited from Batch Settings) */}
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-block px-2 py-1 rounded-xs text-[11px] font-medium truncate max-w-[140px] ${
                              batchCategory
                                ? 'bg-stone-100 text-stone-800'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                            title={selectedCategoryName || 'No category selected'}
                          >
                            {selectedCategoryName || 'Select Above'}
                          </span>
                        </td>

                        {/* Overrides Drawer Trigger */}
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleExpand(item.id)}
                            disabled={isCompleted || isUploading}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-sm transition-colors ${
                              hasCustomDesc || hasCustomFeatured
                                ? 'bg-stone-800 text-[#dec07e]'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            }`}
                            title="Edit optional description or featured status"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>
                              {hasCustomDesc || hasCustomFeatured ? 'Customized' : 'Options'}
                            </span>
                            {item.isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </td>

                        {/* Status Badge */}
                        <td className="py-2.5 px-4 text-center">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Uploaded</span>
                            </span>
                          ) : isItemUploading ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                              <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
                              <span>Uploading</span>
                            </span>
                          ) : hasError ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Failed</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-600">
                              <span>Ready</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-4 text-right">
                          {isCompleted && item.createdProductId ? (
                            <Link
                              to={`/admin/products/${item.createdProductId}/edit`}
                              target="_blank"
                              className="text-stone-400 hover:text-stone-900 p-1 inline-block"
                              title="Open created product"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={isUploading}
                              className="text-stone-400 hover:text-rose-600 p-1 transition-colors disabled:opacity-40"
                              title="Remove from queue"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Individual Item Overrides (Rendered if any item is expanded) */}
            {items.some((i) => i.isExpanded) && (
              <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#dec07e]" />
                    <span>Individual Overrides Active for Selected Items</span>
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Optional descriptions and featured status per product
                  </span>
                </div>

                <div className="space-y-2">
                  {items
                    .filter((item) => item.isExpanded)
                    .map((item) => (
                      <div
                        key={`override_${item.id}`}
                        className="bg-white border border-stone-200 rounded-sm p-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs items-center"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className="w-8 h-9 object-cover rounded-xs border border-stone-200"
                          />
                          <span className="font-semibold text-stone-900 truncate">
                            {item.name || 'Untitled'}
                          </span>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              handleUpdateItem(item.id, 'description', e.target.value)
                            }
                            placeholder="Optional boutique description..."
                            className="w-full bg-stone-50 border border-stone-300 rounded-sm px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-[#dec07e]"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={
                                item.is_featured !== null ? item.is_featured : batchFeatured
                              }
                              onChange={(e) =>
                                handleUpdateItem(item.id, 'is_featured', e.target.checked)
                              }
                              className="rounded-xs border-stone-300 text-stone-900 focus:ring-[#dec07e]"
                            />
                            <span className="text-stone-700">Feature this product</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleToggleExpand(item.id)}
                            className="text-[11px] text-stone-400 hover:text-stone-700"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* MOBILE & TABLET CARD VIEW */}
          <div className="lg:hidden space-y-3">
            {items.map((item, idx) => {
              const isCompleted = item.status === 'success'
              const hasError = item.status === 'error'
              const isItemUploading = item.status === 'uploading'
              const hasCustomPrice = item.price !== '' && item.price !== null

              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-lg p-3.5 shadow-xs space-y-3 transition-colors ${
                    isCompleted
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : hasError
                      ? 'border-rose-200 bg-rose-50/30'
                      : isItemUploading
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-stone-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-14 bg-stone-100 rounded-xs border border-stone-200 overflow-hidden shrink-0">
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-stone-400">
                          #{idx + 1} &bull; {(item.file.size / (1024 * 1024)).toFixed(1)}MB
                        </span>
                        <div className="mt-0.5">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Uploaded</span>
                            </span>
                          ) : isItemUploading ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                              <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
                              <span>Uploading</span>
                            </span>
                          ) : hasError ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Failed</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-600">
                              <span>Ready</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isCompleted && item.createdProductId ? (
                        <Link
                          to={`/admin/products/${item.createdProductId}/edit`}
                          target="_blank"
                          className="text-stone-500 hover:text-stone-900 p-1.5"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isUploading}
                          className="text-stone-400 hover:text-rose-600 p-1.5 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {hasError && item.errorMessage && (
                    <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-xs flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{item.errorMessage}</span>
                    </div>
                  )}

                  {/* Mobile Form Fields */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-stone-500 mb-0.5">
                        Product Title
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                        disabled={isCompleted || isUploading}
                        placeholder="Product Title..."
                        className="w-full bg-white border border-stone-300 rounded-sm px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-[#dec07e]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-stone-500 mb-0.5">
                          Price (₦)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-semibold">
                            ₦
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={item.price}
                            onChange={(e) => handleUpdateItem(item.id, 'price', e.target.value)}
                            disabled={isCompleted || isUploading}
                            placeholder={
                              batchPrice !== ''
                                ? `${parseFloat(batchPrice).toLocaleString()}`
                                : '0.00'
                            }
                            className={`w-full bg-white border rounded-sm pl-6 pr-2 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-[#dec07e] ${
                              hasCustomPrice ? 'border-[#dec07e]' : 'border-stone-300'
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-stone-500 mb-0.5">
                          Category
                        </label>
                        <div className="bg-stone-50 border border-stone-200 rounded-sm px-2 py-1.5 text-xs text-stone-700 truncate">
                          {selectedCategoryName || 'None'}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Overrides Toggle */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleExpand(item.id)}
                        className="text-[11px] text-stone-500 hover:text-stone-900 flex items-center gap-1"
                      >
                        <SlidersHorizontal className="w-3 h-3 text-[#dec07e]" />
                        <span>
                          {item.isExpanded ? 'Hide Options' : 'Optional Description / Featured'}
                        </span>
                        {item.isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      {item.isExpanded && (
                        <div className="mt-2 p-2.5 bg-stone-50 border border-stone-200 rounded-sm space-y-2">
                          <div>
                            <label className="block text-[10px] font-semibold uppercase text-stone-500 mb-0.5">
                              Description
                            </label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) =>
                                handleUpdateItem(item.id, 'description', e.target.value)
                              }
                              placeholder="Optional boutique description..."
                              className="w-full bg-white border border-stone-300 rounded-sm px-2 py-1 text-xs text-stone-900 focus:outline-none focus:border-[#dec07e]"
                            />
                          </div>

                          <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={
                                item.is_featured !== null ? item.is_featured : batchFeatured
                              }
                              onChange={(e) =>
                                handleUpdateItem(item.id, 'is_featured', e.target.checked)
                              }
                              className="rounded-xs border-stone-300 text-stone-900 focus:ring-[#dec07e]"
                            />
                            <span>Feature this specific product</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* STICKY BOTTOM ACTION BAR */}
          {items.length > 3 && (
            <div className="sticky bottom-4 z-30 bg-stone-950 text-stone-100 p-4 rounded-lg shadow-2xl border border-stone-800 flex items-center justify-between gap-4 flex-wrap">
              <div className="text-xs">
                <span className="font-semibold text-white">
                  {successCount} of {totalCount} uploaded
                </span>
                {errorCount > 0 && (
                  <span className="text-rose-400 ml-2">({errorCount} failed)</span>
                )}
                {pendingCount > 0 && (
                  <span className="text-stone-400 ml-2">({pendingCount} pending)</span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {errorCount > 0 && !isUploading && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartBulkUpload(true)}
                    className="text-xs border-rose-700 text-rose-200 hover:bg-rose-950"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    <span>Retry Failed ({errorCount})</span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="gold"
                  size="sm"
                  onClick={() => handleStartBulkUpload(false)}
                  loading={isUploading}
                  disabled={isUploading || actionableCount === 0}
                  className="text-xs tracking-wider uppercase font-semibold"
                >
                  <span>
                    {isUploading
                      ? 'Processing Batch...'
                      : `Upload ${actionableCount} Products`}
                  </span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
