import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  UploadCloud,
  Trash2,
  Loader2,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import {
  getStorefrontBackground,
  getStorefrontBackgroundUrl,
  uploadStorefrontBackground,
  saveStorefrontBackgroundSetting,
  removeStorefrontBackground,
  deleteOldBackgroundFile,
} from '../../lib/storefrontSettings'
import { Button } from '../../components/common/Button'

export function AdminStorefrontPage() {
  const [currentPath, setCurrentPath] = useState(null)
  const [currentUrl, setCurrentUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const fileInputRef = useRef(null)

  // Load current background on mount
  useEffect(() => {
    let isMounted = true
    const load = async () => {
      const { path } = await getStorefrontBackground()
      if (!isMounted) return
      setCurrentPath(path)
      if (path) {
        setCurrentUrl(getStorefrontBackgroundUrl(path))
      }
      setLoading(false)
    }
    load()
    return () => { isMounted = false }
  }, [])

  const clearMessages = () => {
    setSuccessMsg(null)
    setErrorMsg(null)
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file.')
      return
    }

    // Validate file size (15MB max)
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('Image must be smaller than 15 MB.')
      return
    }

    clearMessages()
    setUploading(true)

    try {
      // Upload new file
      const { path: newPath, error: uploadErr } = await uploadStorefrontBackground(file)
      if (uploadErr || !newPath) {
        throw new Error(uploadErr?.message || 'Upload failed.')
      }

      // Save setting
      const { error: saveErr } = await saveStorefrontBackgroundSetting(newPath)
      if (saveErr) {
        throw new Error(saveErr?.message || 'Failed to save background setting.')
      }

      // Clean up old file if replacing
      if (currentPath) {
        await deleteOldBackgroundFile(currentPath)
      }

      // Update state
      setCurrentPath(newPath)
      setCurrentUrl(getStorefrontBackgroundUrl(newPath))
      setSuccessMsg('Background image updated successfully.')
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred during upload.')
    } finally {
      setUploading(false)
      // Reset input so re-selecting same file works
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    if (!currentPath) return
    clearMessages()
    setRemoving(true)

    try {
      const { error } = await removeStorefrontBackground(currentPath)
      if (error) {
        throw new Error(error.message || 'Failed to remove background.')
      }

      setCurrentPath(null)
      setCurrentUrl('')
      setSuccessMsg('Background removed. The storefront will use the default design.')
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred while removing the background.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="border-b border-stone-200 pb-5">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Storefront Appearance
          </h1>
          <span className="text-[11px] font-semibold uppercase tracking-wider bg-[#dec07e]/15 text-stone-900 px-2.5 py-0.5 rounded-full border border-[#dec07e]/30">
            Settings
          </span>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Customize the storefront hero background image. Changes are visible to all visitors immediately.
        </p>
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-md flex items-start gap-2.5 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMsg}</div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-400 hover:text-emerald-700 text-xs font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-md flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMsg}</div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-rose-700 text-xs font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Background Preview Card */}
      <div className="bg-white border border-stone-200 rounded-lg shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-stone-900 to-stone-850 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#dec07e] animate-pulse" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#dec07e]">
              Hero Background
            </h2>
          </div>
          <span className="text-[11px] text-stone-300 font-medium">
            {currentPath ? 'Custom Image Active' : 'Default Design'}
          </span>
        </div>

        {/* Preview Area */}
        <div className="p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
            </div>
          ) : currentUrl ? (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Current Background
              </label>
              <div className="relative rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                {/* Image preview with overlay simulation */}
                <div className="relative aspect-[16/7]">
                  <img
                    src={currentUrl}
                    alt="Storefront background preview"
                    className="w-full h-full object-cover"
                  />
                  {/* Dark overlay preview (matches storefront treatment) */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/60" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-1">
                      <p className="text-xs uppercase tracking-widest text-[#dec07e] font-semibold">
                        Preview with Overlay
                      </p>
                      <p className="font-serif text-2xl font-bold text-white tracking-tight">
                        Hero Section Preview
                      </p>
                      <p className="text-stone-300 text-xs">
                        Text remains readable with the overlay treatment
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-stone-400">
                The storefront applies a gradient overlay to ensure text readability over any background image.
              </p>
            </div>
          ) : (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-8 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
                <ImageIcon className="w-7 h-7 text-stone-400" />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-stone-900">
                  No Custom Background
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  The storefront is using the default gradient design. Upload an image to customize the hero background.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleUpload}
              className="hidden"
            />

            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || removing}
              loading={uploading}
              className="text-xs"
            >
              <UploadCloud className="w-4 h-4 mr-1.5" />
              <span>{currentPath ? 'Replace Background' : 'Upload Background'}</span>
            </Button>

            {currentPath && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={uploading || removing}
                loading={removing}
                className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                <span>Remove Background</span>
              </Button>
            )}
          </div>

          <p className="text-[10px] text-stone-400">
            Supports: JPG, PNG, WebP, AVIF &bull; Max 15 MB &bull; Recommended: landscape 1920×800 or wider
          </p>
        </div>
      </div>

      {/* Tips Card */}
      <div className="bg-stone-50 border border-stone-200 rounded-lg p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-700">
          Background Image Tips
        </h3>
        <ul className="text-xs text-stone-600 space-y-1.5 list-disc list-inside">
          <li>Use high-quality, landscape-oriented images for the best visual result.</li>
          <li>Fashion editorial, fabric textures, or boutique lifestyle shots work well.</li>
          <li>A gradient overlay is automatically applied to keep text readable.</li>
          <li>The image scales to cover all screen sizes (desktop, tablet, mobile).</li>
          <li>If the image fails to load, the default CHIZY gradient design appears as a fallback.</li>
        </ul>
      </div>
    </div>
  )
}
