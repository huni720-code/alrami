import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { recommendationApi } from '../lib/api'
import type { Portfolio } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

function fmt(n: number) { return n.toLocaleString() }

export default function Recommend() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.onboarding_completed) {
      setLoading(false)
      return
    }
    recommendationApi.portfolio()
      .then((r) => setPortfolio(r.data))
      .catch((e) => setError(e?.response?.status === 422 ? 'onboarding' : 'error'))
      .finally(() => setLoading(false))
  }, [profile?.onboarding_completed])

  /* ── 온보딩 미완료 ── */
  if (!loading && !profile?.onboarding_completed) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-[17px] font-bold text-gray-800 mb-2">아직 분석 전이에요</p>
          <p className="text-[14px] text-gray-500 mb-6">내 정보를 입력하면 맞춤 추천을 드려요</p>
          <button
            type="button"
            onClick={() => navigate('/onboarding/step1')}
            className="bg-[#10b981] text-white font-bold px-8 py-3.5 rounded-2xl text-[15px]"
          >
            지금 분석하기 →
          </button>
        </div>
      </Layout>
    )
  }

  /* ── 로딩 ── */
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="w-9 h-9 rounded-full border-4 border-gray-100 border-t-[#10b981] animate-spin" />
        </div>
      </Layout>
    )
  }

  /* ── 오류 ── */
  if (error || !portfolio) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <p className="text-[14px] text-gray-400">추천 정보를 불러오지 못했어요</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-[#10b981] text-[13px] underline"
          >
            다시 시도
          </button>
        </div>
      </Layout>
    )
  }

  const { card_recommendation: card, telecom_recommendation: tel, total_monthly_saving, total_annual_saving } = portfolio

  return (
    <Layout>
      <div className="max-w-lg mx-auto pb-6">

        {/* 헤더 */}
        <div className="pt-2 pb-4">
          <p className="text-[22px] font-extrabold text-gray-900">내 맞춤 추천</p>
          <p className="text-[13px] text-gray-400 mt-0.5">매달 절약할 수 있는 최적 조합이에요</p>
        </div>

        {/* 총 절약 배너 */}
        <div className="bg-gradient-to-br from-[#10b981] to-[#059669] rounded-3xl p-5 mb-5 shadow-sm">
          <p className="text-[13px] text-white/70 mb-0.5">합산 절약 가능액</p>
          <p className="text-[36px] font-extrabold text-white leading-none">{fmt(total_monthly_saving)}원<span className="text-[16px] font-semibold">/월</span></p>
          <p className="text-[13px] text-white/70 mt-1">연간 <span className="font-bold text-white">{fmt(total_annual_saving)}원</span></p>
        </div>

        {/* 통신 추천 */}
        {tel && (
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">📱</span>
              <p className="text-[16px] font-bold text-gray-900">통신 요금제 추천</p>
            </div>

            {/* 현재 vs 추천 비교 */}
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 mb-4">
              <div className="text-center">
                <p className="text-[11px] text-gray-400 mb-1">지금 내고 있어요</p>
                <p className="text-[20px] font-bold text-gray-400 line-through">{fmt(tel.current_fee)}원</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-[#10b981] text-[22px] font-black">→</p>
                <p className="text-[11px] text-[#10b981] font-semibold">절약</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-gray-400 mb-1">바꾸면 돼요</p>
                <p className="text-[20px] font-bold text-[#10b981]">{fmt(tel.recommended_plan.monthly_fee)}원</p>
                <p className="text-[11px] text-gray-400">{tel.recommended_plan.carrier}</p>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-xl p-3 mb-4">
              <p className="text-[13px] text-[#10b981] font-bold text-center">
                월 {fmt(tel.monthly_saving)}원 · 연 {fmt(tel.annual_saving)}원 절약
              </p>
            </div>

            <div className="border border-gray-100 rounded-xl p-3">
              <p className="text-[12px] text-gray-500 font-semibold mb-1">추천 요금제</p>
              <p className="text-[14px] font-bold text-gray-800">{tel.recommended_plan.plan_name}</p>
              <p className="text-[12px] text-gray-400">{tel.recommended_plan.carrier}</p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="w-full mt-4 bg-[#10b981] text-white font-bold py-3.5 rounded-2xl text-[15px]"
            >
              요금제 알아보기 →
            </button>
          </div>
        )}

        {/* 카드 추천 */}
        {card && (
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">💳</span>
              <p className="text-[16px] font-bold text-gray-900">추천 카드 조합</p>
            </div>

            <div className="space-y-3 mb-4">
              {card.cards.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-[14px] font-semibold text-gray-800">{c.name}</p>
                    <p className="text-[12px] text-gray-400">{c.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-medium text-gray-500">
                      {c.annual_fee === 0 ? '연회비 무료' : `연 ${fmt(c.annual_fee)}원`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-emerald-50 rounded-xl p-3 mb-4">
              <p className="text-[13px] text-[#10b981] font-bold text-center">
                월 {fmt(card.monthly_benefit)}원 · 연 {fmt(card.annual_benefit)}원 혜택
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/my-cards')}
              className="w-full bg-[#10b981] text-white font-bold py-3.5 rounded-2xl text-[15px]"
            >
              카드 등록하기 →
            </button>
          </div>
        )}

        {/* 내 정보 수정 유도 */}
        <div className="bg-gray-50 rounded-2xl p-4 text-center">
          <p className="text-[13px] text-gray-500 mb-2">내 정보가 바뀌었다면 다시 분석할 수 있어요</p>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="text-[#10b981] text-[13px] font-semibold underline"
          >
            내 정보 수정하기
          </button>
        </div>

      </div>
    </Layout>
  )
}
