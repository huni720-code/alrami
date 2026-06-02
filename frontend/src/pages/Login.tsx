import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi, userApi, contractApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const KAKAO_CLIENT_ID = import.meta.env.VITE_KAKAO_CLIENT_ID
const KAKAO_REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI

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
    const redirectUri = fromOnboarding
      ? `${KAKAO_REDIRECT_URI}?provider=kakao&from=onboarding`
      : `${KAKAO_REDIRECT_URI}?provider=kakao`
    const url = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=account_email,phone_number`
    window.location.href = url
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center px-6" style={{ paddingTop: '10vh' }}>
      <div className="w-full max-w-sm mx-auto">

        {/* 헤더 */}
        <div className="mb-10">
          <p className="text-[15px] font-bold text-[#10b981] mb-6 tracking-tight">만기톡</p>
          {searchParams.get('from') === 'hook' ? (
            <>
              <h1 className="text-[28px] font-extrabold text-gray-900 leading-tight mb-2">
                만기 알림 켜기
              </h1>
              <p className="text-[16px] text-gray-400">로그인하면 약정이 바로 저장돼요</p>
            </>
          ) : fromOnboarding ? (
            <>
              <h1 className="text-[28px] font-extrabold text-gray-900 leading-tight mb-2">
                거의 다 됐어요!
              </h1>
              <p className="text-[16px] text-gray-400">계정을 만들면 약정 감시가 시작돼요</p>
            </>
          ) : (
            <>
              <h1 className="text-[28px] font-extrabold text-gray-900 leading-tight mb-2">
                알림 받으려면 로그인
              </h1>
              <p className="text-[16px] text-gray-400">약정 만료일을 대신 지켜드릴게요</p>
            </>
          )}
        </div>

        <div className="space-y-3">
          {/* 카카오 로그인 */}
          <button
            type="button"
            onClick={handleKakao}
            disabled={!KAKAO_CLIENT_ID}
            className="w-full flex items-center justify-center gap-2.5 bg-[#FEE500] disabled:opacity-40
              text-[#3C1E1E] font-bold py-[17px] rounded-2xl text-[16px] transition-all active:scale-[0.98]"
          >
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M9 1.5C4.858 1.5 1.5 4.134 1.5 7.373c0 2.07 1.362 3.888 3.42 4.932l-.872 3.258c-.077.287.267.52.513.35l3.875-2.58A9.1 9.1 0 009 13.245c4.142 0 7.5-2.634 7.5-5.872C16.5 4.134 13.142 1.5 9 1.5z" fill="#3C1E1E"/>
            </svg>
            카카오로 1초 시작하기
          </button>

          {/* 이메일 로그인 토글 */}
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-100" />
            <button
              type="button"
              onClick={() => setShowEmail((v) => !v)}
              className="mx-3 text-[13px] text-gray-400 whitespace-nowrap"
            >
              {showEmail ? '이메일 숨기기 ▲' : '이메일로 로그인 ▼'}
            </button>
            <div className="flex-grow border-t border-gray-100" />
          </div>

          {showEmail && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-[15px] outline-none focus:ring-2 focus:ring-[#10b981]"
                placeholder="이메일"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-[15px] outline-none focus:ring-2 focus:ring-[#10b981]"
                placeholder="비밀번호"
              />
              {error && (
                <p className="text-[13px] text-red-500 text-center bg-red-50 rounded-xl py-2">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#10b981] disabled:opacity-50 text-white font-bold py-[17px] rounded-2xl text-[16px]"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[14px] text-gray-400 mt-8">
          계정이 없으신가요?{' '}
          <Link to="/register" className="text-[#10b981] font-bold">
            이메일로 가입
          </Link>
        </p>

        <p className="text-center text-[12px] text-gray-300 mt-4">
          🔒 개인정보는 암호화 저장되며 외부 제공 없음
        </p>
      </div>
    </div>
  )
}
