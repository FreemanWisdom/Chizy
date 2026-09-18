import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

export function StorefrontLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
