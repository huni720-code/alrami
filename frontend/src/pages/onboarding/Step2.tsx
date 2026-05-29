import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { recommendationApi } from '../../lib/api'
import type { QuickEstimate } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) return
    setValue(0)
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
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

  const displayTotal = useCountUp(result?.total_saving_monthly ?? 0, 1200)
  const displayTelecom = useCountUp(result?.telecom_saving_monthly ?? 0, 1000)
  const displayCard = useCountUp(result?.card_saving_monthly ?? 0, 1000)

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

  /* 로딩 */
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-5">
        <div className="w-12 h-12 rounded-full border-4 border-gray-100 border-t-[#10b981] animate-spin" />
        <p className="text-[16px] text-gray-400">절약 가능액을 분석하고 있어요...</p>
      </div>
    )
  }

  /* 오류 */
  if (error || !result) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 text-center">
        <p className="text-[16px] text-gray-500 mb-6">분석 중입니다. 잠시 후 다시 시도해주세요</p>
        <button
          type="button"
          onClick={() => navigate('/onboarding/step1')}
          className="text-[#10b981] text-[15px] font-semibold underline"
        >
          ← 돌아가기
        </button>
      </div>
    )
  }

  const name = user?.username ?? '고객'
  const annual = result.total_saving_monthly * 12

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">

        {/* 메인 임팩트 */}
        <p className="text-[16px] text-gray-400 mb-2">{name}님은 매달</p>
        <p className="text-[56px] font-extrabold text-[#10b981] leading-none mb-1">
          {displayTotal.toLocaleString()}
          <span className="text-[28px]">원</span>
        </p>
        <p className="text-[20px] font-bold text-gray-900 mb-2">절약할 수 있어요!</p>
        <p className="text-[14px] text-gray-400 mb-10">
          1년이면 <span className="font-semibold text-gray-600">{annual.toLocaleString()}원</span>이에요
        </p>

        {/* 항목별 분리 */}
        <div className="bg-gray-50 rounded-2xl p-5 mb-8 space-y-4 text-left">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-[22px]">📱</span>
              <div>
                <p className="text-[15px] font-semibold text-gray-800">통신비 절약</p>
                <p className="text-[12px] text-gray-400">더 저렴한 요금제로 변경</p>
              </div>
            </div>
            <p className="text-[18px] font-bold text-[#10b981]">
              {displayTelecom.toLocaleString()}원
            </p>
          </div>

          <div className="h-px bg-gray-200" />

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-[22px]">💳</span>
              <div>
                <p className="text-[15px] font-semibold text-gray-800">카드 혜택</p>
                <p className="text-[12px] text-gray-400">최적 카드 조합으로 교체</p>
              </div>
            </div>
            <p className="text-[18px] font-bold text-[#10b981]">
              {displayCard.toLocaleString()}원
            </p>
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => navigate(user ? '/onboarding/step3' : '/login?from=onboarding')}
          className="w-full bg-[#10b981] text-white py-[18px] rounded-2xl text-[17px] font-bold
            active:scale-[0.98] transition-all"
        >
          지금 바로 최적화하기 →
        </button>

        <p className="text-[13px] text-gray-300 mt-4">
          {user ? '내 정보를 입력하면 정확한 추천을 드려요' : '가입하면 정확한 추천을 드려요'}
        </p>
      </div>
    </div>
  )
}
