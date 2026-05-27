import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '../lib/api'
import type { User } from '../lib/api'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'))
  const [loading, setLoading] = useState(true)
  // login() 내부에서 직접 /me를 호출할 때 useEffect 중복 실행 방지
  const skipEffectRef = useRef(false)

  useEffect(() => {
    if (skipEffectRef.current) {
      skipEffectRef.current = false
      setLoading(false)
      return
    }
    if (token) {
      authApi.me()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('access_token')
          setToken(null)
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (newToken: string) => {
    localStorage.setItem('access_token', newToken)
    skipEffectRef.current = true   // useEffect가 /me 중복 호출하지 않도록 skip
    setToken(newToken)
    const res = await authApi.me()
    setUser(res.data)
    setLoading(false)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
