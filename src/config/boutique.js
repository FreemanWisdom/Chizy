/**
 * Central configuration for CHIZY (Mimiandwizzy Boutique)
 * Centralizes contact details and WhatsApp order context.
 * Does not invent phone numbers or physical locations.
 */

export const BOUTIQUE_CONFIG = {
  brandName: 'CHIZY',
  businessName: 'Mimiandwizzy Boutique',
  tagline: 'Contemporary Nigerian Fashion & Boutique Collections',
  description: 'Curated fashion pieces and distinctive collections for CHIZY by Mimiandwizzy Boutique.',
  currencyCode: 'NGN',
  currencySymbol: '₦',

  // Contact numbers: configured via environment variables
  // WhatsApp: digits only with country code (e.g., 2348012345678)
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER || '',
  // Phone for direct calls and display (e.g., +234 801 234 5678)
  phoneNumber: import.meta.env.VITE_PHONE_NUMBER || '',
}

/**
 * Indicates whether WhatsApp contact has been configured
 */
export const isWhatsAppConfigured = Boolean(
  (BOUTIQUE_CONFIG.whatsappNumber || '').replace(/[^0-9]/g, '')
)

/**
 * Indicates whether direct phone calling has been configured
 */
export const isPhoneConfigured = Boolean(
  BOUTIQUE_CONFIG.phoneNumber && BOUTIQUE_CONFIG.phoneNumber.trim()
)

/**
 * Builds a formatted WhatsApp order URL with pre-filled product context.
 * Returns null if WhatsApp number is not yet configured.
 * @param {Object} options
 * @param {string} options.productName
 * @param {string|number} options.priceFormatted
 * @param {string} [options.productUrl]
 * @returns {string|null} WhatsApp direct link or null if unconfigured
 */
export function createWhatsAppOrderLink({ productName, priceFormatted, productUrl }) {
  const cleanNumber = (BOUTIQUE_CONFIG.whatsappNumber || '').replace(/[^0-9]/g, '')
  if (!cleanNumber) return null

  const lines = [
    `Hello CHIZY,`,
    ``,
    `I would like to order: *${productName}*`,
    `Price: *${priceFormatted}*`,
  ]

  if (productUrl) {
    lines.push(`Product Link: ${productUrl}`)
  }

  lines.push(``)
  lines.push(`Please confirm piece availability and payment transfer details.`)

  const encodedMessage = encodeURIComponent(lines.join('\n'))
  return `https://wa.me/${cleanNumber}?text=${encodedMessage}`
}

/**
 * Builds a general inquiry WhatsApp URL.
 * Returns null if WhatsApp number is not yet configured.
 * @param {string} [customMessage]
 * @returns {string|null} WhatsApp direct link or null if unconfigured
 */
export function createWhatsAppGeneralLink(customMessage) {
  const cleanNumber = (BOUTIQUE_CONFIG.whatsappNumber || '').replace(/[^0-9]/g, '')
  if (!cleanNumber) return null

  const defaultMsg = `Hello CHIZY, I would like to make an inquiry regarding your boutique collection.`
  const encoded = encodeURIComponent(customMessage || defaultMsg)
  return `https://wa.me/${cleanNumber}?text=${encoded}`
}
