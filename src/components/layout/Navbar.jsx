import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Phone, MessageCircle, Lock, Sparkles } from 'lucide-react'
import {
  BOUTIQUE_CONFIG,
  createWhatsAppGeneralLink,
  isWhatsAppConfigured,
  isPhoneConfigured,
} from '../../config/boutique'
import { useAuth } from '../../context/AuthContext'

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const { isAdmin } = useAuth()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/catalogue' },
    { name: 'Categories', path: '/catalogue#categories' },
    { name: 'About', path: '/#about' },
    { name: 'Contact', path: '/#contact' },
  ]

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' && !location.search && !location.hash
    if (path === '/catalogue') return location.pathname === '/catalogue' && !location.search
    return location.pathname + location.hash === path
  }

  const whatsappInquiryUrl = isWhatsAppConfigured ? createWhatsAppGeneralLink() : null

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-xs border-b border-stone-200/80'
          : 'bg-white border-b border-stone-100'
      }`}
    >
      {/* Top boutique announcement bar */}
      <div className="bg-stone-950 text-stone-300 text-[10px] sm:text-xs py-1.5 px-4 text-center tracking-widest uppercase flex items-center justify-center gap-2 font-medium">
        <Sparkles className="w-3 h-3 text-[#dec07e]" />
        <span>Mimiandwizzy Boutique &bull; CHIZY Fashion Collection</span>
        <Sparkles className="w-3 h-3 text-[#dec07e]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Mobile menu toggle button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-stone-800 hover:text-stone-950 p-2 focus:outline-none rounded-sm border border-stone-200"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Brand Logo */}
          <div className="flex flex-col items-center md:items-start">
            <Link to="/" className="group text-center md:text-left">
              <span className="font-serif text-2xl sm:text-3xl font-bold tracking-[0.25em] text-stone-950 uppercase group-hover:text-stone-800 transition-colors">
                {BOUTIQUE_CONFIG.brandName}
              </span>
              <span className="block text-[9px] sm:text-[10px] tracking-[0.3em] uppercase text-stone-500 font-medium -mt-1">
                {BOUTIQUE_CONFIG.businessName}
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-xs uppercase tracking-[0.18em] font-medium transition-colors py-1 relative ${
                  isActive(link.path)
                    ? 'text-stone-950 font-semibold after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1.5px] after:bg-[#b08d5b]'
                    : 'text-stone-600 hover:text-stone-950'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Header Actions */}
          <div className="flex items-center space-x-3">
            {/* Phone Call Button */}
            {isPhoneConfigured && (
              <a
                href={`tel:${BOUTIQUE_CONFIG.phoneNumber}`}
                className="hidden lg:inline-flex items-center gap-1.5 text-xs text-stone-700 hover:text-stone-950 px-3 py-2 border border-stone-200 rounded-xs transition-colors"
                title="Call Boutique"
              >
                <Phone className="w-3.5 h-3.5 text-[#b08d5b]" />
                <span className="font-medium">{BOUTIQUE_CONFIG.phoneNumber}</span>
              </a>
            )}

            {/* Shop Collection CTA */}
            <Link
              to="/catalogue"
              className="inline-flex items-center gap-2 bg-stone-950 hover:bg-stone-800 text-stone-50 text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-xs transition-all shadow-xs"
            >
              <span>Shop Collection</span>
            </Link>

            {/* Admin Portal Shortcut */}
            <Link
              to={isAdmin ? '/admin' : '/admin/login'}
              className="text-stone-400 hover:text-stone-950 p-2 rounded-xs transition-colors"
              title={isAdmin ? 'Admin Dashboard' : 'Admin Portal'}
              aria-label="Admin Portal"
            >
              <Lock className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white shadow-xl animate-in slide-in-from-top duration-200">
          <div className="px-5 pt-4 pb-6 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block text-sm uppercase tracking-wider py-3 font-medium border-b border-stone-100 ${
                  isActive(link.path)
                    ? 'text-stone-950 font-bold border-[#b08d5b]'
                    : 'text-stone-700 hover:text-stone-950'
                }`}
              >
                {link.name}
              </Link>
            ))}

            <div className="pt-4 space-y-2">
              <Link
                to="/catalogue"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full bg-stone-950 text-white text-xs font-semibold uppercase tracking-wider py-3.5 rounded-xs shadow-sm"
              >
                Shop Collection
              </Link>

              {whatsappInquiryUrl && (
                <a
                  href={whatsappInquiryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold uppercase tracking-wider py-3 rounded-xs shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat on WhatsApp
                </a>
              )}

              {isPhoneConfigured && (
                <a
                  href={`tel:${BOUTIQUE_CONFIG.phoneNumber}`}
                  className="flex items-center justify-center gap-2 w-full border border-stone-300 text-stone-800 text-xs font-medium tracking-wide py-2.5 rounded-xs hover:bg-stone-50"
                >
                  <Phone className="w-3.5 h-3.5 text-[#b08d5b]" />
                  Call {BOUTIQUE_CONFIG.phoneNumber}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
