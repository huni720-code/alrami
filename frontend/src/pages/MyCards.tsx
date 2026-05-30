import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CreditCard, Search, Trash2, X } from 'lucide-react'
import Layout from '../components/Layout'
import { dashboardApi, myCardsApi } from '../lib/api'
import type { CardCatalogItem, CardTransaction, DashboardKpi, MyCard, SmsParseResult } from '../lib/api'
import SavingsInsightCard from '../components/insight/SavingsInsightCard'
import { generateInsight } from '../services/savingsInsight'

// ── 헬퍼 ─────────────────────────────────────────────────────

function ProgressBar({ spent, target, achieved }: { spent: number; target: number; achieved: boolean }) {
  const pct = target > 0 ? Math.min(100, Math.round((spent / target) * 100)) : 0
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div
        className={`h-2 rounded-full transition-all ${achieved ? 'bg-[#10b981]' : 'bg-orange-400'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── SMS 모달 ──────────────────────────────────────────────────

function SmsModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SmsParseResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleAnalyze = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await myCardsApi.parseSms(text.trim())
      setResult(res.data)
      onDone()
    } catch (e: any) {
      if (e?.response?.status === 422) {
        setError('카드 결제 문자를 인식하지 못했습니다.')
      } else {
        setError('오류가 발생했습니다. 다시 시도해주세요.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">결제 문자 붙여넣기</h3>
          <button type="button" onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        {!result ? (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#10b981]"
              placeholder="[신한카드] 12,000원 승인 홍길동(1234) 스타벅스 잔여한도 2,488,000원"
            />
            {error && (
              <div className="mt-2 text-sm text-red-500">
                <p>❌ {error}</p>
                <p className="text-gray-400 text-xs mt-0.5">문자를 그대로 복사해서 붙여넣어 주세요.</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!text.trim() || loading}
              className="mt-3 w-full bg-[#10b981] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  분석 중...
                </span>
              ) : '분석하기'}
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="bg-green-50 rounded-xl p-3 text-sm space-y-1">
              <p className="font-semibold text-green-700">✅ 파싱 완료</p>
              <p className="text-gray-600">카드사: {result.parsed.card_company}</p>
              <p className="text-gray-600">금액: {result.parsed.amount.toLocaleString()}원</p>
              {result.parsed.merchant && <p className="text-gray-600">가맹점: {result.parsed.merchant}</p>}
            </div>

            {result.matched_card ? (
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <p className="font-medium text-gray-700 mb-1">
                  {result.matched_card.card_name}에 추가됐어요
                </p>
                <ProgressBar
                  spent={result.matched_card.this_month_spent}
                  target={result.matched_card.performance_target}
                  achieved={result.matched_card.achieved}
                />
                <p className="text-xs text-gray-500 mt-1">{result.message}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">{result.message}</p>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm"
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 카드 추가 모달 ────────────────────────────────────────────

function AddCardModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const [step, setStep] = useState<1 | 2>(1)
  const [catalog, setCatalog] = useState<CardCatalogItem[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<CardCatalogItem | null>(null)
  const [nickname, setNickname] = useState('')
  const [last4, setLast4] = useState('')
  const [targetWan, setTargetWan] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    myCardsApi.cardCatalog().then((r) => setCatalog(r.data)).catch(() => {})
  }, [])

  const filtered = catalog.filter(
    (c) =>
      c.name.includes(query) ||
      c.company.includes(query)
  )

  const handleSelect = (card: CardCatalogItem) => {
    setSelected(card)
    setStep(2)
  }

  const handleAdd = async () => {
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      await myCardsApi.add({
        card_id: selected.id,
        nickname: nickname.trim() || undefined,
        last_4_digits: last4.trim() || undefined,
        performance_target: targetWan ? Number(targetWan) * 10000 : undefined,
      })
      onAdded()
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.detail || '등록에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button type="button" onClick={() => setStep(1)}>
                <ChevronLeft size={20} className="text-gray-400" />
              </button>
            )}
            <h3 className="font-semibold text-gray-800">
              {step === 1 ? '카드 선택' : '카드 정보 입력'}
            </h3>
          </div>
          <button type="button" onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        {step === 1 ? (
          <>
            <div className="relative mb-3 shrink-0">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                placeholder="카드명 또는 카드사 검색"
              />
            </div>
            <div className="overflow-y-auto flex-1 space-y-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  {catalog.length === 0 ? '카드 목록을 불러오는 중...' : '검색 결과가 없습니다.'}
                </p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.company}</p>
                    </div>
                    <p className="text-xs text-gray-400 shrink-0">
                      {c.annual_fee === 0 ? '연회비 무료' : `연 ${c.annual_fee.toLocaleString()}원`}
                    </p>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm">
              <p className="font-medium text-gray-800">{selected?.name}</p>
              <p className="text-xs text-gray-400">{selected?.company}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">카드 별명 (선택)</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                placeholder="예: 주거래 신한"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                카드 뒷 4자리 (선택)
              </label>
              <input
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                placeholder="1234"
                maxLength={4}
              />
              <p className="text-xs text-gray-400 mt-0.5">입력 시 결제 문자 자동 매칭됩니다</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">목표 실적 (선택)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={targetWan}
                  onChange={(e) => setTargetWan(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                  placeholder="30"
                  min={0}
                />
                <span className="text-sm text-gray-500 shrink-0">만원</span>
              </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="button"
              onClick={handleAdd}
              disabled={loading}
              className="w-full bg-[#10b981] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
            >
              {loading ? '등록 중...' : '등록'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 탭1: 내 카드 실적 ─────────────────────────────────────────

function CardPerformanceTab({
  cards,
  loading,
  onRefresh,
}: {
  cards: MyCard[]
  loading: boolean
  onRefresh: () => void
}) {
  const [showSms, setShowSms] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  const handleDelete = async (id: number) => {
    if (!confirm('카드를 삭제할까요?')) return
    await myCardsApi.remove(id)
    onRefresh()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setShowSms(true)}
          className="bg-[#10b981] text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          + 결제 문자 붙여넣기
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-4 border-gray-100 border-t-[#10b981] animate-spin" />
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-10">
          <CreditCard size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 text-sm mb-4">등록된 카드가 없어요</p>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="bg-[#10b981] text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
          >
            카드 추가하기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => {
            const label = card.nickname || card.card_name
            const hasTarget = card.performance_target != null && card.performance_target > 0
            const pct = hasTarget
              ? Math.min(100, Math.round((card.this_month_spent / card.performance_target!) * 100))
              : 0
            return (
              <div key={card.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{label}</p>
                    <p className="text-xs text-gray-400">
                      {card.card_company}
                      {card.last_4_digits && ` · ···${card.last_4_digits}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(card.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {!hasTarget ? (
                  <p className="text-xs text-gray-400">목표 미설정</p>
                ) : (
                  <>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-500">
                        {card.this_month_spent.toLocaleString()}원
                        <span className="text-gray-300"> / {card.performance_target!.toLocaleString()}원</span>
                      </span>
                      <span className={card.achieved ? 'text-[#10b981] font-semibold' : 'text-orange-500'}>
                        {card.achieved ? '✅ 실적 달성!' : `${card.remaining.toLocaleString()}원 더 필요`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${card.achieved ? 'bg-[#10b981]' : 'bg-orange-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            )
          })}

          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="w-full border-2 border-dashed border-gray-200 text-gray-400 text-sm font-medium py-3 rounded-2xl hover:border-[#10b981] hover:text-[#10b981] transition-colors"
          >
            + 카드 추가
          </button>
        </div>
      )}

      {showSms && (
        <SmsModal
          onClose={() => setShowSms(false)}
          onDone={onRefresh}
        />
      )}
      {showAdd && (
        <AddCardModal
          onClose={() => setShowAdd(false)}
          onAdded={onRefresh}
        />
      )}
    </>
  )
}

