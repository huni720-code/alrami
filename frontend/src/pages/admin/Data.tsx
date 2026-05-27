import { Fragment, useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../lib/api'

// ── 타입 ─────────────────────────────────────────────────────────────────────

interface CrawlTask {
  id: number
  target: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  record_count: number
  approved: boolean
  error_message?: string
  result_json?: any[]
  created_at: string
  completed_at?: string
}

interface CardBenefit {
  category: string
  benefit_type: string
  rate: number
  condition_amount: number
  monthly_max: number | null
  description: string | null
}

interface CardRow {
  id: number
  name: string
  company: string
  annual_fee: number
  card_type: string
  data_month: string
  benefit_count: number
  benefits: CardBenefit[]
}

interface TelecomRow {
  id: number
  carrier: string
  plan_name: string
  monthly_fee: number
  data_gb: number | null
  data_unlimited: boolean
  call_type: string
  data_month: string
}

// ── 상수 ─────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pending: '대기중',
  running: '크롤링 중...',
  completed: '완료',
  failed: '실패',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-amber-500',
  running: 'text-blue-500',
  completed: 'text-emerald-500',
  failed: 'text-red-500',
}

const CARRIER_COLOR: Record<string, string> = {
  SKT: 'bg-red-100 text-red-700',
  KT: 'bg-orange-100 text-orange-700',
  'LGU+': 'bg-pink-100 text-pink-700',
  MVNO: 'bg-emerald-100 text-emerald-700',
}

