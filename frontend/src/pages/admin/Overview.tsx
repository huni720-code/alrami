import { useEffect, useState } from 'react'
import { adminApi, type AdminStats } from '../../lib/api'

export default function Overview() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getStats()
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">개요</h1>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-16 mb-3" />
              <div className="h-7 bg-gray-100 rounded w-20 mb-2" />
              <div className="h-2.5 bg-gray-100 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-500">데이터를 불러올 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">개요</h1>
        <p className="text-sm text-gray-500 mt-1">서비스 운영 현황</p>
      </div>

      {/* 사용자 / 활동 */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">사용자 &amp; 활동</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="전체 사용자" value={`${stats.users_total}명`} sub="누적 가입" />
        <StatCard label="신규 가입" value={`${stats.users_new_7d}명`} sub="최근 7일" accent />
        <StatCard label="지출 기록" value={`${stats.expenses_total}건`} sub={`이번달 ${stats.expenses_this_month}건`} />
        <StatCard label="활성 알람" value={`${stats.alarms_active}개`} sub="전체 사용자" />
      </div>

      {/* 데이터 / 시스템 */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">데이터 &amp; 시스템</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="보유 카드" value={`${stats.cards_count}개`} sub={stats.last_crawl_month ? `${stats.last_crawl_month} 기준` : '-'} />
        <StatCard label="보유 요금제" value={`${stats.telecom_count}개`} sub={stats.last_crawl_month ? `${stats.last_crawl_month} 기준` : '-'} />
        <StatCard label="마지막 크롤링" value={stats.last_crawl_month || '-'} sub="승인된 데이터" />
        <StatCard label="오늘 운영 로그" value={`${stats.logs_today}건`} sub="관리자 액션" />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className={`bg-white rounded-xl border p-5 ${accent ? 'border-emerald-200' : 'border-gray-100'}`}>
      <div className="text-xs text-gray-500 mb-2">{label}</div>
      <div className={`text-2xl font-bold mb-1 ${accent ? 'text-emerald-600' : 'text-gray-800'}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  )
}
