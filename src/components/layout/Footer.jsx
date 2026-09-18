import { Link } from 'react-router-dom'
import { MessageCircle, Phone, Lock } from 'lucide-react'
import {
  BOUTIQUE_CONFIG,
  createWhatsAppGeneralLink,
  isWhatsAppConfigured,
  isPhoneConfigured,
} from '../../config/boutique'

export function Footer() {
  const currentYear = new Date().getFullYear()
  const whatsappUrl = isWhatsAppConfigured ? createWhatsAppGeneralLink() : null

  return (
    <footer className="bg-stone-950 text-stone-300 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand & Summary */}
          <div className="space-y-4">
            <div>
              <span className="font-serif text-2xl font-bold tracking-[0.25em] text-white uppercase">
                {BOUTIQUE_CONFIG.brandName}
              </span>
              <p className="text-[10px] tracking-[0.25em] text-[#dec07e] uppercase font-medium">
                {BOUTIQUE_CONFIG.businessName}
              </p>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
              Contemporary Nigerian fashion pieces and boutique collections for CHIZY by Mimiandwizzy Boutique.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm uppercase tracking-widest text-white font-semibold">
              Explore
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <Link to="/" className="hover:text-[#dec07e] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/catalogue" className="hover:text-[#dec07e] transition-colors">
                  Full Catalogue
                </Link>
              </li>
              <li>
                <Link to="/catalogue?featured=true" className="hover:text-[#dec07e] transition-colors">
                  Featured Pieces
                </Link>
              </li>
              <li>
                <a href="#about" className="hover:text-[#dec07e] transition-colors">
                  About Boutique
                </a>
              </li>
            </ul>
          </div>

          {/* How to Order */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm uppercase tracking-widest text-white font-semibold">
              Ordering
            </h4>
            <div className="text-xs text-stone-400 space-y-2 leading-relaxed">
              <p>1. Browse boutique catalogue pieces.</p>
              <p>2. Tap WhatsApp or call to inquire and agree on an order.</p>
              <p>3. Complete payment via the boutique owner&apos;s bank transfer details, and arrange delivery.</p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm uppercase tracking-widest text-white font-semibold">
              Connect
            </h4>
            <div className="space-y-3 text-xs text-stone-400">
              {isPhoneConfigured && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#dec07e] shrink-0" />
                  <a
                    href={`tel:${BOUTIQUE_CONFIG.phoneNumber}`}
                    className="hover:text-white transition-colors"
                  >
                    {BOUTIQUE_CONFIG.phoneNumber}
                  </a>
                </div>
              )}

              {whatsappUrl && (
                <div className="pt-1">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs bg-emerald-700/80 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-xs transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat on WhatsApp
                  </a>
                </div>
              )}

              {!isPhoneConfigured && !whatsappUrl && (
                <p className="text-xs text-stone-500 italic">
                  Contact details can be configured via environment variables.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-500 gap-4">
          <p>
            &copy; {currentYear} {BOUTIQUE_CONFIG.brandName} &bull; {BOUTIQUE_CONFIG.businessName}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 hover:text-stone-300 transition-colors"
            >
              <Lock className="w-3 h-3" />
              <span>Admin Access</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
