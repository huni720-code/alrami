import { useEffect, useState } from 'react'
import { adminApi, type AdminStats, type BenchmarkItem, type SavedBenchmark, type MarketBenchmarkInput } from '../../lib/api'

type CalcResult = { card: BenchmarkItem[]; telecom: BenchmarkItem[] }

const MARKET_CATS = ['인터넷', 'TV', '정수기', '휴대폰']

export default function Engine() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null)
  const [savedBenchmarks, setSavedBenchmarks] = useState<SavedBenchmark[]>([])
  const [calcError, setCalcError] = useState<string | null>(null)

  useEffect(() => {
    adminApi.getStats().then((r) => setStats(r.data)).catch(() => {})
    loadSaved()
  }, [])

  const loadSaved = async () => {
    try {
      const { data } = await adminApi.getBenchmarks()
      setSavedBenchmarks(data)
    } catch {}
  }

  const handleCalculate = async () => {
    setCalculating(true)
    setCalcError(null)
    setCalcResult(null)
    try {
      const { data } = await adminApi.calculateBenchmarks()
      setCalcResult(data)
    } catch (e: any) {
      setCalcError(e?.response?.data?.detail || '계산 중 오류가 발생했습니다.')
    } finally {
      setCalculating(false)
    }
  }

  const handleSave = async () => {
    if (!calcResult) return
    setSaving(true)
    try {
      const items: BenchmarkItem[] = [
        ...calcResult.card,
        ...calcResult.telecom,
      ]
      await adminApi.saveBenchmarks(items)
      setCalcResult(null)
      loadSaved()
      alert('벤치마크가 저장되었습니다.')
    } catch (e: any) {
      alert(e?.response?.data?.detail || '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const dataReady = stats && stats.cards_count > 0 && stats.telecom_count > 0

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">추천엔진</h1>
        <p className="text-sm text-gray-500 mt-1">절약 벤치마크 계산 및 데이터 준비 상태</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 데이터 준비 상태 */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">데이터 준비 상태</h2>
          {stats ? (
            <div className="space-y-1">
              <StatusRow label="카드 데이터" value={`${stats.cards_count}개`} ok={stats.cards_count > 0} />
              <StatusRow label="통신 요금제" value={`${stats.telecom_count}개`} ok={stats.telecom_count > 0} />
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

        {/* 계산 실행 */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">절약 벤치마크 계산</h2>
          <p className="text-xs text-gray-400 mb-4">
            DB의 카드·통신 데이터를 기반으로 구간별 최대 절약액을 계산합니다.
            결과를 확인한 뒤 저장하세요.
          </p>

          {!dataReady && stats && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-xs text-amber-700 mb-4">
              카드 또는 통신 데이터가 없습니다. 데이터 관리 탭에서 크롤링 후 DB 저장을 먼저 진행해주세요.
            </div>
          )}

          {calcError && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-xs text-red-600 mb-4">
              {calcError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleCalculate}
              disabled={calculating || !dataReady}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-5 rounded-lg transition-colors"
            >
              {calculating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  계산 중...
                </span>
              ) : '벤치마크 계산'}
            </button>
            {calcResult && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 px-5 rounded-lg transition-colors"
              >
                {saving ? '저장 중...' : 'DB에 저장'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 계산 결과 미리보기 */}
      {calcResult && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">계산 결과 미리보기</p>
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
              아직 저장되지 않음 — 확인 후 "DB에 저장" 클릭
            </span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <BenchmarkTable title="카드 최적 조합 혜택" rows={calcResult.card} type="card" />
            <BenchmarkTable title="통신 요금제 절약" rows={calcResult.telecom} type="telecom" />
          </div>
        </div>
      )}

      {/* 저장된 벤치마크 */}
      {savedBenchmarks.length > 0 && !calcResult && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">저장된 벤치마크</p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <BenchmarkTable
              title="카드 최적 조합 혜택"
              rows={savedBenchmarks.filter((b) => b.benchmark_type === 'card')}
              type="card"
              savedAt={savedBenchmarks[0]?.calculated_at}
            />
            <BenchmarkTable
              title="통신 요금제 절약"
              rows={savedBenchmarks.filter((b) => b.benchmark_type === 'telecom')}
              type="telecom"
              savedAt={savedBenchmarks[0]?.calculated_at}
            />
          </div>
        </div>
      )}

      <MarketBenchmarkPanel />
    </div>
  )
}

// ── 시장 벤치마크(대략) 업데이트 — 어드민이 공개 출처 보고 수동 갱신 → 앱 즉시 반영 ──
function MarketBenchmarkPanel() {
  const [rows, setRows] = useState<MarketBenchmarkInput[]>([])
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [draftHint, setDraftHint] = useState<string | null>(null)

  useEffect(() => { load() }, [])
  const load = async () => {
    try {
      const { data } = await adminApi.getMarketBenchmarks()
      const byCat: Record<string, MarketBenchmarkInput> = {}
      data.forEach((d) => { byCat[d.category] = d })
      setRows(MARKET_CATS.map((c) => byCat[c] ?? {
        category: c, reattach_subsidy_approx: null, new_subsidy_approx: null,
        discount_note: null, source: null, effective_month: null,
      }))
      const latest = data.map((d) => d.updated_at).filter(Boolean).sort().pop()
      setSavedAt(latest ?? null)
    } catch {}
  }

  const setField = (cat: string, field: keyof MarketBenchmarkInput, value: string | number | null) =>
    setRows((prev) => prev.map((r) => (r.category === cat ? { ...r, [field]: value } : r)))

  // 만원 단위 입력 → 원으로 저장
  const manwonToWon = (v: string): number | null => (v.trim() === '' ? null : Math.round(Number(v) * 10000))
  const wonToManwon = (won: number | null): string => (won == null ? '' : String(Math.round(won / 10000)))

  const handleApply = async () => {
    setSaving(true)
    try {
      await adminApi.saveMarketBenchmarks(rows)
      alert('적용되었습니다. 앱에 즉시 반영됩니다.')
      load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  // 공개 기준값(방통위 한도·공식 할인율)으로 초안 불러오기 — 저장 X, 폼만 채움. 라이브 스크랩 아님.
  const handleFetchDraft = async () => {
    setFetching(true)
    try {
      const { data } = await adminApi.fetchMarketBenchmarksDraft()
      const byCat: Record<string, MarketBenchmarkInput> = {}
      data.items.forEach((d) => { byCat[d.category] = d })
      setRows((prev) => MARKET_CATS.map((c) => byCat[c] ?? prev.find((r) => r.category === c) ?? {
        category: c, reattach_subsidy_approx: null, new_subsidy_approx: null,
        discount_note: null, source: null, effective_month: null,
      }))
      setDraftHint(`공개 기준값(${data.fetched_month})을 불러왔어요. 검토·수정 후 "적용"하세요.`)
    } catch (e: any) {
      alert(e?.response?.data?.detail || '불러오기 실패')
    } finally {
      setFetching(false)
    }
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">시장 벤치마크 (대략)</p>
          <p className="text-xs text-gray-400 mt-1">
            "공개 기준값 불러오기"(방통위 한도·공식 할인율 초안) → 검토·수정 → "적용". 앱엔 "대략 + 기준월"으로 표시돼요. 경쟁사 크롤 아님(라이브 스크랩 아님).
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-xs text-gray-400">{new Date(savedAt).toLocaleString('ko-KR')} 갱신</span>}
          <button
            onClick={handleFetchDraft}
            disabled={fetching}
            className="border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {fetching ? '불러오는 중...' : '공개 기준값 불러오기'}
          </button>
          <button
            onClick={handleApply}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium py-2 px-5 rounded-lg transition-colors"
          >
            {saving ? '적용 중...' : '적용 (앱 반영)'}
          </button>
        </div>
      </div>
      {draftHint && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2.5 text-xs text-emerald-700 mb-3">
          {draftHint}
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">카테고리</th>
              <th className="text-left px-4 py-2.5 font-medium">재약정 사은품(만원)</th>
              <th className="text-left px-4 py-2.5 font-medium">신규 사은품(만원)</th>
              <th className="text-left px-4 py-2.5 font-medium">요금할인 메모</th>
              <th className="text-left px-4 py-2.5 font-medium">기준월</th>
              <th className="text-left px-4 py-2.5 font-medium">출처</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r) => (
              <tr key={r.category}>
                <td className="px-4 py-3 text-gray-700 text-xs font-semibold whitespace-nowrap">{r.category}</td>
                <td className="px-4 py-2">
                  <input type="number" value={wonToManwon(r.reattach_subsidy_approx)}
                    onChange={(e) => setField(r.category, 'reattach_subsidy_approx', manwonToWon(e.target.value))}
                    placeholder="예: 15" className="w-20 border border-gray-200 rounded px-2 py-1 text-sm" />
                </td>
                <td className="px-4 py-2">
                  <input type="number" value={wonToManwon(r.new_subsidy_approx)}
                    onChange={(e) => setField(r.category, 'new_subsidy_approx', manwonToWon(e.target.value))}
                    placeholder="예: 30" className="w-20 border border-gray-200 rounded px-2 py-1 text-sm" />
                </td>
                <td className="px-4 py-2">
                  <input type="text" value={r.discount_note ?? ''}
                    onChange={(e) => setField(r.category, 'discount_note', e.target.value || null)}
                    placeholder="예: 선택약정 25% 재약정" className="w-48 border border-gray-200 rounded px-2 py-1 text-sm" />
                </td>
                <td className="px-4 py-2">
                  <input type="text" value={r.effective_month ?? ''}
                    onChange={(e) => setField(r.category, 'effective_month', e.target.value || null)}
                    placeholder="2026-06" className="w-24 border border-gray-200 rounded px-2 py-1 text-sm" />
                </td>
                <td className="px-4 py-2">
                  <input type="text" value={r.source ?? ''}
                    onChange={(e) => setField(r.category, 'source', e.target.value || null)}
                    placeholder="방통위 경품 한도" className="w-40 border border-gray-200 rounded px-2 py-1 text-sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BenchmarkTable({
  title,
  rows,
  type,
  savedAt,
}: {
  title: string
  rows: BenchmarkItem[]
  type: 'card' | 'telecom'
  savedAt?: string
}) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
        <p className="text-xs text-gray-400">데이터 없음</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {savedAt && (
          <span className="text-xs text-gray-400">
            {new Date(savedAt).toLocaleString('ko-KR')} 기준
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">구간</th>
              {type === 'card' && <th className="text-left px-4 py-2.5 font-medium">추천 카드</th>}
              {type === 'telecom' && <th className="text-left px-4 py-2.5 font-medium">추천 요금제</th>}
              <th className="text-right px-4 py-2.5 font-medium">월 절약</th>
              <th className="text-right px-4 py-2.5 font-medium">연 절약</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 text-gray-700 text-xs font-medium whitespace-nowrap">
                  {row.label}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px]">
                  {type === 'card'
                    ? (row.best_strategy as any)?.cards
                        ?.map((c: any) => `${c.company} ${c.name}`)
                        .join(' + ') || '-'
                    : (row.best_strategy as any)?.best_plan
                      ? `${(row.best_strategy as any).best_plan.carrier} ${(row.best_strategy as any).best_plan.name} (${((row.best_strategy as any).best_plan.fee as number).toLocaleString()}원)`
                      : '-'}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-600 whitespace-nowrap">
                  {row.saving_monthly > 0 ? `+${row.saving_monthly.toLocaleString()}원` : '-'}
                </td>
                <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                  {row.saving_annual > 0 ? `+${row.saving_annual.toLocaleString()}원` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusRow({
  label, value, ok, warnMsg,
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
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {ok ? '정상' : warnMsg || '부족'}
        </span>
      </div>
    </div>
  )
}
