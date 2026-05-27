import { useEffect, useState } from 'react'
import { adminApi, type AdminLogEntry } from '../../lib/api'

const ACTION_META: Record<string, { label: string; color: string }> = {
  'crawl.trigger':    { label: '크롤링 시작',      color: 'bg-blue-100 text-blue-700' },
  'crawl.completed':  { label: '크롤링 완료',      color: 'bg-emerald-100 text-emerald-700' },
  'crawl.failed':     { label: '크롤링 실패',      color: 'bg-red-100 text-red-700' },
  'crawl.approve':    { label: '데이터 승인',       color: 'bg-emerald-100 text-emerald-700' },
  'user.activate':    { label: '사용자 활성화',    color: 'bg-emerald-100 text-emerald-700' },
  'user.deactivate':  { label: '사용자 비활성화',  color: 'bg-gray-100 text-gray-600' },
  'user.grant_admin': { label: '관리자 권한 부여', color: 'bg-blue-100 text-blue-700' },
  'user.revoke_admin':{ label: '관리자 권한 회수', color: 'bg-orange-100 text-orange-700' },
  'data.delete':      { label: '데이터 삭제',       color: 'bg-red-100 text-red-700' },
}

const FILTERS = [
  { key: '',       label: '전체' },
  { key: 'crawl',  label: '크롤링' },
  { key: 'user',   label: '사용자' },
  { key: 'data',   label: '데이터' },
]

export default function Logs() {
  const [logs, setLogs] = useState<AdminLogEntry[]>([])
  const [action, setAction] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async (a = action) => {
    setLoading(true)
    try {
      const { data } = await adminApi.listLogs({ action: a })
      setLogs(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleFilter = (key: string) => {
    setAction(key)
    load(key)
  }

  const formatDetail = (detail: Record<string, unknown> | null) => {
    if (!detail) return '-'
    const parts = Object.entries(detail)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${v}`)
    return parts.join(' · ')
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">운영 로그</h1>
        <p className="text-sm text-gray-500 mt-1">관리자 액션 및 시스템 이벤트 기록</p>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-1 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => handleFilter(f.key)}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              action === f.key
                ? 'bg-gray-800 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => load(action)}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          새로고침
        </button>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium">시간</th>
              <th className="text-left px-4 py-3 font-medium">액션</th>
              <th className="text-left px-4 py-3 font-medium">수행자</th>
              <th className="text-left px-4 py-3 font-medium">대상</th>
              <th className="text-left px-4 py-3 font-medium">상세</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                  로딩 중...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                  로그가 없습니다.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const meta = ACTION_META[log.action]
                return (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleString('ko-KR')
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          meta?.color || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {meta?.label || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {log.performed_by_email}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {log.target_type && (
                        <span className="text-gray-600">{log.target_type}</span>
                      )}
                      {log.target_id && (
                        <span className="text-gray-400 ml-1">#{log.target_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">
                      {formatDetail(log.detail)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