const BENEFIT_TYPE_LABEL: Record<string, string> = {
  cashback: '캐시백',
  discount: '할인',
  point: '포인트',
  mileage: '마일리지',
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

export default function Data() {
  const [tasks, setTasks] = useState<Record<string, CrawlTask | null>>({ cards: null, telecom: null })
  const [polling, setPolling] = useState<Record<string, boolean>>({ cards: false, telecom: false })
  const [approving, setApproving] = useState<Record<string, boolean>>({ cards: false, telecom: false })
  const [savedCards, setSavedCards] = useState<CardRow[]>([])
  const [savedTelecom, setSavedTelecom] = useState<TelecomRow[]>([])
  const [activeTab, setActiveTab] = useState<'cards' | 'telecom'>('cards')

  useEffect(() => {
    loadRecentTasks()
    loadSavedData()
  }, [])

  const loadRecentTasks = async () => {
    try {
      const { data } = await adminApi.listTasks()
      const latest: Record<string, CrawlTask | null> = { cards: null, telecom: null }
      for (const task of data as CrawlTask[]) {
        if (!latest[task.target]) latest[task.target] = task
      }
      setTasks(latest)
      for (const [target, task] of Object.entries(latest)) {
        if (task && (task.status === 'pending' || task.status === 'running')) {
          startPolling(target, task.id)
        }
      }
    } catch {}
  }

  const loadSavedData = async () => {
    try {
      const [cardsRes, telecomRes] = await Promise.all([
        adminApi.getData('cards'),
        adminApi.getData('telecom'),
      ])
      setSavedCards(cardsRes.data)
      setSavedTelecom(telecomRes.data)
    } catch {}
  }

  const startPolling = useCallback((target: string, taskId: number) => {
    setPolling((p) => ({ ...p, [target]: true }))
    const interval = setInterval(async () => {
      try {
        const { data } = await adminApi.getTask(taskId)
        setTasks((prev) => ({ ...prev, [target]: data }))
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval)
          setPolling((p) => ({ ...p, [target]: false }))
        }
      } catch {
        clearInterval(interval)
        setPolling((p) => ({ ...p, [target]: false }))
      }
    }, 2500)
  }, [])

  const handleCrawl = async (target: string) => {
    try {
      const { data } = await adminApi.triggerCrawl(target)
      setTasks((prev) => ({ ...prev, [target]: { ...data, result_json: [], record_count: 0 } as any }))
      startPolling(target, data.task_id)
    } catch (e: any) {
      alert(e?.response?.data?.detail || '크롤링 시작 실패')
    }
  }

  const handleApprove = async (target: string, taskId: number) => {
    setApproving((a) => ({ ...a, [target]: true }))
    try {
      const { data } = await adminApi.approveTask(taskId)
      alert(`${data.saved}개 저장 완료 (${data.data_month})`)
      loadSavedData()
      loadRecentTasks()
    } catch (e: any) {
      alert(e?.response?.data?.detail || '저장 실패')
    } finally {
      setApproving((a) => ({ ...a, [target]: false }))
    }
  }

  const handleDelete = async (type: string, id: number) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return
    try {
      await adminApi.deleteData(type, id)
      loadSavedData()
    } catch {
      alert('삭제 실패')
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">데이터 관리</h1>
        <p className="text-sm text-gray-500 mt-1">카드·통신 데이터 크롤링 및 DB 관리</p>
      </div>

      {/* 크롤링 섹션 */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">크롤링</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {(['cards', 'telecom'] as const).map((target) => (
          <CrawlSection
            key={target}
            target={target}
            task={tasks[target]}
            isPolling={polling[target]}
            isApproving={approving[target]}
            onCrawl={() => handleCrawl(target)}
            onApprove={(id) => handleApprove(target, id)}
          />
        ))}
      </div>

      {/* 저장된 데이터 */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">저장된 데이터</p>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {(['cards', 'telecom'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'cards'
                ? `카드 데이터 (${savedCards.length})`
                : `통신 요금제 (${savedTelecom.length})`}
            </button>
          ))}
        </div>
        <div className="p-4">
          {activeTab === 'cards' ? (
            <CardsTable cards={savedCards} onDelete={(id) => handleDelete('cards', id)} />
          ) : (
            <TelecomTable plans={savedTelecom} onDelete={(id) => handleDelete('telecom', id)} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── 크롤링 섹션 ───────────────────────────────────────────────────────────────

function CrawlSection({
  target, task, isPolling, isApproving, onCrawl, onApprove,
}: {
  target: 'cards' | 'telecom'
  task: CrawlTask | null
  isPolling: boolean
  isApproving: boolean
  onCrawl: () => void
  onApprove: (id: number) => void
}) {
  const isActive = isPolling || task?.status === 'pending' || task?.status === 'running'
  const label = target === 'cards' ? '카드 혜택' : '통신 요금제'
  const source = target === 'cards' ? '카드고릴라 + 폴백 데이터' : '스마트초이스 + 통신3사 + 폴백'

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-1">
        <h3 className="font-semibold text-gray-800">{label} 크롤링</h3>
        {task && (
          <span className={`text-sm font-medium ${STATUS_COLOR[task.status] || 'text-gray-400'}`}>
            {task.status === 'running' && (
              <span className="inline-block animate-spin mr-1">⟳</span>
            )}
            {STATUS_LABEL[task.status]}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-4">
        출처: {source}
        {task?.completed_at && (
          <> · {new Date(task.completed_at).toLocaleString('ko-KR')}</>
        )}
      </p>

      {task?.error_message && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-3 text-xs text-red-600">
          {task.error_message}
        </div>
      )}

      {task?.status === 'completed' && task.result_json && (
        <ResultPreview target={target} results={task.result_json} />
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={onCrawl}
          disabled={isActive}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {isActive ? '크롤링 중...' : '크롤링 시작'}
        </button>
        {task?.status === 'completed' && !task.approved && (
          <button
            onClick={() => onApprove(task.id)}
            disabled={isApproving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {isApproving ? '저장중...' : `DB 저장 (${task.record_count}개)`}
          </button>
        )}
        {task?.approved && (
          <div className="flex-1 text-center py-2 px-4 text-sm text-emerald-600 font-medium bg-emerald-50 rounded-lg">
            ✓ DB 저장 완료
          </div>
        )}
      </div>
    </div>
  )
}

// ── 결과 미리보기 ─────────────────────────────────────────────────────────────

function ResultPreview({ target, results }: { target: string; results: any[] }) {
  const valid = results.filter((r) => !r.error && !r.crawl_error)
  const fallback = results.filter((r) => r.source === 'fallback')
  const crawled = results.filter(
    (r) => r.source === 'crawled' || r.source === 'smartchoice' || r.source === 'cardgorilla',
  )

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden mb-3">
      <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500 flex justify-between items-center">
        <span>미리보기</span>
        <div className="flex gap-1.5">
          {crawled.length > 0 && (
            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              실크롤 {crawled.length}
            </span>
          )}
          {fallback.length > 0 && (
            <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              폴백 {fallback.length}
            </span>
          )}
        </div>
      </div>
      <div className="max-h-40 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-50 text-gray-500">
            <tr>
              {target === 'cards' ? (
                <>
                  <th className="text-left px-3 py-1.5 font-medium">카드명</th>
                  <th className="text-left px-3 py-1.5 font-medium">카드사</th>
                  <th className="text-right px-3 py-1.5 font-medium">연회비</th>
                  <th className="text-center px-3 py-1.5 font-medium">출처</th>
                </>
              ) : (
                <>
                  <th className="text-left px-3 py-1.5 font-medium">통신사</th>
                  <th className="text-left px-3 py-1.5 font-medium">요금제</th>
                  <th className="text-right px-3 py-1.5 font-medium">월 요금</th>
                  <th className="text-center px-3 py-1.5 font-medium">출처</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {valid.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50/80">
                {target === 'cards' ? (
                  <>
                    <td className="px-3 py-1.5 text-gray-700 max-w-[140px] truncate">{item.name}</td>
                    <td className="px-3 py-1.5 text-gray-500">{item.company}</td>
                    <td className="px-3 py-1.5 text-right">{(item.annual_fee ?? 0).toLocaleString()}원</td>
                    <td className="px-3 py-1.5 text-center">
                      <SourceBadge source={item.source} />
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-1.5">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${CARRIER_COLOR[item.carrier] || 'bg-gray-100 text-gray-600'}`}>
                        {item.carrier}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-gray-700 max-w-[140px] truncate">{item.plan_name}</td>
                    <td className="px-3 py-1.5 text-right font-medium text-emerald-700">
                      {(item.monthly_fee ?? 0).toLocaleString()}원
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <SourceBadge source={item.source} />
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SourceBadge({ source }: { source: string }) {
  const isCrawled =
    source === 'crawled' || source === 'smartchoice' || source === 'cardgorilla'
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs ${isCrawled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
      {isCrawled ? '크롤링' : '기준데이터'}
    </span>
  )
}

// ── 카드 테이블 (혜택 펼치기) ─────────────────────────────────────────────────

function CardsTable({ cards, onDelete }: { cards: CardRow[]; onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (cards.length === 0) {
    return (
      <p className="text-center text-gray-400 text-sm py-10">
        저장된 카드 데이터가 없습니다. 크롤링 후 DB 저장을 눌러주세요.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-gray-500 text-xs border-b border-gray-100">
          <tr>
            <th className="text-left py-2 px-2 w-6" />
            <th className="text-left py-2 px-2">카드명</th>
            <th className="text-left py-2 px-2">카드사</th>
            <th className="text-left py-2 px-2">종류</th>
            <th className="text-right py-2 px-2">연회비</th>
            <th className="text-center py-2 px-2">혜택수</th>
            <th className="text-center py-2 px-2">기준월</th>
            <th className="text-center py-2 px-2" />
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <Fragment key={card.id}>
              <tr
                onClick={() => toggle(card.id)}
                className="hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition-colors"
              >
                <td className="py-2 px-2 text-center text-gray-400 text-xs select-none">
                  {expanded.has(card.id) ? '▲' : '▼'}
                </td>
                <td className="py-2 px-2 font-medium text-gray-800 max-w-[180px] truncate">{card.name}</td>
                <td className="py-2 px-2 text-gray-500">{card.company}</td>
                <td className="py-2 px-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${card.card_type === 'credit' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {card.card_type === 'credit' ? '신용' : '체크'}
                  </span>
                </td>
                <td className="py-2 px-2 text-right text-gray-600">{card.annual_fee.toLocaleString()}원</td>
                <td className="py-2 px-2 text-center font-medium text-emerald-600">{card.benefit_count}개</td>
                <td className="py-2 px-2 text-center text-gray-400 text-xs">{card.data_month}</td>
                <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onDelete(card.id)}
                    className="text-red-400 hover:text-red-600 text-xs transition-colors"
                  >
                    삭제
                  </button>
                </td>
              </tr>
              {expanded.has(card.id) && (
                <tr className="bg-blue-50/30">
                  <td colSpan={8} className="px-4 py-3">
                    {card.benefits.length === 0 ? (
                      <p className="text-xs text-gray-400">혜택 정보 없음</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 border-b border-blue-100">
                            <th className="text-left py-1 px-2 font-medium">카테고리</th>
                            <th className="text-left py-1 px-2 font-medium">유형</th>
                            <th className="text-right py-1 px-2 font-medium">할인율</th>
                            <th className="text-right py-1 px-2 font-medium">조건금액</th>
                            <th className="text-right py-1 px-2 font-medium">월한도</th>
                            <th className="text-left py-1 px-2 font-medium">설명</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-50">
                          {card.benefits.map((b, i) => (
                            <tr key={i} className="text-gray-600">
                              <td className="py-1.5 px-2 font-medium text-gray-700">{b.category}</td>
                              <td className="py-1.5 px-2">
                                <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                                  {BENEFIT_TYPE_LABEL[b.benefit_type] || b.benefit_type}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 text-right font-semibold text-blue-600">
                                {b.rate > 0 ? `${(b.rate * 100).toFixed(1)}%` : '-'}
                              </td>
                              <td className="py-1.5 px-2 text-right text-gray-500">
                                {b.condition_amount > 0 ? `${b.condition_amount.toLocaleString()}원 이상` : '조건 없음'}
                              </td>
                              <td className="py-1.5 px-2 text-right text-gray-500">
                                {b.monthly_max ? `${b.monthly_max.toLocaleString()}원` : '무제한'}
                              </td>
                              <td className="py-1.5 px-2 text-gray-500 max-w-[240px]">{b.description || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── 통신 테이블 ───────────────────────────────────────────────────────────────

function TelecomTable({ plans, onDelete }: { plans: TelecomRow[]; onDelete: (id: number) => void }) {
  if (plans.length === 0) {
    return (
      <p className="text-center text-gray-400 text-sm py-10">
        저장된 요금제 데이터가 없습니다. 크롤링 후 DB 저장을 눌러주세요.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-gray-500 text-xs border-b border-gray-100">
          <tr>
            <th className="text-left py-2 px-2">통신사</th>
            <th className="text-left py-2 px-2">요금제명</th>
            <th className="text-right py-2 px-2">월 요금</th>
            <th className="text-center py-2 px-2">데이터</th>
            <th className="text-center py-2 px-2">통화</th>
            <th className="text-center py-2 px-2">기준월</th>
            <th className="text-center py-2 px-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {plans.map((plan) => (
            <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-2 px-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CARRIER_COLOR[plan.carrier] || 'bg-gray-100 text-gray-600'}`}>
                  {plan.carrier}
                </span>
              </td>
              <td className="py-2 px-2 text-gray-700 max-w-[200px] truncate">{plan.plan_name}</td>
              <td className="py-2 px-2 text-right font-semibold text-emerald-700">
                {plan.monthly_fee.toLocaleString()}원
              </td>
              <td className="py-2 px-2 text-center text-gray-500 text-xs">
                {plan.data_unlimited ? '무제한' : plan.data_gb ? `${plan.data_gb}GB` : '-'}
              </td>
              <td className="py-2 px-2 text-center text-gray-500 text-xs">{plan.call_type}</td>
              <td className="py-2 px-2 text-center text-gray-400 text-xs">{plan.data_month}</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => onDelete(plan.id)}
                  className="text-red-400 hover:text-red-600 text-xs transition-colors"
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
