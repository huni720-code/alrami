import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Smartphone, Wifi, Tv, Droplets, ChevronDown, ChevronUp } from 'lucide-react'
import { contractApi } from '../../lib/api'
import type { ContractResponse, ProviderInfo } from '../../lib/api'

// ── 상수 ──────────────────────────────────────────────────────────────────────

type Category = '휴대폰' | '인터넷' | 'TV' | '정수기'
type Phase = 'select' | 'detail'
type Mode = 'know' | 'unknown'

const FOUR_CATS: Category[] = ['휴대폰', '인터넷', 'TV', '정수기']

const CAT_META: { cat: Category; Icon: typeof Smartphone; providerLabel: string }[] = [
  { cat: '휴대폰', Icon: Smartphone, providerLabel: '통신사' },
  { cat: '인터넷', Icon: Wifi,       providerLabel: '통신사' },
  { cat: 'TV',     Icon: Tv,         providerLabel: '통신사' },
  { cat: '정수기', Icon: Droplets,   providerLabel: '렌탈사' },
]

const PROVIDERS: Record<Category, string[]> = {
  휴대폰: ['SKT', 'KT', 'LG U+', '알뜰폰'],
  인터넷: ['SKT', 'KT', 'LG U+'],
  TV:    ['SKT', 'KT', 'LG U+'],
  정수기: ['코웨이', '청호나이스', 'LG전자', 'SK매직', '쿠쿠', '기타'],
}

