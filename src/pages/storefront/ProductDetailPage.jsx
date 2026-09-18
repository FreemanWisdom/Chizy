import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  Sparkles,
  Truck,
  CreditCard,
  Share2,
  Check,
  ShoppingBag,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { formatNaira } from '../../config/currency'
import { getProductImageUrl } from '../../lib/imageUtils'
import {
  BOUTIQUE_CONFIG,
  createWhatsAppOrderLink,
  isWhatsAppConfigured,
  isPhoneConfigured,
} from '../../config/boutique'
import { Badge } from '../../components/common/Badge'
import { SkeletonDetail } from '../../components/common/Skeleton'
import { ProductCard } from '../../components/storefront/ProductCard'

export function ProductDetailPage() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [copiedLink, setCopiedLink] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    const loadProductDetails = async () => {
      try {
        setLoading(true)
        setError(null)
        setSelectedImageIndex(0)

        // Fetch product with categories and product_images
        const { data, error: fetchError } = await supabase
          .from('products')
          .select(`
            id,
            category_id,
            name,
            slug,
            description,
            price,
            is_published,
            is_featured,
            created_at,
            categories ( id, name, slug ),
            product_images ( id, storage_path, alt_text, sort_order )
          `)
          .eq('slug', slug)
          .eq('is_published', true)
          .maybeSingle()

        if (fetchError) throw fetchError

        if (!data) {
          if (isMounted) setError('Piece not found or currently unavailable.')
          return
        }

        if (isMounted) {
          // Sort images by sort_order
          if (data.product_images) {
            data.product_images.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          }
          setProduct(data)

          // Fetch related items from the same category
          if (data.category_id) {
            const { data: related } = await supabase
              .from('products')
              .select(`
                id,
                name,
                slug,
                description,
                price,
                is_published,
                is_featured,
                categories ( id, name, slug ),
                product_images ( id, storage_path, alt_text, sort_order )
              `)
              .eq('category_id', data.category_id)
              .eq('is_published', true)
              .neq('id', data.id)
              .limit(4)

            if (isMounted && related) {
              setRelatedProducts(related)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching product details:', err)
        if (isMounted) setError('Could not load piece information. Please try again.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadProductDetails()

    return () => {
      isMounted = false
    }
  }, [slug])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <div className="h-4 w-32 bg-stone-200 rounded-sm animate-pulse" />
        </div>
        <SkeletonDetail />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-stone-900">
          {error || 'Piece not found'}
        </h2>
        <p className="text-xs text-stone-500">
          The boutique piece you requested may have been removed or is currently unavailable in the catalogue.
        </p>
        <div className="pt-4">
          <Link
            to="/catalogue"
            className="inline-flex items-center gap-2 bg-stone-900 text-stone-50 px-6 py-3 text-xs uppercase tracking-wider font-semibold rounded-xs hover:bg-stone-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Catalogue</span>
          </Link>
        </div>
      </div>
    )
  }

  const images = product.product_images || []
  const activeImage = images[selectedImageIndex]
  const activeImageUrl = activeImage ? getProductImageUrl(activeImage.storage_path) : null
  const formattedPrice = formatNaira(product.price)
  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

  const whatsappOrderUrl = isWhatsAppConfigured
    ? createWhatsAppOrderLink({
        productName: product.name,
        priceFormatted: formattedPrice,
        productUrl: currentUrl,
      })
    : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      {/* Navigation Breadcrumb */}
      <nav className="flex items-center justify-between text-xs text-stone-500 border-b border-stone-200/80 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/" className="hover:text-stone-900 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link to="/catalogue" className="hover:text-stone-900 transition-colors">
            Catalogue
          </Link>
          {product.categories?.name && (
            <>
              <span>/</span>
              <Link
                to={`/catalogue?category=${product.categories.id}`}
                className="hover:text-stone-900 transition-colors"
              >
                {product.categories.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-stone-900 font-medium truncate max-w-[200px]">
            {product.name}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1.5 text-stone-600 hover:text-stone-950 transition-colors"
          title="Share piece link"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-medium">Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </>
          )}
        </button>
      </nav>

      {/* Main Product Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Left: Gallery (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Main Large Display Image */}
          <div className="relative aspect-3/4 w-full bg-stone-100 rounded-sm overflow-hidden border border-stone-200">
            {activeImageUrl ? (
              <img
                src={activeImageUrl}
                alt={activeImage?.alt_text || product.name}
                className="w-full h-full object-cover object-center transition-all duration-300"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 p-8 text-center">
                <span className="font-serif text-4xl text-stone-300 mb-2">CHIZY</span>
                <span className="text-xs uppercase tracking-wider">Photo coming soon</span>
              </div>
            )}

            {product.is_featured && (
              <div className="absolute top-4 left-4">
                <Badge variant="featured" size="md" className="shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Featured Piece</span>
                </Badge>
              </div>
            )}
          </div>

          {/* Thumbnail Strip (if multiple photos) */}
          {images.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {images.map((img, idx) => {
                const thumbUrl = getProductImageUrl(img.storage_path)
                const isSelected = idx === selectedImageIndex
                return (
                  <button
                    key={img.id || idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`aspect-square rounded-xs overflow-hidden border-2 transition-all ${
                      isSelected
                        ? 'border-stone-900 ring-2 ring-stone-900/20'
                        : 'border-stone-200 hover:border-stone-400 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={thumbUrl}
                      alt={img.alt_text || `${product.name} thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Info, Price, Ordering CTAs (6 cols) */}
        <div className="lg:col-span-6 space-y-6 lg:pl-4">
          <div className="space-y-2 border-b border-stone-200 pb-6">
            {product.categories?.name && (
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b08d5b] block">
                {product.categories.name}
              </span>
            )}
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-950 tracking-tight leading-tight">
              {product.name}
            </h1>
            <div className="pt-2">
              <span className="text-2xl sm:text-3xl font-bold text-stone-950 tracking-tight">
                {formattedPrice}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-900">
              Piece Details
            </h3>
            <div className="text-stone-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-light">
              {product.description ||
                'Selected piece from CHIZY by Mimiandwizzy Boutique. Contact the boutique for availability and ordering.'}
            </div>
          </div>

          {/* Order Actions */}
          <div className="space-y-3 pt-4 border-t border-stone-200">
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-900 mb-2">
              Order This Piece
            </div>

            {/* WhatsApp Order Button */}
            {whatsappOrderUrl ? (
              <a
                href={whatsappOrderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm uppercase tracking-wider py-4 px-6 rounded-xs shadow-md transition-all active:scale-[0.99]"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Order via WhatsApp</span>
              </a>
            ) : (
              <div className="p-3 bg-stone-100 rounded-sm text-xs text-stone-600 text-center">
                WhatsApp ordering line can be configured via environment variables.
              </div>
            )}

            {/* Call Direct (only if configured) */}
            {isPhoneConfigured && (
              <a
                href={`tel:${BOUTIQUE_CONFIG.phoneNumber}`}
                className="w-full flex items-center justify-center gap-2 border border-stone-300 hover:border-stone-900 text-stone-800 text-xs sm:text-sm font-medium tracking-wide py-3.5 px-6 rounded-xs hover:bg-stone-50 transition-colors"
              >
                <Phone className="w-4 h-4 text-[#b08d5b]" />
                <span>Call Boutique ({BOUTIQUE_CONFIG.phoneNumber})</span>
              </a>
            )}
          </div>

          {/* Order Process Notice Box */}
          <div className="bg-stone-50 border border-stone-200 rounded-sm p-4 space-y-3 text-xs text-stone-600">
            <div className="flex items-center gap-2 text-stone-900 font-semibold uppercase tracking-wider text-[11px]">
              <ShoppingBag className="w-4 h-4 text-[#b08d5b]" />
              <span>Ordering Information</span>
            </div>
            <ul className="space-y-2 text-[11px] text-stone-600 list-disc pl-4">
              <li>
                <strong>Direct Contact:</strong> Tapping Order sends this piece&apos;s name and link directly to the boutique.
              </li>
              <li>
                <strong>Payment:</strong> The boutique owner will confirm availability and provide bank transfer details.
              </li>
              <li>
                <strong>Delivery:</strong> Handled by the owner according to existing dispatch arrangement.
              </li>
            </ul>
          </div>

          {/* Factual features */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <Truck className="w-4 h-4 text-[#b08d5b] shrink-0" />
              <span>Arranged Dispatch</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <CreditCard className="w-4 h-4 text-[#b08d5b] shrink-0" />
              <span>Bank Transfer Payment</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Pieces Section */}
      {relatedProducts.length > 0 && (
        <section className="pt-16 border-t border-stone-200 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl font-bold text-stone-950">
              More From This Category
            </h3>
            <Link
              to={`/catalogue?category=${product.category_id}`}
              className="text-xs font-semibold uppercase tracking-wider text-[#b08d5b] hover:text-stone-950 transition-colors"
            >
              View More &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
