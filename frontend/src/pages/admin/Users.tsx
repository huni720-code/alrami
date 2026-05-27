import { useEffect, useState } from 'react'
import { adminApi, type AdminUser } from '../../lib/api'

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'active', label: '활성' },
  { key: 'inactive', label: '비활성' },
  { key: 'admin', label: '관리자' },
]

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<number | null>(null)

  const load = async (q = search) => {
    setLoading(true)
    try {
      const { data } = await adminApi.listUsers({ search: q })
      setUsers(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    load(search)
  }

  const handleToggle = async (user: AdminUser, field: 'is_active' | 'is_admin') => {
    const newVal = !user[field]
    const label =
      field === 'is_active'
        ? newVal ? '활성화' : '비활성화'
        : newVal ? '관리자 권한 부여' : '관리자 권한 회수'
    if (!confirm(`${user.email}을(를) ${label}하시겠습니까?`)) return
    setUpdating(user.id)
    try {
      await adminApi.updateUser(user.id, { [field]: newVal })
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || '수정 실패')
    } finally {
      setUpdating(null)
    }
  }

  const filtered = users.filter((u) => {
    if (filter === 'active') return u.is_active
    if (filter === 'inactive') return !u.is_active
    if (filter === 'admin') return u.is_admin
    return true
  })

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">사용자 관리</h1>
        <p className="text-sm text-gray-500 mt-1">전체 {users.length}명</p>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이메일 / 이름 검색"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            검색
          </button>
        </form>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                filter === f.key
                  ? 'bg-gray-800 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium">이메일</th>
              <th className="text-left px-4 py-3 font-medium">이름</th>
              <th className="text-left px-4 py-3 font-medium">가입일</th>
              <th className="text-center px-4 py-3 font-medium">지출</th>
              <th className="text-center px-4 py-3 font-medium">알람</th>
              <th className="text-center px-4 py-3 font-medium">상태</th>
              <th className="text-center px-4 py-3 font-medium">권한</th>
              <th className="text-center px-4 py-3 font-medium">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                  로딩 중...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                  사용자가 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-800 font-medium">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600">{u.username}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(u.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{u.expense_count}건</td>
                  <td className="px-4 py-3 text-center text-gray-500">{u.alarm_count}개</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.is_active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {u.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.is_admin && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                        관리자
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 justify-center">
                      <button
                        onClick={() => handleToggle(u, 'is_active')}
                        disabled={updating === u.id}
                        className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                      >
                        {u.is_active ? '비활성화' : '활성화'}
                      </button>
                      <button
                        onClick={() => handleToggle(u, 'is_admin')}
                        disabled={updating === u.id}
                        className={`text-xs px-2 py-1 rounded border transition-colors disabled:opacity-40 ${
                          u.is_admin
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-blue-200 text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        {u.is_admin ? '권한 회수' : '관리자 부여'}
                      </button>
                    </div>
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