const TERM_MONTHS = [12, 24, 36] as const

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function addMonths(startMonth: string, months: number): string {
  const [y, m] = startMonth.split('-').map(Number)
  const total = (m - 1) + months
  const ty = y + Math.floor(total / 12)
  const tm = (total % 12) + 1
  const lastDay = new Date(ty, tm, 0).getDate()
  return `${ty}-${String(tm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

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
  completed,
  selected,
  onToggle,
  onNext,
  onSkip,
}: {
  completed: Set<Category>
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
        <p className="text-[14px] text-gray-400 mb-8">가진 것만 골라주세요</p>

        <div className="grid grid-cols-2 gap-3 mb-auto">
          {CAT_META.map(({ cat, Icon }) => {
            const done = completed.has(cat)
            const sel = selected.has(cat)
            return (
              <button
                key={cat}
                type="button"
                disabled={done}
                onClick={() => !done && onToggle(cat)}
                className={`rounded-2xl border-2 p-5 flex flex-col items-center gap-2 min-h-[110px] justify-center transition-all active:scale-[0.97] ${
                  done
                    ? 'border-[#10b981] bg-[#E1F5EE] cursor-default'
                    : sel
                    ? 'border-[#10b981] bg-[#E1F5EE]'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <Icon
                  size={32}
                  strokeWidth={1.5}
                  className={done || sel ? 'text-[#0F6E56]' : 'text-gray-400'}
                />
                <span className={`text-[13px] font-semibold ${done || sel ? 'text-[#0F6E56]' : 'text-gray-600'}`}>
                  {cat}
                </span>
                <span className={`text-[11px] font-bold ${done || sel ? 'text-[#10b981]' : 'text-gray-400'}`}>
                  {done ? '✓ 완료' : sel ? '✓ 선택됨' : '+ 추가'}
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
            className="w-full text-center text-[14px] text-gray-400 py-3 min-h-[44px]"
          >
            없으면 건너뛰기
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 확인 도우미 (몰라요 경로에서만) ──────────────────────────────────────────

function HelperSection({
  category,
  allProviders,
  onSaveConfirmed,
  busy,
}: {
  category: Category
  allProviders: ProviderInfo[]
  onSaveConfirmed: (provider: string, endDate: string) => void
  busy: boolean
}) {
  const [hp, setHp] = useState('')
  const [hDate, setHDate] = useState('')
  const [dateErr, setDateErr] = useState('')

  const relevant = allProviders.filter((p) =>
    p.category_hint?.split('/').some((h) => h.trim() === category)
  )
  const info = relevant.find((p) => p.provider === hp) ?? null
  const phoneNum = info?.short_number || info?.center_number || null

  const validateDate = (v: string) => {
    if (!v) { setDateErr(''); return false }
    const [y, m] = v.split('-').map(Number)
    if (!y || !m || m < 1 || m > 12 || y < 2024 || y > 2035) {
      setDateErr('올바른 연월을 입력해 주세요')
      return false
    }
    setDateErr('')
    return true
  }

  const canSave = hp && hDate && !dateErr && !busy

  return (
    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5 space-y-5">
      <p className="text-[13px] font-bold text-gray-700">약정일 확인하는 법</p>

      {/* 회사 선택 */}
      {relevant.length > 0 && (
        <div>
          <p className="text-[11px] text-gray-400 mb-2">회사를 고르면 연락처가 나와요</p>
          <div className="flex flex-wrap gap-2">
            {relevant.map((p) => (
              <Chip key={p.provider} label={p.provider} selected={hp === p.provider} onSelect={() => setHp(p.provider)} />
            ))}
          </div>
        </div>
      )}

      {/* 연락처 카드 */}
      {hp && (
        <div className="space-y-3">
          {phoneNum ? (
            <>
              <a
                href={`tel:${phoneNum}`}
                className="flex items-center justify-center gap-2 w-full bg-[#10b981] text-white py-3.5 rounded-xl text-[15px] font-bold min-h-[52px]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16v.92z" />
                </svg>
                {phoneNum} 전화하기
              </a>
              {info?.app_name && info.check_path && (
                <p className="text-[12px] text-gray-500 leading-relaxed">
                  또는 <span className="font-semibold text-gray-700">{info.app_name}</span> 앱 &gt; {info.check_path}
                </p>
              )}
            </>
          ) : (
            <a
              href={`https://search.naver.com/search.naver?query=${encodeURIComponent(hp + ' 고객센터')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full border-2 border-gray-200 text-gray-600 py-3.5 rounded-xl text-[14px] font-semibold min-h-[52px]"
            >
              {hp} 고객센터 검색 →
            </a>
          )}
          <p className="text-[11px] text-gray-400">자동 조회는 안 돼요. 확인 후 아래에 입력하세요.</p>
        </div>
      )}

      {/* 확인한 날짜 입력 */}
      <div>
        <p className="text-[12px] text-gray-500 font-semibold mb-2">확인한 약정 종료 연월</p>
        <input
          type="month"
          value={hDate}
          min="2024-01"
          max="2035-12"
          onChange={(e) => { setHDate(e.target.value); validateDate(e.target.value) }}
          className="w-full border-2 border-gray-200 focus:border-[#10b981] rounded-2xl px-4 py-3.5 text-[16px] font-semibold outline-none transition-colors"
        />
        {dateErr && <p className="text-[12px] text-red-400 mt-1">{dateErr}</p>}
      </div>

      <button
        type="button"
        disabled={!canSave}
        onClick={() => canSave && onSaveConfirmed(hp, `${hDate}-01`)}
        className="w-full bg-gray-900 disabled:bg-gray-100 disabled:text-gray-400 text-white py-[14px] rounded-2xl text-[15px] font-bold transition-all active:scale-[0.98]"
      >
        {busy ? '저장 중...' : '이 날짜로 저장 (확정)'}
      </button>
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
    accuracy: 'confirmed' | 'estimated'
  }) => void
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
  const [showHelper, setShowHelper] = useState(false)
  const helperRef = useRef<HTMLDivElement>(null)

  const maxMonth = new Date().toISOString().slice(0, 7)

  const computedEndDate = useMemo(() => {
    if (mode === 'know') return endDate
    if (startMonth && termMonths) return addMonths(startMonth, termMonths)
    return ''
  }, [mode, endDate, startMonth, termMonths])

  const fee = feeInput ? Math.floor(Number(feeInput)) * 10000 : undefined

  const knowReady = mode === 'know' && !!provider && !!endDate
  const unknownReady = mode === 'unknown' && !!provider && !!computedEndDate

  const handleSave = () => {
    if (mode === 'know' && knowReady) {
      onSave({ provider, endDate, monthlyFee: fee, accuracy: 'confirmed' })
    } else if (mode === 'unknown' && unknownReady) {
      onSave({
        provider,
        startDate: startMonth ? `${startMonth}-01` : undefined,
        termMonths: termMonths ?? undefined,
        monthlyFee: fee,
        accuracy: 'estimated',
      })
    }
  }

  const handleHelperSave = (hp: string, confirmedDate: string) => {
    onSave({ provider: hp, endDate: confirmedDate, monthlyFee: fee, accuracy: 'confirmed' })
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

            {computedEndDate && (
              <div className="rounded-2xl bg-[#E1F5EE] px-5 py-4">
                <p className="text-[11px] text-[#0F6E56] font-semibold mb-0.5">예상 만료일 (추정)</p>
                <p className="text-[20px] font-extrabold text-[#0F6E56]">{fmtDate(computedEndDate)}쯤</p>
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
                className="flex items-center gap-1 text-[13px] text-gray-500 font-semibold min-h-[44px]"
              >
                {showHelper ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                정확히 확인하는 법 (확인 도우미)
              </button>
              {showHelper && (
                <div ref={helperRef}>
                  <HelperSection
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
              placeholder="0"
              className="flex-1 text-[28px] font-extrabold text-gray-900 placeholder:text-gray-200 bg-transparent outline-none"
            />
            <span className="text-[15px] font-semibold text-gray-400 ml-2 pb-1">만원/월</span>
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="px-6 pb-10 pt-4 space-y-1">
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
          className="w-full text-center text-[14px] text-gray-400 py-3 min-h-[44px]"
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

  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>('select')
  const [completed, setCompleted] = useState<Set<Category>>(new Set())
  const [selected, setSelected] = useState<Set<Category>>(new Set())
  const [queue, setQueue] = useState<Category[]>([])
  const [queueIdx, setQueueIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [helperProviders, setHelperProviders] = useState<ProviderInfo[]>([])

  useEffect(() => {
    contractApi.list(true)
      .then((r) => {
        const cats = new Set(
          r.data
            .filter((c) => FOUR_CATS.includes(c.category as Category))
            .map((c) => c.category as Category)
        )
        setCompleted(cats)
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
    const toEnter = FOUR_CATS.filter((c) => selected.has(c) && !completed.has(c))
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
    accuracy: 'confirmed' | 'estimated'
  }) => {
    setBusy(true)
    try {
      await contractApi.create({
        category: queue[queueIdx],
        provider: data.provider,
        end_date: data.endDate,
        start_date: data.startDate,
        term_months: data.termMonths,
        monthly_fee: data.monthlyFee,
        accuracy: data.accuracy,
      })
      setCompleted((prev) => new Set([...prev, queue[queueIdx]]))
      advance()
    } catch {
      // keep form for retry
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
        completed={completed}
        selected={selected}
        onToggle={toggleSelect}
        onNext={startDetail}
        onSkip={() => navigate('/dashboard')}
      />
    )
  }

  return (
    <DetailPhase
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
