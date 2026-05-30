import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, Plus, TrendingDown } from 'lucide-react'
import { dashboardApi, contractApi } from '../lib/api'
import type { DashboardKpi, ContractResponse } from '../lib/api'
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

function ddayLabel(dday: number) {
  if (dday > 0) return `D-${dday}`
  if (dday === 0) return 'D-Day'
  return `D+${Math.abs(dday)}`
}

function ddayStyle(dday: number) {
  if (dday <= 0) return 'bg-red-100 text-red-600'
  if (dday <= 30) return 'bg-orange-100 text-orange-600'
  if (dday <= 90) return 'bg-amber-50 text-amber-600'
  return 'bg-gray-100 text-gray-500'
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [kpi, setKpi] = useState<DashboardKpi | null>(null)
  const [contracts, setContracts] = useState<ContractResponse[]>([])
  const [loading, setLoading] = useState(true)

  const onboardingDone = profile?.onboarding_completed ?? false

  useEffect(() => {
    Promise.all([
      dashboardApi.kpi().then((r) => setKpi(r.data)).catch(() => setKpi(EMPTY_KPI)),
      contractApi.list(true).then((r) => setContracts(r.data)).catch(() => setContracts([])),
    ]).finally(() => setLoading(false))
  }, [])

  const displayKpi = kpi ?? EMPTY_KPI
  const monthLabel = `${displayKpi.month.year}년 ${displayKpi.month.month}월`
  const insight = useMemo(() => generateInsight(displayKpi), [displayKpi])

  // 약정 정렬: 긴급(dday<=30) 먼저, 최대 3개
  const topContracts = [...contracts]
    .sort((a, b) => a.dday - b.dday)
    .slice(0, 3)

  return (
    <Layout>
      <div className="max-w-lg mx-auto pb-10">

        {/* ── 헤더 ─────────────────────────────────── */}
        <div className="flex items-center justify-between pt-1 pb-4">
          <div>
            <p className="text-[16px] font-bold text-gray-900">
              안녕하세요, <span className="text-[#10b981]">{user?.username}</span>님
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

        {/* ── 약정 Watchdog ─────────────────────────── */}
        {loading ? (
          <Skeleton className="h-20 mb-4" />
        ) : topContracts.length > 0 ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-[#10b981]" />
                <p className="text-[14px] font-bold text-gray-900">약정 현황</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/contracts/onboarding')}
                className="flex items-center gap-0.5 text-[12px] text-[#10b981] font-medium"
              >
                <Plus size={12} /> 추가
              </button>
            </div>
            <div className="space-y-2">
              {topContracts.map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-gray-800 truncate">
                      {c.provider} <span className="text-gray-400 font-normal">{c.category}</span>
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {c.end_date} 만료
                      {c.accuracy === 'estimated' && ' · 추정'}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[12px] font-bold px-2.5 py-1 rounded-full ml-2 ${ddayStyle(c.dday)}`}>
                    {ddayLabel(c.dday)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/contracts/onboarding')}
            className="w-full bg-white rounded-2xl p-4 shadow-sm mb-4 flex items-center justify-between text-left border-2 border-dashed border-gray-200 active:scale-[0.98] transition-all"
          >
            <div>
              <p className="text-[14px] font-bold text-gray-800">약정 만료 감시</p>
              <p className="text-[12px] text-gray-400 mt-0.5">
                약정 등록하면 만료 전에 알려드려요
              </p>
            </div>
            <ChevronRight size={18} className="text-[#10b981] shrink-0" />
          </button>
        )}

        {/* ── 절감 진단 진입 ─────────────────────────── */}
        <button
          type="button"
          onClick={() => navigate('/hook')}
          className="w-full bg-gradient-to-r from-[#10b981] to-[#059669] rounded-2xl p-4 mb-4 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all"
        >
          <div>
            <p className="text-[14px] font-bold text-white">통신비·카드 절약 진단</p>
            <p className="text-[12px] text-white/70 mt-0.5">1분이면 대략 얼마 아끼는지 나와요</p>
          </div>
          <TrendingDown size={22} className="text-white/80 shrink-0" />
        </button>

        {/* ── 기존 약정 알림 (레거시 profile 기반) ──── */}
        {!loading && displayKpi.contracts.length > 0 && contracts.length === 0 && (
          <ContractAlertSection
            contracts={displayKpi.contracts}
            estimatedSaving={displayKpi.saving.recommended_monthly}
            onSettingsClick={() => navigate('/settings')}
          />
        )}

        {/* ── 카드 추천 요약 (1줄) ──────────────────── */}
        {!loading && onboardingDone && (
          <button
            type="button"
            onClick={() => navigate('/recommend')}
            className="w-full bg-white rounded-2xl px-5 py-3.5 shadow-sm mb-4 flex items-center justify-between active:scale-[0.98] transition-all border border-gray-100"
          >
            <div className="text-left">
              <p className="text-[14px] font-semibold text-gray-800">내 소비 맞춤 카드 추천</p>
              {displayKpi.saving.recommended_monthly > 0 && (
                <p className="text-[12px] text-[#10b981] mt-0.5">
                  월 최대 {displayKpi.saving.recommended_monthly.toLocaleString()}원 절약 가능
                </p>
              )}
            </div>
            <ChevronRight size={18} className="text-gray-400 shrink-0" />
          </button>
        )}

        {/* ── 카드 실적 ─────────────────────────────── */}
        {loading ? (
          <Skeleton className="h-52 mb-4" />
        ) : displayKpi.card_performance.length > 0 ? (
          <CardPerformanceSection
            cards={displayKpi.card_performance}
            summary={displayKpi.card_performance_summary}
            onSmsClick={() => navigate('/sms')}
          />
        ) : null}

        {/* ── AI 절약 인사이트 ──────────────────────── */}
        {!loading && onboardingDone && (
          <SavingsInsightCard insight={insight} />
        )}

      </div>
    </Layout>
  )
}
