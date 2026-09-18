/**
 * Formats a numeric price into Nigerian Naira currency representation (₦)
 * e.g., 25000 -> ₦25,000
 * @param {number|string} amount
 * @returns {string} Formatted Naira string
 */
export function formatNaira(amount) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '₦0'
  }

  const num = Number(amount)
  
  // Format with commas, omitting decimal cents if round number
  const formatted = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num)

  // Ensure consistent ₦ symbol display across operating systems/locales
  return formatted.replace(/NGN\s?/, '₦')
}