// ── 탭2: 결제 내역 ────────────────────────────────────────────

function TransactionsTab() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [txs, setTxs] = useState<CardTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    myCardsApi.transactions(year, month)
      .then((r) => setTxs(r.data))
      .catch(() => setTxs([]))
      .finally(() => setLoading(false))
  }, [year, month])

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }

  // 날짜별 그룹핑
  const grouped: Record<string, CardTransaction[]> = {}
  txs.forEach((tx) => {
    const d = tx.transaction_at.slice(0, 10)
    if (!grouped[d]) grouped[d] = []
    grouped[d].push(tx)
  })
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <>
      <div className="flex items-center justify-center gap-4 mb-4">
        <button type="button" onClick={prevMonth} className="p-1 text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-semibold text-gray-700">{year}년 {month}월</span>
        <button type="button" onClick={nextMonth} className="p-1 text-gray-400 hover:text-gray-600">
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-4 border-gray-100 border-t-[#10b981] animate-spin" />
        </div>
      ) : dates.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">이번달 등록된 결제 내역이 없어요</p>
      ) : (
        <div className="space-y-4">
          {dates.map((d) => (
            <div key={d}>
              <p className="text-xs text-gray-400 font-medium mb-1.5">{d}</p>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {grouped[d].map((tx, i) => (
                  <div
                    key={tx.id}
                    className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{tx.merchant || '가맹점 미상'}</p>
                      <p className="text-xs text-gray-400">{tx.card_name || '매칭 없음'}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{tx.amount.toLocaleString()}원</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────

export default function MyCards() {
  const [tab, setTab] = useState<'performance' | 'transactions'>('performance')
  const [cards, setCards] = useState<MyCard[]>([])
  const [cardsLoading, setCardsLoading] = useState(true)
  const [kpi, setKpi] = useState<DashboardKpi | null>(null)

  const fetchCards = () => {
    setCardsLoading(true)
    myCardsApi.list()
      .then((r) => setCards(r.data))
      .catch(() => setCards([]))
      .finally(() => setCardsLoading(false))
  }

  useEffect(() => {
    fetchCards()
    dashboardApi.kpi().then((r) => setKpi(r.data)).catch(() => {})
  }, [])

  const insight = useMemo(() => kpi ? generateInsight(kpi) : null, [kpi])

  return (
    <Layout>
      <div className="max-w-lg mx-auto pb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4">카드 실적</h2>

        {/* 탭 */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          {(['performance', 'transactions'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
                tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t === 'performance' ? '내 카드 실적' : '결제 내역'}
            </button>
          ))}
        </div>

        {tab === 'performance' ? (
          <CardPerformanceTab cards={cards} loading={cardsLoading} onRefresh={fetchCards} />
        ) : (
          <TransactionsTab />
        )}

        {insight && <SavingsInsightCard insight={insight} />}
      </div>
    </Layout>
  )
}
