import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/common/Button'
import { BOUTIQUE_CONFIG } from '../../config/boutique'

export function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const { login, isAdmin, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Guard against redirect loops back to login
  const destination =
    location.state?.from?.pathname && location.state.from.pathname !== '/admin/login'
      ? location.state.from.pathname
      : '/admin'

  // If already logged in as admin, redirect to destination
  useEffect(() => {
    if (user && isAdmin) {
      navigate(destination, { replace: true })
    }
  }, [user, isAdmin, navigate, destination])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    const trimmedEmail = email.trim()

    // Validate empty fields prior to making request
    if (!trimmedEmail || !password) {
      setErrorMsg('Please enter both email and password.')
      return
    }

    try {
      setLoading(true)
      await login(trimmedEmail, password)
      navigate(destination, { replace: true })
    } catch (err) {
      console.error('Admin login error:', err)
      const message = err?.message || 'Login failed. Please verify your administrator credentials.'
      setErrorMsg(message)
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background styling */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-900 via-stone-950 to-black opacity-95" />
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#c5a880]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Return to storefront link */}
      <div className="relative z-10 max-w-md mx-auto w-full px-4 mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Storefront</span>
        </Link>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-900 border border-stone-800 text-[#dec07e] mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-[0.2em] text-white uppercase">
            {BOUTIQUE_CONFIG.brandName}
          </h1>
          <p className="text-xs uppercase tracking-widest text-stone-400">
            Administrator Portal &bull; Mimiandwizzy
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-stone-900/90 border border-stone-800 p-8 rounded-lg shadow-2xl backdrop-blur-xs">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-sm bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs uppercase tracking-wider font-semibold text-stone-300 mb-1.5"
              >
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@mimiandwizzy.com"
                  className="w-full bg-stone-950 border border-stone-700 rounded-sm pl-10 pr-4 py-2.5 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-[#dec07e] focus:ring-1 focus:ring-[#dec07e] transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs uppercase tracking-wider font-semibold text-stone-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-stone-950 border border-stone-700 rounded-sm pl-10 pr-4 py-2.5 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-[#dec07e] focus:ring-1 focus:ring-[#dec07e] transition-colors"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="gold"
                size="lg"
                loading={loading}
                className="w-full tracking-widest text-xs"
              >
                Secure Sign In
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-stone-800 text-center">
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Authorized personnel only. Access is verified against official boutique administrator profiles.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
