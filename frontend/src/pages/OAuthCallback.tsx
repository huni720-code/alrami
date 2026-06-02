import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api, { userApi, contractApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

async function applyPendingProfile() {
  const raw = sessionStorage.getItem('pending_profile')
  if (!raw) return false
  try {
    const data = JSON.parse(raw)
    await userApi.updateProfile(data)
    sessionStorage.removeItem('pending_profile')
    return true
  } catch {
    return false
  }
}

async function applyPendingContract() {
  const raw = sessionStorage.getItem('pending_contract')
  if (!raw) return false
  try {
    const data = JSON.parse(raw)
    await contractApi.create(data)
    sessionStorage.removeItem('pending_contract')
    return true
  } catch {
    return false
  }
}

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
    const fromOnboarding = searchParams.get('from') === 'onboarding'
    const error = searchParams.get('error')

    if (error || !code || provider !== 'kakao') {
      navigate('/login')
      return
    }

    const endpoint = '/auth/kakao/callback'

    api.post<{ access_token: string }>(endpoint, { code })
      .then(async (res) => {
        await login(res.data.access_token)
        const hadContract = await applyPendingContract()
        const hadPending = await applyPendingProfile()
        if (hadPending) {
          navigate('/onboarding/complete')
        } else if (hadContract) {
          navigate('/contracts/grid')
        } else if (fromOnboarding) {
          navigate('/onboarding/step3')
        } else {
          navigate('/dashboard')
        }
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
