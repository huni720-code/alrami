import { useEffect, useState } from 'react'
import { adminApi, AdminStats } from '../../lib/api'

export default function Engine() {
  const [stats, setStats] = useState<AdminStats | null>(null)

  useEffect(() => {
    adminApi.getStats().then((r) => setStats(r.data)).catch(() => {})
  }, [])

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">추천엔진</h1>
        <p className="text-sm text-gray-500 mt-1">데이터 준비 상태 및 엔진 설정</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {/* 데이터 준비 상태 */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">데이터 준비 상태</h2>
          {stats ? (
            <div className="space-y-1">
              <StatusRow
                label="카드 데이터"
                value={`${stats.cards_count}개`}
                ok={stats.cards_count > 0}
              />
              <StatusRow
                label="통신 요금제"
                value={`${stats.telecom_count}개`}
                ok={stats.telecom_count > 0}
              />
              <StatusRow
                label="사용자 지출 기록"
                value={`${stats.expenses_total}건`}
                ok={stats.expenses_total > 10}
                warnMsg="10건 이상 필요"
              />
              <StatusRow
                label="마지막 데이터 업데이트"
                value={stats.last_crawl_month || '-'}
                ok={!!stats.last_crawl_month}
                warnMsg="크롤링 필요"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
              ))}
            </div>
          )}
        </div>

        {/* 엔진 설정 */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-gray-700">엔진 설정</h2>
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
              준비중
            </span>
          </div>
          <div className="space-y-4 opacity-40 pointer-events-none select-none">
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">최대 추천 카드 수</label>
              <input
                type="number"
                defaultValue={3}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full bg-gray-50"
                disabled
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">최소 혜택율 기준 (%)</label>
              <input
                type="number"
                defaultValue={0.5}
                step={0.1}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full bg-gray-50"
                disabled
              />
            </div>
            <button className="w-full bg-emerald-600 text-white text-sm py-2 rounded-lg" disabled>
              설정 저장
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">추천엔진 구현 후 활성화됩니다.</p>
        </div>

        {/* 추천 테스트 */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-gray-700">추천 테스트</h2>
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
              준비중
            </span>
          </div>
          <div className="flex items-center gap-3 opacity-40 pointer-events-none select-none">
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 bg-gray-50"
              disabled
            >
              <option>사용자 선택...</option>
            </select>
            <button
              className="bg-emerald-600 text-white text-sm px-5 py-2 rounded-lg"
              disabled
            >
              추천 실행
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            추천엔진 구현 후 특정 사용자의 지출 패턴을 기반으로 최적 카드·요금제 조합을 미리 테스트할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  )
}

function StatusRow({
  label,
  value,
  ok,
  warnMsg,
}: {
  label: string
  value: string
  ok: boolean
  warnMsg?: string
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 font-medium">{value}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {ok ? '정상' : warnMsg || '부족'}
        </span>
      </div>
    </div>
  )
}
