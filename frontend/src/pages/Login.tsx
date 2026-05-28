import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi, userApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const KAKAO_CLIENT_ID = import.meta.env.VITE_KAKAO_CLIENT_ID
const KAKAO_REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI

// 로그인 후 pending 프로필 처리 공통 함수
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

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromOnboarding = searchParams.get('from') === 'onboarding'

  const afterLogin = async () => {
    const hadPending = await applyPendingProfile()
    if (hadPending) {
      navigate('/onboarding/complete')
    } else if (fromOnboarding) {
      navigate('/onboarding/step3')
    } else {
      navigate('/dashboard')
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login({ email, password })
      await login(res.data.access_token)
      await afterLogin()
    } catch (err: any) {
      setError(err.response?.data?.detail || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleKakao = () => {
    if (!KAKAO_CLIENT_ID) return
    // from=onboarding 정보를 provider 파라미터와 함께 redirect_uri에 포함
    const redirectUri = fromOnboarding
      ? `${KAKAO_REDIRECT_URI}?provider=kakao&from=onboarding`
      : `${KAKAO_REDIRECT_URI}?provider=kakao`
    const url = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`
    window.location.href = url
  }

  const handleGoogle = () => {
    if (!GOOGLE_CLIENT_ID) return
    const redirectUri = fromOnboarding
      ? `${GOOGLE_REDIRECT_URI}?provider=google&from=onboarding`
      : `${GOOGLE_REDIRECT_URI}?provider=google`
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email+profile`
    window.location.href = url
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#10b981] mb-1">알라미</h1>
          {fromOnboarding ? (
            <>
              <p className="text-gray-800 font-semibold text-sm mt-1">거의 다 됐어요!</p>
              <p className="text-gray-500 text-xs mt-1">계정을 만들면 포트폴리오가 완성돼요</p>
            </>
          ) : (
            <p className="text-gray-500 text-sm">매달 통신·카드 절약을 자동으로</p>
          )}
        </div>

        <div className="space-y-3">
          {/* 카카오 로그인 */}
          <button
            type="button"
            onClick={handleKakao}
            disabled={!KAKAO_CLIENT_ID}
            className="w-full flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#f0d800] disabled:opacity-40 disabled:cursor-not-allowed text-[#3C1E1E] font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M9 1.5C4.858 1.5 1.5 4.134 1.5 7.373c0 2.07 1.362 3.888 3.42 4.932l-.872 3.258c-.077.287.267.52.513.35l3.875-2.58A9.1 9.1 0 009 13.245c4.142 0 7.5-2.634 7.5-5.872C16.5 4.134 13.142 1.5 9 1.5z" fill="#3C1E1E"/>
            </svg>
            카카오로 계속하기
          </button>

          {/* 구글 로그인 */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={!GOOGLE_CLIENT_ID}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            구글로 계속하기
          </button>

          {/* 이메일 로그인 토글 */}
          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-gray-200" />
            <button
              type="button"
              onClick={() => setShowEmail((v) => !v)}
              className="mx-3 text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap"
            >
              {showEmail ? '이메일 숨기기 ▲' : '이메일로 로그인 ▼'}
            </button>
            <div className="flex-grow border-t border-gray-200" />
          </div>

          {showEmail && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                placeholder="이메일"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                placeholder="비밀번호"
              />
              {error && (
                <p className="text-red-500 text-xs text-center">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#10b981] hover:bg-[#0ea572] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          계정이 없으신가요?{' '}
          <Link to="/register" className="text-[#10b981] hover:underline font-medium">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
