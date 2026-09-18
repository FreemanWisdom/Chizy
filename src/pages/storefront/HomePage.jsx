import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight, CheckCircle2, MessageCircle, Phone, ShoppingBag, Grid } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { Hero } from '../../components/storefront/Hero'
import { ProductGrid } from '../../components/storefront/ProductGrid'
import {
  BOUTIQUE_CONFIG,
  createWhatsAppGeneralLink,
  isWhatsAppConfigured,
  isPhoneConfigured,
} from '../../config/boutique'

export function HomePage() {
  const [categories, setCategories] = useState([])
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [loadingFeatured, setLoadingFeatured] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        setLoadingFeatured(true)

        // 1. Fetch categories
        const { data: catData } = await supabase
          .from('categories')
          .select('id, name, slug, description')
          .eq('is_active', true)
          .order('name')

        if (isMounted && catData) {
          setCategories(catData)
        }

        // 2. Fetch featured products
        const { data, error } = await supabase
          .from('products')
          .select(`
            id,
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
          .eq('is_published', true)
          .eq('is_featured', true)
          .order('created_at', { ascending: false })
          .limit(8)

        if (error) {
          console.error('Error loading featured products:', error)
        } else if (isMounted) {
          setFeaturedProducts(data || [])
        }
      } catch (err) {
        console.error('Unexpected error loading homepage data:', err)
      } finally {
        if (isMounted) setLoadingFeatured(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  const whatsappInquiryUrl = isWhatsAppConfigured ? createWhatsAppGeneralLink() : null

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* 1. Hero Section */}
      <Hero />

      {/* 2. Shop by Category Section */}
      <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 border-b border-slate-200 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
              <Grid className="w-3.5 h-3.5" />
              <span>Collections</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Shop by Category
            </h2>
          </div>

          <Link
            to="/catalogue"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 hover:text-slate-600 transition-colors"
          >
            <span>View Full Catalogue</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {categories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/catalogue?category=${cat.id}`}
                className="group relative bg-white border border-slate-200 hover:border-slate-900 p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md min-h-[140px] rounded-md"
              >
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-xs text-slate-500 group-hover:text-slate-700 mt-2 line-clamp-2">
                      {cat.description}
                    </p>
                  )}
                </div>

                <div className="pt-6 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-900">
                  <span>Browse</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-md p-8 text-center text-sm text-slate-500">
            Browse our full collection in the catalogue.
          </div>
        )}
      </section>

      {/* 3. Featured Collection Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-12 border-b border-slate-200 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Curated Selection</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Trending Pieces
            </h2>
          </div>

          <Link
            to="/catalogue?featured=true"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 hover:text-slate-600 transition-colors"
          >
            <span>View All Featured</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <ProductGrid
          products={featuredProducts}
          loading={loadingFeatured}
          emptyTitle="Featured Pieces Coming Soon"
          emptyMessage="New featured pieces will appear here as they are added to the catalogue. Browse our full catalogue to view available pieces."
        />

        {featuredProducts.length > 0 && (
          <div className="text-center mt-12">
            <Link
              to="/catalogue"
              className="inline-flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 px-8 py-4 text-xs font-bold uppercase tracking-widest transition-all rounded-md shadow-sm"
            >
              <span>Explore Entire Catalogue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </section>

      {/* 4. Boutique / Value Statement Section */}
      <section id="about" className="bg-slate-50 border-y border-slate-200 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                About The Brand
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
                Welcome to CHIZY
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                At <strong className="text-slate-900 font-semibold">{BOUTIQUE_CONFIG.businessName}</strong>, 
                our brand <strong className="text-slate-900 font-semibold">{BOUTIQUE_CONFIG.brandName}</strong> offers 
                a focused selection of premium everyday wear.
              </p>
              <p className="text-slate-500 text-sm leading-relaxed">
                Browse our online catalogue to see current designs, product details, and prices. When you find a piece you like, contact us directly to confirm your order.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-slate-900 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Curated Selection
                    </h4>
                    <p className="text-sm text-slate-500 mt-1">Premium styling and quality materials.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-slate-900 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Direct Ordering
                    </h4>
                    <p className="text-sm text-slate-500 mt-1">Order directly with personalized service.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Card */}
            <div className="relative bg-white border border-slate-200 p-8 rounded-md shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                  Boutique Experience
                </span>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">
                  Personalized Service
                </h3>
              </div>

              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <p>
                  Ordering is simple and personal. Select any piece from our catalogue and tap the WhatsApp or phone button to contact us directly.
                </p>
                <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
                  <p className="font-bold text-slate-900 mb-1">Payment & Delivery</p>
                  <p className="text-slate-500 text-xs">
                    Payment is handled via direct bank transfer. Delivery is arranged directly upon agreement on your order.
                  </p>
                </div>
              </div>

              {whatsappInquiryUrl && (
                <div className="pt-4">
                  <a
                    href={whatsappInquiryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-widest py-4 rounded-md transition-all shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Inquire on WhatsApp</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. How Ordering Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs uppercase tracking-widest text-slate-500 font-bold block mb-2">
            Simple & Transparent
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            How Ordering Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white border border-slate-200 p-8 rounded-md space-y-4 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 text-white flex items-center justify-center text-xl font-bold shadow-sm">
              1
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Browse Catalogue
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Explore available pieces, view high-quality photos, read details, and check prices.
            </p>
          </div>

          <div className="bg-white border border-slate-200 p-8 rounded-md space-y-4 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 text-white flex items-center justify-center text-xl font-bold shadow-sm">
              2
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Contact Us
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Tap the WhatsApp or Call button on your chosen item to message us directly and confirm details.
            </p>
          </div>

          <div className="bg-white border border-slate-200 p-8 rounded-md space-y-4 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 text-white flex items-center justify-center text-xl font-bold shadow-sm">
              3
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Payment & Delivery
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Complete payment securely via direct bank transfer and agree on delivery dispatch details.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Direct Contact Banner */}
      <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-lg p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="space-y-3 text-center md:text-left">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              Inquiries & Direct Orders
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Ready to Upgrade Your Style?
            </h3>
            <p className="text-sm text-slate-300 max-w-lg leading-relaxed">
              Have questions about an item in our catalogue? Reach out to discuss availability and placing an order.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {isPhoneConfigured && (
              <a
                href={`tel:${BOUTIQUE_CONFIG.phoneNumber}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-slate-700 hover:bg-slate-800 text-white px-6 py-4 text-xs font-bold uppercase tracking-widest rounded-md transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>Call {BOUTIQUE_CONFIG.phoneNumber}</span>
              </a>
            )}

            {whatsappInquiryUrl ? (
              <a
                href={whatsappInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-8 py-4 text-xs font-bold uppercase tracking-widest rounded-md shadow-sm transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Message on WhatsApp</span>
              </a>
            ) : (
              <Link
                to="/catalogue"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-8 py-4 text-xs font-bold uppercase tracking-widest rounded-md transition-colors shadow-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Shop Collection</span>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
