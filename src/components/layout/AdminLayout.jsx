import { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
  ImageIcon,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { BOUTIQUE_CONFIG } from '../../config/boutique'

export function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
    { name: 'Products', path: '/admin/products', icon: Package },
    { name: 'Categories', path: '/admin/categories', icon: FolderTree },
    { name: 'Storefront', path: '/admin/storefront', icon: ImageIcon },
  ]

  const isNavActive = (item) => {
    if (item.exact) return location.pathname === item.path
    return location.pathname.startsWith(item.path)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      {/* Admin Top Header */}
      <header className="bg-stone-950 text-stone-100 border-b border-stone-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand & Admin Badge */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="md:hidden text-stone-300 hover:text-white p-1.5 focus:outline-none"
                aria-label="Toggle admin navigation"
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Link to="/admin" className="flex items-center gap-2">
                <span className="font-serif text-xl font-bold tracking-[0.2em] text-white">
                  {BOUTIQUE_CONFIG.brandName}
                </span>
                <span className="text-[10px] uppercase tracking-widest bg-stone-800 text-[#dec07e] font-semibold px-2 py-0.5 rounded-xs border border-stone-700 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Admin
                </span>
              </Link>
            </div>

            {/* Right: Actions (Storefront & Sign out) */}
            <div className="flex items-center gap-4 text-xs">
              <Link
                to="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 text-stone-300 hover:text-white px-3 py-1.5 rounded-xs hover:bg-stone-800 transition-colors"
                title="View customer storefront"
              >
                <span>Live Storefront</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <div className="hidden md:flex flex-col text-right">
                <span className="text-stone-300 font-medium text-[11px] truncate max-w-[180px]">
                  {user?.email}
                </span>
                <span className="text-[10px] text-stone-500">Authorized Manager</span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 bg-stone-800 hover:bg-rose-900/80 text-stone-200 hover:text-white px-3 py-1.5 rounded-xs transition-colors"
                title="Log out of admin session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col md:flex-row gap-6">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:block w-56 shrink-0">
          <nav className="bg-white rounded-lg border border-stone-200 p-3 shadow-xs space-y-1 sticky top-24">
            <div className="px-3 py-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              Management
            </div>
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isNavActive(item)
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs font-medium transition-colors ${
                    active
                      ? 'bg-stone-900 text-stone-50 font-semibold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-[#dec07e]' : 'text-stone-400'}`} />
                  <span>{item.name}</span>
                </Link>
              )
            })}

            <div className="pt-4 mt-4 border-t border-stone-100">
              <Link
                to="/"
                target="_blank"
                className="flex items-center justify-between px-3 py-2 rounded-sm text-xs text-stone-500 hover:text-stone-900 hover:bg-stone-50"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Store Preview
                </span>
                <ExternalLink className="w-3 h-3 text-stone-400" />
              </Link>
            </div>
          </nav>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileNavOpen && (
          <div className="md:hidden bg-white rounded-lg border border-stone-200 p-3 shadow-md mb-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isNavActive(item)
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs font-medium ${
                    active
                      ? 'bg-stone-900 text-stone-50 font-semibold'
                      : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-[#dec07e]' : 'text-stone-400'}`} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
