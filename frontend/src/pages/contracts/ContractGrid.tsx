import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Smartphone, ChevronDown, ChevronUp } from 'lucide-react'
import { contractApi } from '../../lib/api'
import type { ProviderInfo } from '../../lib/api'
import ContractHelperSection from '../../components/ContractHelperSection'
import {
  CAT_META,
  PROVIDERS,
  TERM_MONTHS,
  FOUR_CATS,
  type Category,
} from '../../lib/contractConstants'

// ── 상수 ──────────────────────────────────────────────────────────────────────

type Phase = 'select' | 'detail'
type Mode = 'know' | 'unknown'

// ── 유틸 ──────────────────────────────────────────────────────────────────────
// 날짜 계산은 백엔드(contractApi.estimate). 프론트는 표시·포맷만.

function fmtDate(d: string) {
  const [y, m] = d.split('-')
  return `${y}년 ${parseInt(m)}월`
}

// ── Chip ──────────────────────────────────────────────────────────────────────

function Chip({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`px-4 py-2.5 rounded-full border text-[14px] font-semibold transition-colors min-h-[44px] active:scale-[0.97] ${
        selected ? 'border-[#10b981] bg-[#E1F5EE] text-[#0F6E56]' : 'border-gray-200 text-gray-600 bg-white'
      }`}
    >
      {label}
    </button>
  )
}

// ── Phase 1: 선택 그리드 ──────────────────────────────────────────────────────

