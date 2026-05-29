import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { recommendationApi, alarmApi, myCardsApi } from '../lib/api'
import type { Portfolio, Alarm, MyCard } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

/* ── 유틸 ──────────────────────────────────────────── */
function calcDday(dateStr: string): number {
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function fmt(n: number) {
  return n.toLocaleString()
}

/* ── 스켈레톤 ─────────────────────────────────────── */
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />
}

/* ── 액션 카드 ────────────────────────────────────── */
interface ActionCardProps {
  icon: string
  title: string
  desc: string
  amount: string
  amountLabel: string
  btnLabel: string
  urgent?: boolean
  onClick: () => void
}

function ActionCard({ icon, title, desc, amount, amountLabel, btnLabel, urgent, onClick }: ActionCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${urgent ? 'border-orange-400' : 'border-[#10b981]'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{icon}</span>
            <span className="text-[15px] font-bold text-gray-900">{title}</span>
          </div>
          <p className="text-[13px] text-gray-500 leading-snug mb-2">{desc}</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-[18px] font-extrabold ${urgent ? 'text-orange-500' : 'text-[#10b981]'}`}>
              {amount}
            </span>
            <span className="text-[12px] text-gray-400">{amountLabel}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClick}
          className={`flex-shrink-0 text-[13px] font-semibold px-3 py-2 rounded-xl transition-colors ${
            urgent
              ? 'bg-orange-50 text-orange-500'
              : 'bg-emerald-50 text-[#10b981]'
          }`}
        >
          {btnLabel}
        </button>
      </div>
    </div>
  )
}

/* ── 메인 ─────────────────────────────────────────── */
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
  const onboardingDone = profile?.onboarding_completed

  /* 액션 카드 목록 동적 생성 */
  const actionCards: ActionCardProps[] = []

  if (portfolio?.telecom_recommendation) {
    const rec = portfolio.telecom_recommendation
    actionCards.push({
      icon: '📱',
      title: '통신비 절약',
      desc: `${rec.recommended_plan.carrier} ${rec.recommended_plan.plan_name}으로 바꿔보세요`,
      amount: `월 ${fmt(rec.monthly_saving)}원`,
      amountLabel: '아낄 수 있어요',
      btnLabel: '알아보기',
      onClick: () => navigate('/settings'),
    })
  }

  if (portfolio?.card_recommendation) {
    const rec = portfolio.card_recommendation
    actionCards.push({
      icon: '💳',
      title: '카드 혜택',
      desc: `${rec.cards.slice(0, 2).map((c) => c.name).join(', ')} 조합 추천`,
      amount: `월 ${fmt(rec.monthly_benefit)}원`,
      amountLabel: '혜택 받을 수 있어요',
      btnLabel: '자세히',
      onClick: () => navigate('/my-cards'),
    })
  }

  if (dday !== null && dday <= 90) {
    actionCards.push({
      icon: '⏰',
      title: '약정 만료 임박',
      desc: dday <= 0
        ? '약정이 만료됐어요. 지금 요금제를 바꾸세요!'
        : `${dday}일 후 약정이 끝나요. 지금이 바꿀 타이밍이에요`,
      amount: dday <= 0 ? 'D-day' : `D-${dday}`,
      amountLabel: '',
      btnLabel: '확인',
      urgent: dday <= 30,
      onClick: () => navigate('/settings'),
    })
  }

  /* 카드 미등록 → 등록 유도 액션 */
  if (!loading && myCards.length === 0 && onboardingDone) {
    actionCards.push({
      icon: '🗂️',
      title: '카드 실적 추적',
      desc: '카드를 등록하면 결제 문자로 실적을 자동 계산해요',
      amount: '등록 무료',
      amountLabel: '',
      btnLabel: '등록하기',
      onClick: () => navigate('/my-cards'),
    })
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto pb-10">

        {/* ── 상단 인사 ───────────────────────────────── */}
        <div className="flex items-center justify-between pt-1 pb-3">
          <p className="text-[15px] font-semibold text-gray-800">
            안녕하세요, <span className="text-[#10b981]">{user?.username}</span>님 👋
          </p>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="text-[12px] text-gray-400 border border-gray-200 px-2.5 py-1 rounded-lg"
          >
            정보 수정
          </button>
        </div>

        {/* ── 섹션 1: 히어로 — 절약 가능액 ──────────────── */}
        {loading ? (
          <Skeleton className="h-32 mb-4" />
        ) : !onboardingDone || portfolioError === 'onboarding' ? (
          /* 온보딩 미완료 */
          <div className="bg-gradient-to-br from-[#10b981] to-[#059669] rounded-3xl p-6 mb-4 text-white text-center shadow-md">
            <p className="text-[15px] font-medium opacity-80 mb-1">아직 분석 전이에요</p>
            <p className="text-[13px] opacity-70 mb-4">내 정보를 입력하면 절약 가능액을 계산해드려요</p>
            <button
              type="button"
              onClick={() => navigate('/onboarding/step1')}
              className="bg-white text-[#10b981] font-bold px-6 py-3 rounded-2xl text-[15px]"
            >
              지금 분석하기 →
            </button>
          </div>
        ) : portfolioError === 'error' ? (
          <div className="bg-gray-50 rounded-3xl p-6 mb-4 text-center">
            <p className="text-[14px] text-gray-400">데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
          </div>
        ) : portfolio ? (
          /* 절약액 히어로 */
          <div className="bg-gradient-to-br from-[#10b981] to-[#059669] rounded-3xl p-6 mb-4 shadow-md">
            <p className="text-[13px] text-white/70 mb-1">이번달 절약 가능액</p>
            <p className="text-[42px] font-extrabold text-white leading-none mb-1">
              {fmt(portfolio.total_monthly_saving)}원
            </p>
            <p className="text-[13px] text-white/70">
              1년이면 <span className="font-bold text-white">{fmt(portfolio.total_annual_saving)}원</span> 아낄 수 있어요
            </p>
          </div>
        ) : null}

        {/* ── 섹션 2: 지금 할 수 있는 것 (액션 카드) ───── */}
        {onboardingDone && !loading && actionCards.length > 0 && (
          <div className="mb-4">
            <p className="text-[13px] font-semibold text-gray-400 mb-2 px-1">지금 바로 할 수 있어요</p>
            <div className="space-y-3">
              {actionCards.map((card, i) => (
                <ActionCard key={i} {...card} />
              ))}
            </div>
          </div>
        )}

        {/* ── 섹션 3: 이번달 카드 실적 ──────────────────── */}
        {myCards.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[15px] font-bold text-gray-900">이번달 카드 실적</p>
              <Link to="/my-cards" className="text-[13px] text-[#10b981] font-medium">
                전체보기 →
              </Link>
            </div>

            <div className="space-y-4">
              {myCards.slice(0, 3).map((card) => {
                const hasTarget = card.performance_target != null && card.performance_target > 0
                const pct = hasTarget
                  ? Math.min(100, Math.round((card.this_month_spent / card.performance_target!) * 100))
                  : 0
                const urgent = hasTarget && !card.achieved && card.remaining < 30000
                const label = card.nickname || card.card_name

                return (
                  <div key={card.id}>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-[14px] font-semibold text-gray-800">{label}</span>
                      {hasTarget ? (
                        card.achieved ? (
                          <span className="text-[13px] font-bold text-[#10b981]">✅ 달성!</span>
                        ) : (
                          <span className={`text-[13px] font-medium ${urgent ? 'text-orange-500' : 'text-gray-500'}`}>
                            {fmt(card.this_month_spent)} / {fmt(card.performance_target!)}원
                          </span>
                        )
                      ) : (
                        <span className="text-[12px] text-gray-300">목표 미설정</span>
                      )}
                    </div>
                    {hasTarget && (
                      <>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all ${
                              card.achieved ? 'bg-[#10b981]' : urgent ? 'bg-orange-400' : 'bg-[#10b981]/60'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {!card.achieved && (
                          <p className="text-[12px] text-gray-400 mt-1">
                            {urgent
                              ? `⚡ ${fmt(card.remaining)}원만 더 쓰면 달성!`
                              : `${fmt(card.remaining)}원 더 필요해요`}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => navigate('/my-cards')}
              className="w-full mt-4 border border-[#10b981] text-[#10b981] py-2.5 rounded-xl text-[14px] font-semibold"
            >
              + 결제 문자 붙여넣기
            </button>
          </div>
        )}

        {/* ── 섹션 4: 이번달 할 일 (알람) ───────────────── */}
        {activeAlarms.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[15px] font-bold text-gray-900">이번달 할 일</p>
              <Link to="/alarms" className="text-[13px] text-[#10b981] font-medium">관리 →</Link>
            </div>
            <div className="space-y-2">
              {activeAlarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
                >
                  <p className="text-[14px] text-gray-800">{alarm.title}</p>
                  <p className="text-[12px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">
                    {alarm.alarm_time.slice(0, 5)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
