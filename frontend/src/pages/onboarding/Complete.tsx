import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { recommendationApi } from '../../lib/api'
import type { Portfolio } from '../../lib/api'

export default function Complete() {
  const navigate = useNavigate()
  const [data, setData] = useState<Portfolio | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    recommendationApi.portfolio()
      .then((res) => setData(res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-gray-100 border-t-[#10b981] animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <p className="text-gray-500 text-center">데이터를 불러오지 못했습니다.</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mt-4 text-[#10b981] text-sm underline"
        >
          대시보드로 이동
        </button>
      </div>
    )
  }

  const { card_recommendation, telecom_recommendation, total_monthly_saving, total_annual_saving } = data

  return (
    <div className="min-h-screen bg-white px-6 py-10">
      <div className="w-full max-w-sm mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <p className="text-3xl mb-2">🎉</p>
          <h1 className="text-2xl font-bold text-gray-900">포트폴리오 완성!</h1>
          <p className="text-gray-500 text-sm mt-1">최적 조합을 찾았어요</p>
          <div className="mt-4">
            <p className="text-gray-500 text-sm">월 절약 가능액</p>
            <p className="text-4xl font-bold text-[#10b981]">
              {total_monthly_saving.toLocaleString()}원
            </p>
            <p className="text-gray-400 text-sm mt-1">
              연간 {total_annual_saving.toLocaleString()}원 절약
            </p>
          </div>
        </div>

        {/* 카드 추천 */}
        <div className="bg-gray-50 rounded-2xl p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">💳 추천 카드 조합</h3>
          <div className="space-y-2">
            {card_recommendation.cards.map((card, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{card.name}</p>
                  <p className="text-xs text-gray-400">{card.company}</p>
                </div>
                <p className="text-xs text-gray-500">
                  {card.annual_fee === 0 ? '연회비 무료' : `연 ${card.annual_fee.toLocaleString()}원`}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
            <span className="text-sm text-gray-500">월 카드 혜택</span>
            <span className="text-sm font-semibold text-[#10b981]">
              {card_recommendation.monthly_benefit.toLocaleString()}원
            </span>
          </div>
        </div>

        {/* 통신 추천 */}
        {telecom_recommendation ? (
          <div className="bg-gray-50 rounded-2xl p-5 mb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📱 추천 통신 요금제</h3>
            <div className="flex items-center justify-between mb-3">
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">현재</p>
                <p className="text-base font-semibold text-gray-500 line-through">
                  {telecom_recommendation.current_fee.toLocaleString()}원
                </p>
              </div>
              <span className="text-[#10b981] text-xl">→</span>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">추천</p>
                <p className="text-base font-semibold text-[#10b981]">
                  {telecom_recommendation.recommended_plan.monthly_fee.toLocaleString()}원
                </p>
                <p className="text-xs text-gray-400">{telecom_recommendation.recommended_plan.carrier}</p>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-200 flex justify-between">
              <span className="text-sm text-gray-500">월 통신비 절약</span>
              <span className="text-sm font-semibold text-[#10b981]">
                {telecom_recommendation.monthly_saving.toLocaleString()}원
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl p-5 mb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">📱 통신 추천</h3>
            <p className="text-sm text-gray-400">현재 요금제보다 저렴한 요금제를 찾지 못했어요.</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="w-full bg-[#10b981] text-white py-4 rounded-2xl font-semibold text-base"
        >
          한달 무료 시작하기
        </button>
      </div>
    </div>
  )
}