function SelectPhase({
  counts,
  selected,
  onToggle,
  onNext,
  onSkip,
}: {
  counts: Record<Category, number>
  selected: Set<Category>
  onToggle: (c: Category) => void
  onNext: () => void
  onSkip: () => void
}) {
  return (
    <div className="min-h-screen bg-white px-6 pt-14 pb-10 flex flex-col">
      <div className="max-w-sm mx-auto w-full flex flex-col flex-1">
        <p className="text-[13px] font-bold text-[#10b981] mb-6 tracking-tight">만기톡</p>
        <h1 className="text-[24px] font-extrabold text-gray-900 leading-tight mb-1">
          어떤 약정이 있으세요?
        </h1>
        <p className="text-[14px] text-gray-400 mb-2">가진 것만 골라주세요</p>
        <p className="text-[13px] text-[#0F6E56] font-semibold mb-8">가족 약정도 함께 지켜드려요</p>

        <div className="grid grid-cols-2 gap-3 mb-auto">
          {CAT_META.map(({ cat, Icon }) => {
            const count = counts[cat] ?? 0
            const has = count > 0
            const sel = selected.has(cat)
            const active = sel || has
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onToggle(cat)}
                className={`rounded-2xl border-2 p-5 flex flex-col items-center gap-2 min-h-[110px] justify-center transition-all active:scale-[0.97] ${
                  sel
                    ? 'border-[#10b981] bg-[#E1F5EE]'
                    : has
                    ? 'border-[#10b981]/40 bg-[#F4FBF8]'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <Icon
                  size={32}
                  strokeWidth={1.5}
                  className={active ? 'text-[#0F6E56]' : 'text-gray-400'}
                />
                <span className={`text-[13px] font-semibold ${active ? 'text-[#0F6E56]' : 'text-gray-600'}`}>
                  {cat}
                </span>
                <span className={`text-[11px] font-bold ${sel ? 'text-[#10b981]' : has ? 'text-[#0F6E56]' : 'text-gray-400'}`}>
                  {sel ? '✓ 선택됨' : has ? `${count}개 등록 · 더 추가` : '+ 추가'}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-8 space-y-1">
          <button
            type="button"
            onClick={onNext}
            className="w-full bg-[#10b981] text-white py-[16px] rounded-2xl text-[16px] font-bold transition-all active:scale-[0.98]"
          >
            다음 →
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="w-full text-center text-[14px] text-gray-500 py-3 min-h-[44px] rounded-xl active:bg-gray-100 transition-colors"
          >
            없으면 건너뛰기
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Phase 2: 상세 입력 ────────────────────────────────────────────────────────

function DetailPhase({
  category,
  queueIdx,
  queueTotal,
  providers,
  onSave,
  onSkip,
  busy,
}: {
  category: Category
  queueIdx: number
  queueTotal: number
  providers: ProviderInfo[]
  onSave: (data: {
    provider: string
    endDate?: string
    startDate?: string
    termMonths?: number
    monthlyFee?: number
    ownerLabel?: string
    accuracy: 'confirmed' | 'estimated'
  }) => Promise<boolean>
  onSkip: () => void
  busy: boolean
}) {
  const meta = CAT_META.find((m) => m.cat === category)!
  const [mode, setMode] = useState<Mode>('know')
  const [provider, setProvider] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startMonth, setStartMonth] = useState('')
  const [termMonths, setTermMonths] = useState<12 | 24 | 36 | null>(null)
  const [feeInput, setFeeInput] = useState('')
  const [ownerLabel, setOwnerLabel] = useState('')
  const [showHelper, setShowHelper] = useState(false)
  const helperRef = useRef<HTMLDivElement>(null)

  const maxMonth = new Date().toISOString().slice(0, 7)

  // 몰라요 예상 만료일 — 백엔드 estimate (프론트 날짜 계산 금지)
  const [previewEnd, setPreviewEnd] = useState<string | null>(null)
  useEffect(() => {
    if (mode !== 'unknown' || !startMonth || !termMonths) {
      setPreviewEnd(null)
      return
    }
    let cancelled = false
    contractApi
      .estimate(`${startMonth}-01`, termMonths)
      .then((r) => { if (!cancelled) setPreviewEnd(r.data.end_date) })
      .catch(() => { if (!cancelled) setPreviewEnd(null) })
    return () => { cancelled = true }
  }, [mode, startMonth, termMonths])

  const fee = feeInput ? Math.floor(Number(feeInput)) : undefined

  const knowReady = mode === 'know' && !!provider && !!endDate
  const unknownReady = mode === 'unknown' && !!provider && !!startMonth && !!termMonths

  const ownerLabelArg = ownerLabel.trim() || undefined

  const handleSave = () => {
    if (mode === 'know' && knowReady) {
      onSave({ provider, endDate, monthlyFee: fee, ownerLabel: ownerLabelArg, accuracy: 'confirmed' })
    } else if (mode === 'unknown' && unknownReady) {
      onSave({
        provider,
        startDate: startMonth ? `${startMonth}-01` : undefined,
        termMonths: termMonths ?? undefined,
        monthlyFee: fee,
        ownerLabel: ownerLabelArg,
        accuracy: 'estimated',
      })
    }
  }

  const handleHelperSave = (hp: string, confirmedDate: string): Promise<boolean> => {
    return onSave({ provider: hp, endDate: confirmedDate, monthlyFee: fee, ownerLabel: ownerLabelArg, accuracy: 'confirmed' })
  }

  const resetMode = (m: Mode) => {
    setMode(m)
    setEndDate('')
    setStartMonth('')
    setTermMonths(null)
    setShowHelper(false)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 상단 네비 */}
      <div className="px-6 pt-14 pb-2 flex items-center gap-3">
        <meta.Icon size={20} className="text-[#10b981]" />
        <p className="text-[13px] text-gray-500 font-semibold">
          {category} 약정 <span className="text-gray-300">({queueIdx + 1}/{queueTotal})</span>
        </p>
      </div>
      <div className="px-6 pb-5">
        <h2 className="text-[22px] font-extrabold text-gray-900">약정 정보를 알려주세요</h2>
      </div>

      <div className="flex-1 px-6 space-y-6 overflow-y-auto pb-4">

        {/* 알아요 / 몰라요 탭 */}
        <div className="flex gap-2">
          <Chip label="만료일 알아요" selected={mode === 'know'} onSelect={() => resetMode('know')} />
          <Chip label="언제인지 몰라요" selected={mode === 'unknown'} onSelect={() => resetMode('unknown')} />
        </div>

        {/* 통신사/렌탈사 */}
        <div>
          <p className="text-[12px] text-gray-500 font-semibold mb-3">{meta.providerLabel}</p>
          <div className="flex flex-wrap gap-2">
            {PROVIDERS[category].map((c) => (
              <Chip key={c} label={c} selected={provider === c} onSelect={() => setProvider(c)} />
            ))}
          </div>
        </div>

        {/* ── 알아요 모드 ── */}
        {mode === 'know' && (
          <div>
            <p className="text-[12px] text-gray-500 font-semibold mb-2">약정 만료일</p>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border-2 border-gray-200 focus:border-[#10b981] rounded-2xl px-4 py-4 text-[16px] font-semibold text-gray-900 outline-none transition-colors"
            />
          </div>
        )}

        {/* ── 몰라요 모드 ── */}
        {mode === 'unknown' && (
          <>
            <div>
              <p className="text-[12px] text-gray-500 font-semibold mb-2">가입하신 달</p>
              <input
                type="month"
                value={startMonth}
                max={maxMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className="w-full border-2 border-gray-200 focus:border-[#10b981] rounded-2xl px-4 py-4 text-[16px] font-semibold text-gray-900 outline-none transition-colors"
              />
            </div>

            <div>
              <p className="text-[12px] text-gray-500 font-semibold mb-2">약정 기간</p>
              <div className="flex gap-2">
                {TERM_MONTHS.map((t) => (
                  <Chip key={t} label={`${t}개월`} selected={termMonths === t} onSelect={() => setTermMonths(t)} />
                ))}
              </div>
            </div>

            {previewEnd && (
              <div className="rounded-2xl bg-[#E1F5EE] px-5 py-4">
                <p className="text-[11px] text-[#0F6E56] font-semibold mb-0.5">예상 만료일 (추정)</p>
                <p className="text-[20px] font-extrabold text-[#0F6E56]">{fmtDate(previewEnd)}쯤</p>
              </div>
            )}

            {/* 확인 도우미 토글 — 몰라요 경로에서만 노출 */}
            <div>
              <button
                type="button"
                onClick={() => {
                  setShowHelper((v) => !v)
                  setTimeout(() => helperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
                }}
                className="w-full flex items-center justify-between text-[14px] text-[#0F6E56] font-bold bg-[#E1F5EE] border border-[#10b981]/40 rounded-2xl px-4 py-3.5 min-h-[48px] active:scale-[0.98] transition-all"
              >
                <span>약정일 정확히 확인하는 법</span>
                {showHelper ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {showHelper && (
                <div ref={helperRef}>
                  <ContractHelperSection
                    category={category}
                    allProviders={providers}
                    onSaveConfirmed={handleHelperSave}
                    busy={busy}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* 월 요금 (선택) */}
        <div>
          <p className="text-[12px] text-gray-500 font-semibold mb-2">
            월 요금 <span className="font-normal text-gray-400">(선택)</span>
          </p>
          <div className="flex items-baseline border-b-2 border-gray-200 focus-within:border-[#10b981] pb-2 transition-colors">
            <input
              type="number"
              inputMode="numeric"
              value={feeInput}
              onChange={(e) => setFeeInput(e.target.value)}
              placeholder="예: 65000"
              className="flex-1 text-[28px] font-extrabold text-gray-900 placeholder:text-gray-200 bg-transparent outline-none"
            />
            <span className="text-[15px] font-semibold text-gray-400 ml-2 pb-1">원/월</span>
          </div>
        </div>

        {/* 누구 약정인가요 — 자유 입력 (예시만) */}
        <div>
          <p className="text-[12px] text-gray-500 font-semibold mb-2">
            누구 약정인가요? <span className="font-normal text-gray-400">(선택)</span>
          </p>
          <input
            type="text"
            value={ownerLabel}
            maxLength={8}
            onChange={(e) => setOwnerLabel(e.target.value)}
            placeholder="예: 엄마 휴대폰, 아빠, 할머니"
            className="w-full border-2 border-gray-200 focus:border-[#10b981] rounded-2xl px-4 py-3.5 text-[15px] font-semibold text-gray-900 outline-none transition-colors"
          />
        </div>
      </div>

      {/* 하단 고정 CTA — 긴 입력에서도 항상 보이게 sticky */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-100 px-6 pt-3 pb-6 space-y-1">
        <button
          type="button"
          disabled={!(knowReady || unknownReady) || busy}
          onClick={handleSave}
          className="w-full bg-[#10b981] disabled:bg-gray-100 disabled:text-gray-400 text-white py-[16px] rounded-2xl text-[16px] font-bold transition-all active:scale-[0.98]"
        >
          {busy ? '저장 중...' : mode === 'know' ? '저장하기 (확정)' : '저장하기 (추정)'}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-center text-[14px] text-gray-500 py-3 min-h-[44px] rounded-xl active:bg-gray-100 transition-colors"
        >
          나중에 추가할게요
        </button>
      </div>
    </div>
  )
}

// ── 메인 ──────────────────────────────────────────────────────────────────────

export default function ContractGrid() {
  const navigate = useNavigate()

  const emptyCounts: Record<Category, number> = { 휴대폰: 0, 인터넷: 0, TV: 0, 정수기: 0 }

  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>('select')
  const [counts, setCounts] = useState<Record<Category, number>>(emptyCounts)
  const [selected, setSelected] = useState<Set<Category>>(new Set())
  const [queue, setQueue] = useState<Category[]>([])
  const [queueIdx, setQueueIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [helperProviders, setHelperProviders] = useState<ProviderInfo[]>([])

  useEffect(() => {
    contractApi.list(true)
      .then((r) => {
        // 표시용 카테고리별 등록 수 집계 (count는 표시 허용)
        const next: Record<Category, number> = { 휴대폰: 0, 인터넷: 0, TV: 0, 정수기: 0 }
        r.data
          .filter((c) => FOUR_CATS.includes(c.category as Category))
          .forEach((c) => { next[c.category as Category] += 1 })
        setCounts(next)
      })
      .finally(() => setLoading(false))
  }, [])

  const toggleSelect = (cat: Category) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const startDetail = () => {
    // 이미 등록된 카테고리도 다시 선택하면 새 약정으로 추가 (가족 약정)
    const toEnter = FOUR_CATS.filter((c) => selected.has(c))
    if (toEnter.length === 0) {
      navigate('/dashboard')
      return
    }
    setQueue(toEnter)
    setQueueIdx(0)
    // Fetch provider info for helper
    contractApi.providerInfo().then((r) => setHelperProviders(r.data)).catch(() => {})
    setPhase('detail')
  }

  const handleSave = async (data: {
    provider: string
    endDate?: string
    startDate?: string
    termMonths?: number
    monthlyFee?: number
    ownerLabel?: string
    accuracy: 'confirmed' | 'estimated'
  }): Promise<boolean> => {
    setBusy(true)
    try {
      await contractApi.create({
        category: queue[queueIdx],
        provider: data.provider,
        end_date: data.endDate,
        start_date: data.startDate,
        term_months: data.termMonths,
        monthly_fee: data.monthlyFee,
        owner_label: data.ownerLabel,
        accuracy: data.accuracy,
      })
      setCounts((prev) => ({ ...prev, [queue[queueIdx]]: (prev[queue[queueIdx]] ?? 0) + 1 }))
      advance()
      return true
    } catch {
      // keep form for retry
      return false
    } finally {
      setBusy(false)
    }
  }

  const advance = () => {
    if (queueIdx + 1 < queue.length) {
      setQueueIdx((i) => i + 1)
    } else {
      navigate('/dashboard')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-gray-100 border-t-[#10b981] animate-spin" />
      </div>
    )
  }

  if (phase === 'select') {
    return (
      <SelectPhase
        counts={counts}
        selected={selected}
        onToggle={toggleSelect}
        onNext={startDetail}
        onSkip={() => navigate('/dashboard')}
      />
    )
  }

  return (
    <DetailPhase
      key={queue[queueIdx]}
      category={queue[queueIdx]}
      queueIdx={queueIdx}
      queueTotal={queue.length}
      providers={helperProviders}
      onSave={handleSave}
      onSkip={advance}
      busy={busy}
    />
  )
}
