import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { BOUTIQUE_CONFIG } from '../../config/boutique'

export function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 sm:py-32 text-center space-y-6">
      <span className="text-xs uppercase tracking-[0.25em] text-[#b08d5b] font-semibold">
        {BOUTIQUE_CONFIG.brandName} &bull; Page Notice
      </span>
      <h1 className="font-serif text-4xl sm:text-5xl font-bold text-stone-950">
        404
      </h1>
      <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
        The boutique page or collection you are looking for cannot be found or has moved.
      </p>
      <div className="pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-stone-900 text-stone-50 px-6 py-3 text-xs uppercase tracking-wider font-semibold rounded-xs hover:bg-stone-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  )
}
