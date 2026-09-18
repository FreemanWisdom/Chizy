import { supabase } from './supabaseClient'

export const PRODUCT_IMAGES_BUCKET = 'product-images'

/**
 * Returns the public URL for an image in the product-images bucket
 * @param {string} storagePath
 * @returns {string} Public URL
 */
export function getProductImageUrl(storagePath) {
  if (!storagePath) return ''
  // If already a full URL, return directly
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath
  }
  const { data } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(storagePath)

  return data?.publicUrl || ''
}

/**
 * Uploads a file to the product-images bucket under a clean product directory path
 * @param {File} file
 * @param {string} productId
 * @returns {Promise<{ path: string|null, error: Error|null }>}
 */
export async function uploadProductImage(file, productId) {
  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const sanitizedBase = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30)
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const storagePath = `${productId}/${uniqueSuffix}-${sanitizedBase}.${fileExt}`

    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error

    return { path: storagePath, error: null }
  } catch (err) {
    console.error('Error uploading product image:', err)
    return { path: null, error: err }
  }
}

/**
 * Deletes a single image file from Supabase Storage
 * @param {string} storagePath
 * @returns {Promise<{ error: Error|null }>}
 */
export async function deleteProductImageFromStorage(storagePath) {
  if (!storagePath) return { error: null }
  try {
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove([storagePath])

    if (error) throw error
    return { error: null }
  } catch (err) {
    console.error('Error deleting image from storage:', err)
    return { error: err }
  }
}

/**
 * Deletes multiple image files from Supabase Storage
 * @param {string[]} storagePaths
 * @returns {Promise<{ error: Error|null }>}
 */
export async function deleteMultipleImagesFromStorage(storagePaths) {
  if (!storagePaths || storagePaths.length === 0) return { error: null }
  const validPaths = storagePaths.filter(Boolean)
  if (validPaths.length === 0) return { error: null }

  try {
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove(validPaths)

    if (error) throw error
    return { error: null }
  } catch (err) {
    console.error('Error deleting multiple images from storage:', err)
    return { error: err }
  }
}
