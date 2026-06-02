import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { recommendationApi } from '../../lib/api'
import type { Portfolio } from '../../lib/api'

function fmt(n: number) { return n.toLocaleString() }

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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-gray-100 border-t-[#10b981] animate-spin" />
        <p className="text-[15px] text-gray-400">포트폴리오 구성 중...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-[16px] text-gray-400 mb-6">데이터를 불러오지 못했습니다.</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-[#10b981] text-[15px] font-semibold underline"
        >
          대시보드로 이동
        </button>
      </div>
    )
  }

  const { card_recommendation: card, telecom_recommendation: tel, total_monthly_saving, total_annual_saving } = data

  return (
    <div className="min-h-screen bg-white px-6 py-10 flex flex-col">
      <div className="w-full max-w-sm mx-auto flex flex-col flex-1">

        {/* 축하 헤더 */}
        <div className="text-center mb-8">
          <div className="text-[52px] mb-3">🎉</div>
          <h1 className="text-[26px] font-extrabold text-gray-900 mb-1">포트폴리오 완성!</h1>
          <p className="text-[15px] text-gray-400">최적 절약 조합을 찾았어요</p>
        </div>

        {/* 총 절약액 배너 */}
        <div className="bg-gradient-to-br from-[#10b981] to-[#059669] rounded-3xl p-6 mb-6 text-center shadow-md">
          <p className="text-[14px] text-white/70 mb-1">매달 절약 가능액</p>
          <p className="text-[44px] font-extrabold text-white leading-none mb-1">
            {fmt(total_monthly_saving)}원
          </p>
          <p className="text-[14px] text-white/70">
            1년이면 <span className="font-bold text-white">{fmt(total_annual_saving)}원</span>
          </p>
        </div>

        {/* 카드 추천 */}
        <div className="bg-gray-50 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[20px]">💳</span>
            <p className="text-[16px] font-bold text-gray-900">추천 카드 조합</p>
          </div>
          <div className="space-y-2">
            {card.cards.map((c, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-xl px-4 py-3">
                <div>
                  <p className="text-[14px] font-semibold text-gray-900">{c.name}</p>
                  <p className="text-[12px] text-gray-400">{c.company}</p>
                </div>
                <p className="text-[12px] text-gray-400">
                  {c.annual_fee === 0 ? '연회비 무료' : `연 ${fmt(c.annual_fee)}원`}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
            <span className="text-[14px] text-gray-500">월 카드 혜택</span>
            <span className="text-[16px] font-bold text-[#10b981]">{fmt(card.monthly_benefit)}원</span>
          </div>
        </div>

        {/* 통신 추천 */}
        {tel ? (
          <div className="bg-gray-50 rounded-2xl p-5 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[20px]">📱</span>
              <p className="text-[16px] font-bold text-gray-900">추천 통신 요금제</p>
            </div>
            <div className="flex items-center justify-between bg-white rounded-xl px-4 py-4 mb-3">
              <div className="text-center">
                <p className="text-[12px] text-gray-400 mb-1">지금 요금</p>
                <p className="text-[18px] font-bold text-gray-400 line-through">{fmt(tel.current_fee)}원</p>
              </div>
              <p className="text-[#10b981] text-[24px] font-black">→</p>
              <div className="text-center">
                <p className="text-[12px] text-gray-400 mb-1">{tel.recommended_plan.carrier}</p>
                <p className="text-[18px] font-bold text-[#10b981]">{fmt(tel.recommended_plan.monthly_fee)}원</p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-gray-500">월 통신비 절약</span>
              <span className="text-[16px] font-bold text-[#10b981]">{fmt(tel.monthly_saving)}원</span>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl p-5 mb-8">
            <p className="text-[14px] text-gray-400">현재 요금제보다 저렴한 요금제를 찾지 못했어요.</p>
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="w-full bg-[#10b981] text-white py-[18px] rounded-2xl text-[17px] font-bold
            active:scale-[0.98] transition-all mt-auto"
        >
          만기톡 시작하기 →
        </button>
      </div>
    </div>
  )
}
