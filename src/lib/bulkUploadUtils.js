/**
 * Utility functions for Bulk Product Upload workflow
 */

export const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024 // 15MB
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]

/**
 * Converts a raw image filename into an elegant, title-cased product name.
 * e.g., 'ankara_silk_boubou_maxi_dress.jpg' -> 'Ankara Silk Boubou Maxi Dress'
 * @param {string} filename
 * @returns {string}
 */
export function cleanFilenameToName(filename) {
  if (!filename) return ''

  // 1. Remove file extension
  const withoutExt = filename.replace(/\.[^/.]+$/, '')

  // 2. Replace hyphens, underscores, dots, and multiple spaces with a single space
  const spaced = withoutExt
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!spaced) return 'New Product'

  // 3. Convert each word to Title Case
  return spaced
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join(' ')
}

/**
 * Validates a single queued bulk product item.
 * Supports fallback to shared batchSettings (category_id, price).
 * @param {Object} item
 * @param {Object} [batchSettings]
 * @returns {{ isValid: boolean, error: string|null }}
 */
export function validateBulkItem(item, batchSettings = {}) {
  if (!item.file) {
    return { isValid: false, error: 'Image file is missing.' }
  }

  // Validate image type
  const fileType = item.file.type?.toLowerCase()
  if (fileType && !SUPPORTED_IMAGE_TYPES.includes(fileType)) {
    return {
      isValid: false,
      error: `Unsupported image format (${fileType}). Please use JPG, PNG, WebP, AVIF, or GIF.`,
    }
  }

  // Validate image file size
  if (item.file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (item.file.size / (1024 * 1024)).toFixed(1)
    return {
      isValid: false,
      error: `Image file is too large (${sizeMb} MB). Maximum allowed size is 15 MB.`,
    }
  }

  // Validate product name (fallback to clean filename)
  const effectiveName = item.name?.trim() || cleanFilenameToName(item.file?.name)
  if (!effectiveName) {
    return { isValid: false, error: 'Product name is required.' }
  }

  // Validate category
  const effectiveCategory = item.category_id || batchSettings.category_id
  if (!effectiveCategory) {
    return { isValid: false, error: 'Category is required for bulk upload.' }
  }

  // Validate price
  const rawPrice =
    item.price !== '' && item.price !== null && item.price !== undefined
      ? item.price
      : batchSettings.price

  const priceNum = parseFloat(rawPrice)
  if (
    rawPrice === '' ||
    rawPrice === null ||
    rawPrice === undefined ||
    isNaN(priceNum) ||
    priceNum < 0
  ) {
    return { isValid: false, error: 'A valid price (₦ ≥ 0) is required.' }
  }

  return { isValid: true, error: null }
}


/**
 * Runs a list of asynchronous tasks with a fixed concurrency limit.
 * Bounded concurrency prevents network saturation and ensures responsive UI.
 *
 * @template T, R
 * @param {T[]} items - Items to process
 * @param {number} concurrency - Maximum simultaneous workers (e.g. 3)
 * @param {(item: T, index: number) => Promise<R>} workerFn - Worker function per item
 * @param {(index: number, result: R) => void} [onItemComplete] - Callback on item completion
 * @returns {Promise<R[]>}
 */
export async function runConcurrentQueue(items, concurrency = 3, workerFn, onItemComplete) {
  if (!items || items.length === 0) return []

  const results = new Array(items.length)
  let nextIndex = 0
  let activeWorkers = 0

  return new Promise((resolve) => {
    const startNextWorker = () => {
      while (activeWorkers < concurrency && nextIndex < items.length) {
        const currentIndex = nextIndex++
        activeWorkers++

        workerFn(items[currentIndex], currentIndex)
          .then((result) => {
            results[currentIndex] = result
            if (onItemComplete) {
              onItemComplete(currentIndex, result)
            }
          })
          .catch((err) => {
            const errorResult = { success: false, error: err }
            results[currentIndex] = errorResult
            if (onItemComplete) {
              onItemComplete(currentIndex, errorResult)
            }
          })
          .finally(() => {
            activeWorkers--
            if (nextIndex >= items.length && activeWorkers === 0) {
              resolve(results)
            } else {
              startNextWorker()
            }
          })
      }

      if (items.length === 0) {
        resolve([])
      }
    }

    startNextWorker()
  })
}
