import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './store/auth'
import { LoginPage } from './pages/LoginPage'
import { PdvPage } from './pages/PdvPage'
import { AdminLayout } from './components/AdminLayout'
import { ProductsPage } from './pages/ProductsPage'
import { IngredientsPage } from './pages/IngredientsPage'
import { MachinesPage } from './pages/MachinesPage'
import { CustomersPage } from './pages/CustomersPage'
import { ElectricityPage } from './pages/ElectricityPage'
import { UsersPage } from './pages/UsersPage'
import type { ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, role } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (role !== 'admin') return <Navigate to="/pdv" replace />
  return <>{children}</>
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/pdv"
              element={
                <RequireAuth>
                  <PdvPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index element={<Navigate to="products" replace />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="ingredients" element={<IngredientsPage />} />
              <Route path="machines" element={<MachinesPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="electricity" element={<ElectricityPage />} />
              <Route path="users" element={<UsersPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/pdv" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
