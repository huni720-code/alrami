import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { dashboardApi, alarmApi } from '../lib/api'
import type { DashboardKpi, Alarm } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import KpiGrid from '../components/kpi/KpiGrid'
import CardPerformanceSection from '../components/kpi/CardPerformanceSection'
import ContractAlertSection from '../components/kpi/ContractAlertSection'
import SavingsInsightCard from '../components/insight/SavingsInsightCard'
import { generateInsight } from '../services/savingsInsight'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />
}

const EMPTY_KPI: DashboardKpi = {
  month: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
  expense: { total: 0, count: 0 },
  card_performance: [],
  card_performance_summary: { total_spent: 0, total_target: 0, cards_achieved: 0, cards_total: 0 },
  saving: { recommended_monthly: 0, recommended_annual: 0 },
  contracts: [],
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [kpi, setKpi] = useState<DashboardKpi | null>(null)
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [loading, setLoading] = useState(true)

  const onboardingDone = profile?.onboarding_completed ?? false

  useEffect(() => {
    Promise.all([
      alarmApi.list().then((r) => setAlarms(r.data)).catch(() => {}),
      dashboardApi.kpi().then((r) => setKpi(r.data)).catch(() => setKpi(EMPTY_KPI)),
    ]).finally(() => setLoading(false))
  }, [])

  const activeAlarms = alarms.filter((a) => a.is_active).slice(0, 3)
  const displayKpi = kpi ?? EMPTY_KPI
  const monthLabel = `${displayKpi.month.year}년 ${displayKpi.month.month}월`
  const insight = useMemo(() => generateInsight(displayKpi), [displayKpi])

  return (
    <Layout>
      <div className="max-w-lg mx-auto pb-10">

        {/* ── 헤더 ─────────────────────────────────── */}
        <div className="flex items-center justify-between pt-1 pb-4">
          <div>
            <p className="text-[16px] font-bold text-gray-900">
              안녕하세요, <span className="text-[#10b981]">{user?.username}</span>님 👋
            </p>
            {!loading && (
              <p className="text-[12px] text-gray-400 mt-0.5">{monthLabel} 현황</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="text-[12px] text-gray-400 border border-gray-200 px-2.5 py-1 rounded-lg"
          >
            정보 수정
          </button>
        </div>

        {/* ── KPI 그리드: 지출 + 절약액 ─────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : (
          <KpiGrid
            expense={displayKpi.expense}
            saving={displayKpi.saving}
            onboardingDone={onboardingDone}
            onStartOnboarding={() => navigate('/onboarding/step1')}
          />
        )}

        {/* ── 온보딩 유도 배너 (미완료 시) ─────────── */}
        {!loading && !onboardingDone && (
          <div className="bg-gradient-to-br from-[#10b981] to-[#059669] rounded-3xl p-5 mb-4 text-white shadow-md">
            <p className="text-[14px] font-semibold opacity-80 mb-1">절약 가능액 분석 대기 중</p>
            <p className="text-[12px] opacity-70 mb-4">
              내 정보를 입력하면 매달 얼마를 아낄 수 있는지 알 수 있어요
            </p>
            <button
              type="button"
              onClick={() => navigate('/onboarding/step1')}
              className="bg-white text-[#10b981] font-bold px-5 py-2.5 rounded-xl text-[14px] active:scale-[0.98] transition-all"
            >
              지금 분석하기 →
            </button>
          </div>
        )}

        {/* ── 약정/렌탈 종료 알림 ───────────────────── */}
        {!loading && (
          <ContractAlertSection
            contracts={displayKpi.contracts}
            onSettingsClick={() => navigate('/settings')}
          />
        )}

        {/* ── AI 절약 인사이트 ──────────────────────── */}
        {!loading && onboardingDone && (
          <SavingsInsightCard insight={insight} />
        )}

        {/* ── 카드 실적 달성률 ──────────────────────── */}
        {loading ? (
          <Skeleton className="h-52 mb-4" />
        ) : displayKpi.card_performance.length > 0 ? (
          <CardPerformanceSection
            cards={displayKpi.card_performance}
            summary={displayKpi.card_performance_summary}
            onSmsClick={() => navigate('/sms')}
          />
        ) : onboardingDone ? (
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <p className="text-[15px] font-bold text-gray-900 mb-1">카드 실적</p>
            <p className="text-[13px] text-gray-400 mb-3">
              카드를 등록하면 결제 문자로 실적을 자동 추적해요
            </p>
            <button
              type="button"
              onClick={() => navigate('/my-cards')}
              className="w-full bg-emerald-50 text-[#10b981] py-3 rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-all"
            >
              카드 등록하기 →
            </button>
          </div>
        ) : null}

        {/* ── 이번달 알람 ───────────────────────────── */}
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
