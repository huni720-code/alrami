import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi, userProfileApi } from '../lib/api'
import type { User, UserProfile } from '../lib/api'

interface AuthContextType {
  user: User | null
  token: string | null
  profile: UserProfile | null
  login: (token: string) => Promise<void>
  logout: () => void
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'))
  const [profile, setProfile] = useState<UserProfile | null>(null)
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
      Promise.all([authApi.me(), userProfileApi.get()])
        .then(([userRes, profileRes]) => {
          setUser(userRes.data)
          setProfile(profileRes.data)
        })
        .catch(() => {
          localStorage.removeItem('access_token')
          setToken(null)
          setUser(null)
          setProfile(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (newToken: string) => {
    localStorage.setItem('access_token', newToken)
    skipEffectRef.current = true
    setToken(newToken)
    const [userRes, profileRes] = await Promise.all([authApi.me(), userProfileApi.get()])
    setUser(userRes.data)
    setProfile(profileRes.data)
    setLoading(false)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    setToken(null)
    setUser(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    const res = await userProfileApi.get()
    setProfile(res.data)
  }

  return (
    <AuthContext.Provider value={{ user, token, profile, login, logout, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
