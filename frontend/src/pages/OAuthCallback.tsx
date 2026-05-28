import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const provider = searchParams.get('provider')
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error || !code || !provider) {
      navigate('/login')
      return
    }

    const endpoint = provider === 'kakao' ? '/auth/kakao/callback' : '/auth/google/callback'

    api.post<{ access_token: string }>(endpoint, { code })
      .then(async (res) => {
        await login(res.data.access_token)
        navigate('/dashboard')
      })
      .catch(() => {
        navigate('/login')
      })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-4 border-gray-100 border-t-[#10b981] animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">로그인 중...</p>
      </div>
    </div>
  )
}
