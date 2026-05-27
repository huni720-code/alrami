import { useEffect, useState } from 'react'
import { adminApi, AdminAlarm } from '../../lib/api'

const DAYS = ['월', '화', '수', '목', '금', '토', '일']

export default function Notifications() {
  const [alarms, setAlarms] = useState<AdminAlarm[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.listAllAlarms()
      .then((r) => setAlarms(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const active = alarms.filter((a) => a.is_active).length

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">알림 관리</h1>
        <p className="text-sm text-gray-500 mt-1">
          전체 {alarms.length}개 · 활성 {active}개
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium">사용자</th>
              <th className="text-left px-4 py-3 font-medium">알람명</th>
              <th className="text-left px-4 py-3 font-medium">시간</th>
              <th className="text-left px-4 py-3 font-medium">요일</th>
              <th className="text-center px-4 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                  로딩 중...
                </td>
              </tr>
            ) : alarms.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                  등록된 알람이 없습니다.
                </td>
              </tr>
            ) : (
              alarms.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-gray-800 font-medium">{a.username}</div>
                    <div className="text-xs text-gray-400">{a.user_email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{a.title}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-sm">
                    {a.alarm_time.slice(0, 5)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-0.5">
                      {DAYS.map((d, i) => (
                        <span
                          key={i}
                          className={`text-xs w-5 h-5 flex items-center justify-center rounded-full ${
                            a.days_of_week.includes(i)
                              ? 'bg-emerald-100 text-emerald-700 font-semibold'
                              : 'text-gray-300'
                          }`}
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        a.is_active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {a.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
