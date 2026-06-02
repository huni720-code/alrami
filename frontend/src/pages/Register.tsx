import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../lib/api'

export default function Register() {
  const [form, setForm] = useState({ email: '', username: '', phone: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (form.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    setLoading(true)
    try {
      await authApi.register({
        email: form.email,
        username: form.username,
        phone: form.phone || undefined,
        password: form.password,
      })
      navigate('/login', { state: { message: '가입 완료! 로그인해 주세요.' } })
    } catch (err: any) {
      setError(err.response?.data?.detail || '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center px-6" style={{ paddingTop: '8vh' }}>
      <div className="w-full max-w-sm mx-auto">

        {/* 헤더 */}
        <div className="mb-8">
          <p className="text-[15px] font-bold text-[#10b981] mb-5 tracking-tight">만기톡</p>
          <h1 className="text-[26px] font-extrabold text-gray-900 leading-tight mb-1">
            이메일로 시작하기
          </h1>
          <p className="text-[15px] text-gray-400">알림을 받을 정보를 입력해 주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            autoFocus
            className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-[15px] outline-none focus:ring-2 focus:ring-[#10b981]"
            placeholder="이메일 (로그인 아이디)"
          />
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            required
            className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-[15px] outline-none focus:ring-2 focus:ring-[#10b981]"
            placeholder="이름"
          />
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            inputMode="numeric"
            className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-[15px] outline-none focus:ring-2 focus:ring-[#10b981]"
            placeholder="전화번호 (알림 수신용, 예: 01012345678)"
          />
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
            className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-[15px] outline-none focus:ring-2 focus:ring-[#10b981]"
            placeholder="비밀번호 (8자 이상)"
          />
          <input
            type="password"
            name="confirm"
            value={form.confirm}
            onChange={handleChange}
            required
            className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-[15px] outline-none focus:ring-2 focus:ring-[#10b981]"
            placeholder="비밀번호 확인"
          />

          {error && (
            <p className="text-[13px] text-red-500 text-center bg-red-50 rounded-xl py-2 px-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#10b981] disabled:opacity-50 text-white font-bold py-[17px] rounded-2xl text-[16px] mt-1"
          >
            {loading ? '처리 중...' : '가입하기'}
          </button>
        </form>

        <p className="text-center text-[14px] text-gray-400 mt-7">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-[#10b981] font-bold">
            로그인
          </Link>
        </p>

        <p className="text-center text-[12px] text-gray-300 mt-3">
          가입 시 서비스 이용약관 및 개인정보처리방침에 동의합니다
        </p>
      </div>
    </div>
  )
}
