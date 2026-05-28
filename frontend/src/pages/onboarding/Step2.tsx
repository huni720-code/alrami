import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { recommendationApi } from '../../lib/api'
import type { QuickEstimate } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) return
    setValue(0)
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - (1 - p) * (1 - p)
      setValue(Math.floor(eased * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return value
}

export default function Step2() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const amount: number = state?.amount ?? 0

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<QuickEstimate | null>(null)
  const [error, setError] = useState(false)

  const displayTotal = useCountUp(result?.total_saving_monthly ?? 0, 1000)

  useEffect(() => {
    const start = Date.now()
    recommendationApi.quickEstimate(amount)
      .then((res) => {
        const elapsed = Date.now() - start
        setTimeout(() => {
          setResult(res.data)
          setLoading(false)
        }, Math.max(0, 1500 - elapsed))
      })
      .catch(() => {
        const elapsed = Date.now() - start
        setTimeout(() => {
          setError(true)
          setLoading(false)
        }, Math.max(0, 1500 - elapsed))
      })
  }, [amount])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-gray-100 border-t-[#10b981] animate-spin" />
        <p className="text-gray-500 text-sm">절약 가능액을 분석하고 있어요...</p>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <p className="text-gray-500 text-center">분석 중입니다. 잠시 후 다시 시도해주세요</p>
        <button
          type="button"
          onClick={() => navigate('/onboarding/step1')}
          className="mt-6 text-[#10b981] text-sm underline"
        >
          돌아가기
        </button>
      </div>
    )
  }

  const name = user?.username ?? '고객'

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-gray-500 text-base mb-1">{name}님은 매달</p>
        <p className="text-5xl font-bold text-[#10b981] my-2">
          {displayTotal.toLocaleString()}원
        </p>
        <p className="text-xl font-semibold text-gray-900 mb-10">절약 가능해요!</p>

        <div className="bg-gray-50 rounded-2xl p-5 mb-8 space-y-3 text-left">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">📱 통신비 절약</span>
            <span className="font-semibold text-gray-900">
              {result.telecom_saving_monthly.toLocaleString()}원
            </span>
          </div>
          <div className="h-px bg-gray-200" />
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">💳 카드 혜택</span>
            <span className="font-semibold text-gray-900">
              {result.card_saving_monthly.toLocaleString()}원
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(user ? '/onboarding/step3' : '/login?from=onboarding')}
          className="w-full bg-[#10b981] text-white py-4 rounded-2xl font-semibold text-base"
        >
          지금 바로 최적화하기
        </button>
      </div>
    </div>
  )
}
