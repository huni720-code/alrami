import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import CoachChat from '../components/coach/CoachChat'
import { dashboardApi } from '../lib/api'
import type { DashboardKpi } from '../lib/api'

const EMPTY_KPI: DashboardKpi = {
  month: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
  expense: { total: 0, count: 0 },
  card_performance: [],
  card_performance_summary: { total_spent: 0, total_target: 0, cards_achieved: 0, cards_total: 0 },
  saving: { recommended_monthly: 0, recommended_annual: 0 },
  contracts: [],
}

export default function Coach() {
  const navigate = useNavigate()
  const [kpi, setKpi] = useState<DashboardKpi | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.kpi()
      .then((r) => setKpi(r.data))
      .catch(() => setKpi(EMPTY_KPI))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-3 pt-1 pb-5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-gray-400 text-[15px]"
          >
            ←
          </button>
          <div>
            <h1 className="text-[20px] font-extrabold text-gray-900">만기톡 코치</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">소비 데이터 기반 절약 조언</p>
          </div>
          <span className="ml-auto text-[11px] text-[#10b981] bg-emerald-50 px-2.5 py-1 rounded-full font-medium">
            규칙 기반
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-gray-100 border-t-[#10b981] animate-spin" />
            <p className="text-[13px] text-gray-400">내 데이터를 불러오는 중...</p>
          </div>
        ) : (
          <CoachChat kpi={kpi ?? EMPTY_KPI} />
        )}
      </div>
    </Layout>
  )
}
