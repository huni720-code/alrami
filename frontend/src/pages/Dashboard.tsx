import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { expenseApi, alarmApi } from '../lib/api'
import type { ExpenseSummary, Alarm } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

const DAYS = ['월', '화', '수', '목', '금', '토', '일']

function formatAmount(amount: string | number) {
  return Number(amount).toLocaleString('ko-KR') + '원'
}

export default function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  useEffect(() => {
    Promise.all([
      expenseApi.summary({ year, month }),
      alarmApi.list(),
    ]).then(([summaryRes, alarmsRes]) => {
      setSummary(summaryRes.data)
      setAlarms(alarmsRes.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      </Layout>
    )
  }

  const topCategories = Object.entries(summary?.by_category ?? {})
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 5)

  return (
    <Layout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        안녕하세요, {user?.username}님!
      </h2>

      {/* 이번달 지출 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">{month}월 총 지출</p>
          <p className="text-3xl font-bold text-blue-600">
            {formatAmount(summary?.total ?? 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">지출 건수</p>
          <p className="text-3xl font-bold text-gray-800">{summary?.count ?? 0}건</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">활성 알람</p>
          <p className="text-3xl font-bold text-green-600">
            {alarms.filter((a) => a.is_active).length}개
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 카테고리별 지출 */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">카테고리별 지출</h3>
            <Link to="/expenses" className="text-sm text-blue-600 hover:underline">
              지출 입력 →
            </Link>
          </div>
          {topCategories.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">이번달 지출 내역이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {topCategories.map(([cat, amount]) => {
                const total = Number(summary?.total ?? 1)
                const pct = total > 0 ? Math.round((Number(amount) / total) * 100) : 0
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{cat}</span>
                      <span className="font-medium">{formatAmount(amount)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 rounded-full h-2 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 알람 목록 */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">알람 목록</h3>
            <Link to="/alarms" className="text-sm text-blue-600 hover:underline">
              관리 →
            </Link>
          </div>
          {alarms.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">등록된 알람이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {alarms.slice(0, 5).map((alarm) => (
                <div key={alarm.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{alarm.title}</p>
                    <p className="text-xs text-gray-400">
                      {alarm.alarm_time.slice(0, 5)} ·{' '}
                      {alarm.days_of_week.map((d) => DAYS[d]).join(' ')}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      alarm.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {alarm.is_active ? '활성' : '비활성'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
