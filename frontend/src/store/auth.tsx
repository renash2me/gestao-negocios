import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { api } from '../lib/api'

interface AuthState {
  token: string | null
  role: string | null
  name: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'))
  const [role, setRole] = useState<string | null>(() => localStorage.getItem('role'))
  const [name, setName] = useState<string | null>(() => localStorage.getItem('name'))

  useEffect(() => {
    if (token) localStorage.setItem('access_token', token)
    else localStorage.removeItem('access_token')
  }, [token])

  async function login(email: string, password: string) {
    // OAuth2PasswordRequestForm espera form-urlencoded
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)

    const { data } = await api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    setToken(data.access_token)
    setRole(data.role)
    setName(data.name)
    localStorage.setItem('role', data.role)
    localStorage.setItem('name', data.name)
  }

  function logout() {
    setToken(null)
    setRole(null)
    setName(null)
    localStorage.clear()
  }

  return (
    <AuthContext.Provider
      value={{ token, role, name, isAuthenticated: !!token, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return ctx
}
