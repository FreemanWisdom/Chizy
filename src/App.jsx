import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { StorefrontLayout } from './components/layout/StorefrontLayout'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AdminLayout } from './components/layout/AdminLayout'

// Storefront Pages
import { HomePage } from './pages/storefront/HomePage'
import { CataloguePage } from './pages/storefront/CataloguePage'
import { ProductDetailPage } from './pages/storefront/ProductDetailPage'
import { NotFoundPage } from './pages/storefront/NotFoundPage'

// Admin Pages
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminProductsPage } from './pages/admin/AdminProductsPage'
import { AdminProductEditPage } from './pages/admin/AdminProductEditPage'
import { AdminBulkUploadPage } from './pages/admin/AdminBulkUploadPage'
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage'
import { AdminStorefrontPage } from './pages/admin/AdminStorefrontPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Customer Storefront Routes */}
          <Route element={<StorefrontLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/catalogue" element={<CataloguePage />} />
            <Route path="/product/:slug" element={<ProductDetailPage />} />
            <Route path="/404" element={<NotFoundPage />} />
          </Route>

          {/* Admin Login Route */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="products/new" element={<AdminProductEditPage />} />
            <Route path="products/bulk" element={<AdminBulkUploadPage />} />
            <Route path="products/:id/edit" element={<AdminProductEditPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="storefront" element={<AdminStorefrontPage />} />
          </Route>

          {/* Catch-all fallback */}
          <Route element={<StorefrontLayout />}>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
