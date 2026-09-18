/**
 * Utility functions for slug generation and uniqueness validation
 */

export function generateSlug(text) {
  if (!text) return ''
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // normalize accents
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-') // collapse dashes
    .replace(/^-+/, '') // trim - from start
    .replace(/-+$/, '') // trim - from end
}

/**
 * Checks if a product slug is already taken and appends a numeric suffix if needed.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} baseSlug
 * @param {string} [excludeProductId]
 * @returns {Promise<string>} Unique slug
 */
export async function ensureUniqueProductSlug(supabase, baseSlug, excludeProductId = null) {
  const cleanBase = generateSlug(baseSlug) || 'product'
  let candidate = cleanBase
  let counter = 1

  while (true) {
    let query = supabase.from('products').select('id').eq('slug', candidate)
    if (excludeProductId) {
      query = query.neq('id', excludeProductId)
    }
    const { data, error } = await query.maybeSingle()
    if (error) {
      console.warn('Slug check query warning:', error)
      break
    }
    if (!data) {
      // Slug is available!
      return candidate
    }
    candidate = `${cleanBase}-${counter}`
    counter++
  }

  return candidate
}

/**
 * Checks if a category slug is already taken and appends a numeric suffix if needed.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} baseSlug
 * @param {string} [excludeCategoryId]
 * @returns {Promise<string>} Unique slug
 */
export async function ensureUniqueCategorySlug(supabase, baseSlug, excludeCategoryId = null) {
  const cleanBase = generateSlug(baseSlug) || 'category'
  let candidate = cleanBase
  let counter = 1

  while (true) {
    let query = supabase.from('categories').select('id').eq('slug', candidate)
    if (excludeCategoryId) {
      query = query.neq('id', excludeCategoryId)
    }
    const { data, error } = await query.maybeSingle()
    if (error) {
      console.warn('Category slug check warning:', error)
      break
    }
    if (!data) {
      return candidate
    }
    candidate = `${cleanBase}-${counter}`
    counter++
  }

  return candidate
}
