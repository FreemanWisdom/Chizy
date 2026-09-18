import { Link } from 'react-router-dom'
import { MessageCircle, Eye, Sparkles } from 'lucide-react'
import { formatNaira } from '../../config/currency'
import { getProductImageUrl } from '../../lib/imageUtils'
import { createWhatsAppOrderLink } from '../../config/boutique'
import { Badge } from '../common/Badge'

export function ProductCard({ product }) {
  if (!product) return null

  // Pick first image sorted by sort_order
  const sortedImages = [...(product.product_images || [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  )
  const primaryImage = sortedImages[0]
  const imageUrl = primaryImage?.storage_path
    ? getProductImageUrl(primaryImage.storage_path)
    : null

  const formattedPrice = formatNaira(product.price)
  const productDetailUrl = `/product/${product.slug}`
  const fullPageUrl = typeof window !== 'undefined' ? `${window.location.origin}${productDetailUrl}` : ''

  const whatsappUrl = createWhatsAppOrderLink({
    productName: product.name,
    priceFormatted: formattedPrice,
    productUrl: fullPageUrl,
  })

  return (
    <div className="group relative bg-white rounded-sm border border-stone-200/90 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-md hover:border-stone-300">
      {/* Image Container with Badges */}
      <div className="relative aspect-4/5 w-full overflow-hidden bg-stone-100">
        <Link to={productDetailUrl} className="block w-full h-full">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={primaryImage?.alt_text || product.name}
              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-400 p-4 text-center">
              <span className="font-serif text-3xl font-light text-stone-300 mb-1">CHIZY</span>
              <span className="text-[10px] uppercase tracking-wider text-stone-400">
                Photo Coming Soon
              </span>
            </div>
          )}
        </Link>

        {/* Featured Tag Badge */}
        {product.is_featured && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <Badge variant="featured" size="sm" className="shadow-xs flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Featured</span>
            </Badge>
          </div>
        )}

        {/* Action Buttons: Desktop Hover / Mobile Touch Overlay */}
        <div className="absolute inset-x-2 bottom-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
          <Link
            to={productDetailUrl}
            className="flex-1 bg-stone-950/90 hover:bg-stone-950 text-white text-[11px] font-semibold py-2 px-3 rounded-xs shadow-md backdrop-blur-xs flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Piece</span>
          </Link>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xs shadow-md flex items-center justify-center transition-colors shrink-0"
              title="Order directly on WhatsApp"
              aria-label={`Order ${product.name} on WhatsApp`}
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Product Content Details */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1">
          {product.categories?.name && (
            <span className="text-[10px] tracking-[0.15em] uppercase text-[#b08d5b] font-semibold block">
              {product.categories.name}
            </span>
          )}

          <h3 className="font-serif text-sm sm:text-base font-bold text-stone-950 group-hover:text-[#b08d5b] transition-colors line-clamp-1">
            <Link to={productDetailUrl}>{product.name}</Link>
          </h3>
        </div>

        <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
          <div className="text-sm sm:text-base font-bold text-stone-950 tracking-tight">
            {formattedPrice}
          </div>

          <Link
            to={productDetailUrl}
            className="text-[11px] font-bold text-[#b08d5b] hover:text-stone-950 uppercase tracking-wider transition-colors"
          >
            Details &rarr;
          </Link>
        </div>
      </div>
    </div>
  )
}

