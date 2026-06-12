import { useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../lib/api'
import { useToast } from '../components/Toast'

type Step = 'phone' | 'reset'

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const handleRequestCode = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.forgotPassword({ phone })
      showToast(res.data.message)
      setStep('reset')
    } catch {
      setError('잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (code.length !== 6) {
      setError('인증코드 6자리를 입력해 주세요.')
      return
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword({ phone, code, new_password: password })
      navigate('/login', { state: { message: '비밀번호를 바꿨어요. 로그인해 주세요.' } })
    } catch (err: any) {
      setError(err.response?.data?.detail || '인증코드가 올바르지 않거나 만료됐어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 상단 바 */}
      <div className="px-4 pt-3">
        {step === 'phone' ? (
          <Link
            to="/login"
            aria-label="뒤로"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] -ml-2 text-gray-400 active:text-gray-600"
          >
            <ChevronLeft size={24} />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              setError('')
              setStep('phone')
            }}
            aria-label="뒤로"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] -ml-2 text-gray-400 active:text-gray-600"
          >
            <ChevronLeft size={24} />
          </button>
        )}
      </div>

      {/* 본문 */}
      <div className="flex-1 px-6 pt-6">
        <div className="w-full max-w-sm mx-auto">
          {step === 'phone' ? (
            <form id="forgot-form" onSubmit={handleRequestCode}>
              <h1 className="text-[26px] font-extrabold text-gray-900 leading-tight mb-2">
                비밀번호 재설정
              </h1>
              <p className="text-[15px] text-gray-400 mb-8">
                가입한 전화번호로 인증코드를 보내드려요
              </p>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                required
                autoFocus
                inputMode="numeric"
                className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-[15px] outline-none focus:ring-2 focus:ring-[#10b981]"
                placeholder="전화번호 (예: 01012345678)"
              />
              {error && (
                <p className="text-[13px] text-red-500 text-center bg-red-50 rounded-xl py-2 px-3 mt-3">
                  {error}
                </p>
              )}
            </form>
          ) : (
            <form id="forgot-form" onSubmit={handleReset}>
              <h1 className="text-[26px] font-extrabold text-gray-900 leading-tight mb-2">
                새 비밀번호 설정
              </h1>
              <p className="text-[15px] text-gray-400 mb-8">
                {phone}로 보낸 인증코드를 입력해 주세요
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  inputMode="numeric"
                  autoFocus
                  className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-[15px] tracking-[0.3em] outline-none focus:ring-2 focus:ring-[#10b981]"
                  placeholder="인증코드 6자리"
                />
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full bg-gray-50 rounded-2xl px-4 py-4 pr-12 text-[15px] outline-none focus:ring-2 focus:ring-[#10b981]"
                    placeholder="새 비밀번호 (8자 이상)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 active:text-gray-600"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-[15px] outline-none focus:ring-2 focus:ring-[#10b981]"
                  placeholder="새 비밀번호 확인"
                />
              </div>
              {error && (
                <p className="text-[13px] text-red-500 text-center bg-red-50 rounded-xl py-2 px-3 mt-3">
                  {error}
                </p>
              )}
            </form>
          )}
        </div>
      </div>

      {/* 하단 고정 CTA */}
      <div className="px-6 pb-8 pt-3">
        <div className="w-full max-w-sm mx-auto">
          <button
            type="submit"
            form="forgot-form"
            disabled={loading}
            className="w-full bg-[#10b981] disabled:opacity-50 text-white font-bold py-[17px] rounded-2xl text-[16px]"
          >
            {step === 'phone'
              ? loading
                ? '보내는 중...'
                : '인증코드 받기'
              : loading
                ? '변경 중...'
                : '변경하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
