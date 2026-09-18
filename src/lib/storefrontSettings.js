import { supabase } from './supabaseClient'
import { PRODUCT_IMAGES_BUCKET } from './imageUtils'

const SETTINGS_TABLE = 'site_settings'
const BG_SETTING_KEY = 'storefront_bg_path'
const STOREFRONT_STORAGE_PREFIX = 'storefront'

/**
 * Fetches the current storefront background storage path from site_settings.
 * @returns {Promise<{ path: string|null, error: Error|null }>}
 */
export async function getStorefrontBackground() {
  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select('value')
      .eq('key', BG_SETTING_KEY)
      .maybeSingle()

    if (error) throw error
    return { path: data?.value || null, error: null }
  } catch (err) {
    console.error('Error fetching storefront background:', err)
    return { path: null, error: err }
  }
}

/**
 * Returns the public URL for a storefront background storage path.
 * @param {string} storagePath
 * @returns {string}
 */
export function getStorefrontBackgroundUrl(storagePath) {
  if (!storagePath) return ''
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath
  }
  const { data } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(storagePath)
  return data?.publicUrl || ''
}

/**
 * Uploads a background image to Supabase Storage under storefront/ prefix.
 * @param {File} file
 * @returns {Promise<{ path: string|null, error: Error|null }>}
 */
export async function uploadStorefrontBackground(file) {
  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const storagePath = `${STOREFRONT_STORAGE_PREFIX}/bg_${uniqueSuffix}.${fileExt}`

    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '86400',
        upsert: false,
      })

    if (error) throw error
    return { path: storagePath, error: null }
  } catch (err) {
    console.error('Error uploading storefront background:', err)
    return { path: null, error: err }
  }
}

/**
 * Saves the background path to site_settings (upsert).
 * Admin-only — RLS enforced server-side.
 * @param {string} storagePath
 * @returns {Promise<{ error: Error|null }>}
 */
export async function saveStorefrontBackgroundSetting(storagePath) {
  try {
    const { error } = await supabase
      .from(SETTINGS_TABLE)
      .upsert({ key: BG_SETTING_KEY, value: storagePath }, { onConflict: 'key' })

    if (error) throw error
    return { error: null }
  } catch (err) {
    console.error('Error saving storefront background setting:', err)
    return { error: err }
  }
}

/**
 * Removes the storefront background setting and optionally deletes the storage file.
 * @param {string|null} currentPath - The current storage path to delete from storage
 * @returns {Promise<{ error: Error|null }>}
 */
export async function removeStorefrontBackground(currentPath) {
  try {
    // Delete the setting row
    const { error: deleteErr } = await supabase
      .from(SETTINGS_TABLE)
      .delete()
      .eq('key', BG_SETTING_KEY)

    if (deleteErr) throw deleteErr

    // Clean up the file from storage if we have a path
    if (currentPath) {
      await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .remove([currentPath])
    }

    return { error: null }
  } catch (err) {
    console.error('Error removing storefront background:', err)
    return { error: err }
  }
}

/**
 * Deletes old background file from storage (cleanup after replacement).
 * @param {string} oldPath
 */
export async function deleteOldBackgroundFile(oldPath) {
  if (!oldPath) return
  try {
    await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove([oldPath])
  } catch (err) {
    console.warn('Could not delete old background file:', err)
  }
}
