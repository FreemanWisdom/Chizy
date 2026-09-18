import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export function ProtectedRoute({ children }) {
  const { user, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border border-stone-700 border-t-[#dec07e] animate-spin mx-auto flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#dec07e] animate-spin" />
          </div>
          <div>
            <p className="font-serif text-lg text-white font-medium tracking-wide">
              CHIZY BOUTIQUE
            </p>
            <p className="text-xs text-stone-400">Verifying administrator credentials...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return children
}
