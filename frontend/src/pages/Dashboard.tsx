import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { recommendationApi, alarmApi, myCardsApi } from '../lib/api'
import type { Portfolio, Alarm, MyCard } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import api from '../lib/api'

// D-day 계산
function calcDday(dateStr: string): number {
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}


export default function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [portfolioError, setPortfolioError] = useState<string | null>(null)
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [myCards, setMyCards] = useState<MyCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const calls: Promise<unknown>[] = [alarmApi.list()]

    if (profile?.onboarding_completed) {
      calls.push(
        recommendationApi.portfolio()
          .then((r) => setPortfolio(r.data))
          .catch((e) => {
            const status = e?.response?.status
            setPortfolioError(status === 422 ? 'onboarding' : 'error')
          })
      )
    }

    calls.push(
      myCardsApi.list().then((r) => setMyCards(r.data)).catch(() => {})
    )

    Promise.all(calls)
      .then(([alarmsRes]) => {
        if (alarmsRes && typeof alarmsRes === 'object' && 'data' in (alarmsRes as object)) {
          setAlarms((alarmsRes as { data: Alarm[] }).data)
        }
      })
      .finally(() => setLoading(false))
  }, [profile?.onboarding_completed])

  const dday = profile?.contract_end_date ? calcDday(profile.contract_end_date) : null
  const activeAlarms = alarms.filter((a) => a.is_active).slice(0, 3)

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-4 pb-8">

        {/* ── 섹션 1: 히어로 ───────────────────────────── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-8 h-8 rounded-full border-4 border-gray-100 border-t-[#10b981] animate-spin" />
            </div>
          ) : !profile?.onboarding_completed || portfolioError === 'onboarding' ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-2">🔍</p>
              <p className="font-semibold text-gray-800 mb-1">아직 분석 전이에요</p>
              <p className="text-sm text-gray-500 mb-4">내 정보를 입력하면 절약 가능액을 계산해드려요</p>
              <button
                type="button"
                onClick={() => navigate('/onboarding/step1')}
                className="bg-[#10b981] text-white px-6 py-2.5 rounded-xl text-sm font-semibold"
              >
                지금 분석하기
              </button>
            </div>
          ) : portfolioError === 'error' ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400">절약액을 불러오지 못했습니다.</p>
            </div>
          ) : portfolio ? (
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">이번달 절약 가능액</p>
                  <p className="text-4xl font-bold text-[#10b981] mb-0.5">
                    {portfolio.total_monthly_saving.toLocaleString()}원
                  </p>
                  <p className="text-xs text-gray-400">
                    연간 {portfolio.total_annual_saving.toLocaleString()}원
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="text-xs text-gray-400 hover:text-[#10b981] border border-gray-200 hover:border-[#10b981] px-2.5 py-1 rounded-lg transition-colors flex-shrink-0 mt-1"
                >
                  정보 수정
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── 섹션 2: 추천 카드 조합 ───────────────────── */}
        {portfolio && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">💳 추천 카드 조합</h3>
            <div className="space-y-2">
              {portfolio.card_recommendation.cards.map((card, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
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
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between">
              <span className="text-sm text-gray-500">월 카드 혜택</span>
              <span className="text-sm font-semibold text-[#10b981]">
                {portfolio.card_recommendation.monthly_benefit.toLocaleString()}원
              </span>
            </div>
          </div>
        )}

        {/* ── 섹션 3: 추천 통신 요금제 ─────────────────── */}
        {portfolio?.telecom_recommendation && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📱 추천 통신 요금제</h3>
            <div className="flex items-center justify-between mb-3">
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">현재</p>
                <p className="text-base font-semibold text-gray-400 line-through">
                  {portfolio.telecom_recommendation.current_fee.toLocaleString()}원
                </p>
              </div>
              <span className="text-[#10b981] text-xl font-bold">→</span>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">추천</p>
                <p className="text-base font-semibold text-[#10b981]">
                  {portfolio.telecom_recommendation.recommended_plan.monthly_fee.toLocaleString()}원
                </p>
                <p className="text-xs text-gray-400">
                  {portfolio.telecom_recommendation.recommended_plan.carrier}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-between">
              <span className="text-sm text-gray-500">월 통신비 절약</span>
              <span className="text-sm font-bold text-[#10b981]">
                {portfolio.telecom_recommendation.monthly_saving.toLocaleString()}원
              </span>
            </div>
          </div>
        )}

        {/* ── 섹션 4: 이번달 카드 실적 ─────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">📊 이번달 카드 실적</h3>
            {myCards.length > 0 && (
              <Link to="/my-cards" className="text-xs text-[#10b981]">전체보기 →</Link>
            )}
          </div>
          {myCards.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-sm text-gray-400 mb-3">
                카드를 등록하면 실적을 매일 추적할 수 있어요
              </p>
              <Link
                to="/my-cards"
                className="inline-block bg-[#10b981] text-white px-5 py-2 rounded-xl text-sm font-semibold"
              >
                카드 등록하기
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myCards.slice(0, 3).map((card) => {
                const hasTarget = card.performance_target != null && card.performance_target > 0
                const pct = hasTarget
                  ? Math.min(100, Math.round((card.this_month_spent / card.performance_target!) * 100))
                  : 0
                const urgent = hasTarget && !card.achieved && card.remaining < 30000
                const barColor = card.achieved
                  ? 'bg-[#10b981]'
                  : urgent ? 'bg-red-400' : 'bg-orange-400'
                const label = card.nickname || card.card_name
                return (
                  <div key={card.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium">{label}</span>
                      {hasTarget ? (
                        <span className={card.achieved ? 'text-[#10b981] font-semibold' : urgent ? 'text-red-500' : 'text-orange-500'}>
                          {card.this_month_spent.toLocaleString()}
                          <span className="text-gray-400"> / {card.performance_target!.toLocaleString()}원</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">목표 미설정</span>
                      )}
                    </div>
                    {hasTarget && (
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
              <button
                type="button"
                onClick={() => navigate('/my-cards')}
                className="w-full mt-2 border border-[#10b981] text-[#10b981] py-2 rounded-xl text-sm font-medium"
              >
                + 결제 문자
              </button>
            </div>
          )}
        </div>

        {/* ── 섹션 5: 약정 만기 D-day ──────────────────── */}
        {dday !== null && (
          <div className={`rounded-2xl p-5 shadow-sm ${dday <= 30 ? 'bg-red-50' : 'bg-white'}`}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">📅 약정 만기</h3>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">{profile?.contract_end_date} 만료</p>
              <p className={`text-lg font-bold ${dday <= 30 ? 'text-red-500' : dday <= 0 ? 'text-red-600' : 'text-gray-800'}`}>
                {dday < 0 ? `D+${Math.abs(dday)}` : dday === 0 ? 'D-day' : `D-${dday}`}
              </p>
            </div>
            {dday <= 30 && dday >= 0 && (
              <p className="text-xs text-red-400 mt-1">약정 만료가 임박했어요. 요금제를 검토해보세요!</p>
            )}
          </div>
        )}

        {/* ── 섹션 6: 이번달 할 일 (알람) ──────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">⏰ 이번달 할 일</h3>
            <Link to="/alarms" className="text-xs text-[#10b981]">관리 →</Link>
          </div>
          {activeAlarms.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">등록된 알람이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {activeAlarms.map((alarm) => (
                <div key={alarm.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <p className="text-sm font-medium text-gray-800">{alarm.title}</p>
                  <p className="text-xs text-gray-400">{alarm.alarm_time.slice(0, 5)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 인사 */}
        <p className="text-center text-xs text-gray-400 pb-2">
          안녕하세요, <span className="font-medium text-gray-600">{user?.username}</span>님 👋
        </p>
      </div>
    </Layout>
  )
}
