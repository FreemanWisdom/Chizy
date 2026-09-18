import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import heroImage from '../../assets/hero 1.jpeg'

export function Hero() {
  return (
    <section 
      className="relative bg-slate-900 text-white min-h-[85vh] flex items-center justify-center lg:justify-start overflow-hidden"
    >
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url('${heroImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
        }}
      >
        {/* Minimal gradient for text readability while keeping image bright */}
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-slate-950/80 via-slate-900/40 to-transparent mix-blend-multiply" />
        <div className="absolute inset-0 bg-slate-900/20" />
      </div>

      <div className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl space-y-6 md:space-y-8 text-center md:text-left pt-12 md:pt-0">
          <div className="inline-block">
            <span className="font-bold text-lg sm:text-xl tracking-[0.3em] uppercase text-white/90 drop-shadow-sm">
              CHIZY
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white drop-shadow-md uppercase leading-[1.1]">
              Trending. Clean.
            </h1>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white/90 drop-shadow-sm uppercase leading-[1.2]">
              Made for everyday style.
            </h2>
          </div>

          <div className="pt-6">
            <Link
              to="/catalogue"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-8 py-4 text-sm font-bold uppercase tracking-widest rounded-md transition-all shadow-lg hover:shadow-xl active:scale-95"
            >
              <span>Shop Collection</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
