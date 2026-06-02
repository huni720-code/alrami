import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Smartphone, Wifi, Tv, Droplets, Plus, X, CheckCircle } from 'lucide-react'
import { contractApi, switchLogApi, recommendationApi } from '../lib/api'
import type { ContractResponse, SwitchLogSummary, TelecomEstimate } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

const AFFILIATE_ENABLED = false
const MOYO_URL = 'https://www.moyoplan.com'
const AITDA_URL = 'https://www.aitda.kr'

const TELECOM_CATS = new Set(['휴대폰', '인터넷', 'TV'])

const CAT_ICON = { 휴대폰: Smartphone, 인터넷: Wifi, TV: Tv, 정수기: Droplets } as const

function CatIcon({ category, size = 18, className = '' }: { category: string; size?: number; className?: string }) {
  const Icon = (CAT_ICON as Record<string, typeof Smartphone>)[category] ?? Smartphone
  return <Icon size={size} className={className} />
}

function ddayLabel(dday: number) {
  if (dday > 0) return `D-${dday}`
  if (dday === 0) return 'D-Day'
  return `D+${Math.abs(dday)}`
}

function fmtYearMonth(d: string) {
  const [y, m] = d.split('-')
  return `${y}년 ${parseInt(m)}월`
}

function addMonths(startYM: string, months: number): string {
  const [y, m] = startYM.split('-').map(Number)
  const total = (m - 1) + months
  const ty = y + Math.floor(total / 12)
  const tm = (total % 12) + 1
  const lastDay = new Date(ty, tm, 0).getDate()
  return `${ty}-${String(tm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

const TERM_OPTS = [12, 24, 36] as const
type TermOpt = typeof TERM_OPTS[number]

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

// ── ContractCard (2×2 grid tile) ──────────────────────────────────────────────

function ContractCard({
  contract,
  isUrgent,
  onTap,
}: {
  contract: ContractResponse
  isUrgent: boolean
  onTap: () => void
}) {
  const danger = isUrgent && contract.dday <= 30
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => e.key === 'Enter' && onTap()}
      className={`border-2 ${danger ? 'border-red-400' : 'border-gray-100'} rounded-2xl p-4 bg-white active:bg-gray-50 transition-all select-none cursor-pointer flex flex-col h-[148px]`}
    >
      <div className="flex items-center justify-between">
        <CatIcon category={contract.category} size={20} className={danger ? 'text-red-400' : 'text-[#10b981]'} />
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          contract.accuracy === 'confirmed'
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-amber-50 text-amber-500'
        }`}>
          {contract.accuracy === 'confirmed' ? '확정' : '추정'}
        </span>
      </div>
      <p className="text-[12px] text-gray-400 mt-2 leading-none">{contract.category}</p>
      <p className="text-[15px] font-extrabold text-gray-900 leading-tight truncate">{contract.provider}</p>
      <div className="mt-auto">
        <p className="text-[11px] text-gray-400">{fmtYearMonth(contract.end_date)}</p>
        <p className={`text-[13px] font-bold ${
          contract.dday <= 0 ? 'text-red-500' : contract.dday <= 30 ? 'text-orange-500' : 'text-gray-500'
        }`}>
          {ddayLabel(contract.dday)}
        </p>
      </div>
    </div>
  )
}

// ── AddCard (empty slot) ───────────────────────────────────────────────────────

function AddCard({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-1 active:bg-gray-50 transition-all text-gray-300 h-[148px]"
    >
      <Plus size={22} />
      <span className="text-[12px] font-semibold">추가</span>
    </button>
  )
}

// ── ActionBar (most-urgent CTA strip) ─────────────────────────────────────────

function ActionBar({ contract, onTap }: { contract: ContractResponse | null; onTap: () => void }) {
  if (!contract || contract.dday > 90) return null
  return (
    <button
      type="button"
      onClick={onTap}
      className="w-full bg-red-50 border border-red-100 rounded-2xl px-4 py-3.5 flex items-center justify-between active:bg-red-100 transition-all"
    >
      <div className="text-left">
        <p className="text-[13px] font-bold text-red-700">
          {contract.provider} {contract.category} 곧 만료
        </p>
        <p className="text-[11px] text-red-400 mt-0.5">
          {ddayLabel(contract.dday)} · 갈아타기 진단 보기 →
        </p>
      </div>
    </button>
  )
}

// ── DetailOverlay (full-screen) ────────────────────────────────────────────────

function DetailOverlay({
  contract,
  onClose,
  onSaved,
  onDeleted,
}: {
  contract: ContractResponse
  onClose: () => void
  onSaved: (updated: ContractResponse) => void
  onDeleted: (id: number) => void
}) {
  const isMobile = contract.category === '휴대폰'

  const [localFee, setLocalFee] = useState<number | null>(contract.monthly_fee)
  const hasFee = isMobile && !!localFee
  const [feeInput, setFeeInput] = useState('')
  const [feeSaving, setFeeSaving] = useState(false)

  const [diagnosis, setDiagnosis] = useState<TelecomEstimate | null>(null)
  const [diagLoading, setDiagLoading] = useState(isMobile && !!contract.monthly_fee)

  const [mode, setMode] = useState<'know' | 'unknown'>(
    contract.accuracy === 'confirmed' ? 'know' : 'unknown'
  )
  const [endDate, setEndDate] = useState(contract.end_date ?? '')
  const [startMonth, setStartMonth] = useState('')
  const [termMonths, setTermMonths] = useState<TermOpt | null>(null)
  const [busy, setBusy] = useState(false)
  const [delConfirm, setDelConfirm] = useState(false)
  const [delBusy, setDelBusy] = useState(false)

  const maxMonth = new Date().toISOString().slice(0, 7)
  const previewEnd =
    mode === 'unknown' && startMonth && termMonths ? addMonths(startMonth, termMonths) : null
  const canSave =
    (mode === 'know' && !!endDate) ||
    (mode === 'unknown' && !!startMonth && !!termMonths)

  useEffect(() => {
    if (!isMobile || !localFee) return
    setDiagLoading(true)
    setDiagnosis(null)
    recommendationApi.telecomEstimate(localFee)
      .then((r) => setDiagnosis(r.data))
      .catch(() => {})
      .finally(() => setDiagLoading(false))
  }, [localFee])

  const handleSaveFee = async () => {
    const val = parseInt(feeInput)
    if (!val || val < 1000) return
    setFeeSaving(true)
    try {
      const res = await contractApi.update(contract.id, { monthly_fee: val })
      setLocalFee(val)
      setFeeInput('')
      onSaved(res.data)
    } catch {
      // keep input for retry
    } finally {
      setFeeSaving(false)
    }
  }

  const switchMode = (m: 'know' | 'unknown') => {
    setMode(m)
    setEndDate(contract.end_date ?? '')
    setStartMonth('')
    setTermMonths(null)
  }

  const handleSave = async () => {
    if (!canSave || busy) return
    setBusy(true)
    try {
      const payload =
        mode === 'know'
          ? { end_date: endDate, accuracy: 'confirmed' as const }
          : { start_date: `${startMonth}-01`, term_months: termMonths!, accuracy: 'estimated' as const }
      const res = await contractApi.update(contract.id, payload)
      onSaved(res.data)
    } catch {
      // keep open for retry
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setDelBusy(true)
    try {
      await contractApi.remove(contract.id)
      onDeleted(contract.id)
    } catch {
      setDelBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">

      {/* sticky header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3 z-10">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400"
        >
          <X size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-gray-900 truncate">
            {contract.provider}{' '}
            <span className="text-gray-400 font-normal">{contract.category}</span>
          </p>
          <p className="text-[12px] text-gray-400">
            {fmtYearMonth(contract.end_date)} 만료 · {ddayLabel(contract.dday)}
          </p>
        </div>
        <CatIcon category={contract.category} size={20} className="text-[#10b981] shrink-0" />
      </div>

      <div className="px-5 py-5 pb-12 space-y-6">

        {/* diagnosis — 휴대폰 only */}
        {isMobile && (
          <section>
            <p className="text-[12px] text-gray-500 font-semibold mb-3">절약 진단</p>
            {diagLoading && (
              <div className="flex items-center gap-2 text-gray-400 py-2">
                <div className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-[#10b981] animate-spin" />
                <span className="text-[13px]">분석 중...</span>
              </div>
            )}
            {!diagLoading && diagnosis && diagnosis.saving_annual > 0 && (
              <div className="rounded-2xl bg-[#E1F5EE] p-5">
                <p className="text-[11px] text-[#0F6E56] font-semibold mb-1">알뜰폰으로 바꾸면 (추정)</p>
                <p className="text-[28px] font-extrabold text-[#0F6E56]">
                  연 약 {Math.round(diagnosis.saving_annual / 10000)}만원 손해
                </p>
                <div className="mt-2 space-y-0.5">
                  <p className="text-[11px] text-[#0F6E56] opacity-70">
                    근거: 입력하신 월 {Math.round((localFee ?? 0) / 10000)}만원 기준
                  </p>
                  <p className="text-[11px] text-[#0F6E56] opacity-70">
                    조건: 알뜰폰 전환 가정 · 실제 요금제·통화량에 따라 달라요
                  </p>
                </div>
              </div>
            )}
            {!diagLoading && !hasFee && (
              <div className="rounded-2xl bg-gray-50 p-4 space-y-3">
                <p className="text-[13px] text-gray-600 font-semibold">월 통신비를 입력하면 절약 진단을 드려요</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={feeInput}
                    onChange={(e) => setFeeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveFee()}
                    placeholder="예: 65000"
                    className="flex-1 border border-gray-200 focus:border-[#10b981] rounded-xl px-3 py-2.5 text-[15px] outline-none transition-colors"
                  />
                  <button
                    type="button"
                    disabled={!feeInput || feeSaving}
                    onClick={handleSaveFee}
                    className="bg-[#10b981] disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold px-4 rounded-xl text-[14px] transition-colors"
                  >
                    {feeSaving ? '...' : '확인'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* handoff — by category (휴대폰 section gated by AFFILIATE_ENABLED) */}
        {(contract.category !== '휴대폰' || AFFILIATE_ENABLED) && (
        <section>
          <p className="text-[12px] text-gray-500 font-semibold mb-3">갈아타기</p>

          {contract.category === '휴대폰' && AFFILIATE_ENABLED && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <a
                  href={MOYO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-[#10b981] text-white font-bold py-3 rounded-2xl text-[15px] text-center active:opacity-80 transition-all"
                >
                  모요
                </a>
                <a
                  href={AITDA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-[#10b981] text-white font-bold py-3 rounded-2xl text-[15px] text-center active:opacity-80 transition-all"
                >
                  아정당
                </a>
              </div>
              <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                외부 서비스로 연결돼요 · 가입 시 만기톡이 수수료를 받아요
              </p>
            </div>
          )}

          {(contract.category === '인터넷' || contract.category === 'TV') && (
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-[14px] font-semibold text-gray-700 mb-1">통신사 직접 문의</p>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                약정 만료 후 요금제 변경·재약정 조건을 통신사 고객센터에 문의해 보세요.
              </p>
            </div>
          )}

          {contract.category === '정수기' && (
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-[14px] font-semibold text-gray-700 mb-1">의무기간 종료 후엔</p>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                소유 이전 또는 해지가 가능해요.<br />렌탈사에 직접 문의해 보세요.
              </p>
            </div>
          )}
        </section>
        )}

        {/* date edit */}
        <section>
          <p className="text-[12px] text-gray-500 font-semibold mb-3">날짜 수정</p>

          <div className="flex gap-2 mb-4">
            <Chip label="만료일 알아요" selected={mode === 'know'} onSelect={() => switchMode('know')} />
            <Chip label="언제인지 몰라요" selected={mode === 'unknown'} onSelect={() => switchMode('unknown')} />
          </div>

          {mode === 'know' && (
            <div className="mb-4">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border-2 border-gray-200 focus:border-[#10b981] rounded-2xl px-4 py-4 text-[16px] font-semibold text-gray-900 outline-none transition-colors"
              />
            </div>
          )}

          {mode === 'unknown' && (
            <div className="space-y-4 mb-4">
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
                  {TERM_OPTS.map((t) => (
                    <Chip key={t} label={`${t}개월`} selected={termMonths === t} onSelect={() => setTermMonths(t)} />
                  ))}
                </div>
              </div>
              {previewEnd && (
                <div className="rounded-2xl bg-[#E1F5EE] px-5 py-4">
                  <p className="text-[11px] text-[#0F6E56] font-semibold mb-0.5">예상 만료일 (추정)</p>
                  <p className="text-[20px] font-extrabold text-[#0F6E56]">{fmtYearMonth(previewEnd)}쯤</p>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={!canSave || busy}
            onClick={handleSave}
            className="w-full bg-[#10b981] disabled:bg-gray-100 disabled:text-gray-400 text-white py-[16px] rounded-2xl text-[16px] font-bold mb-3 transition-all active:scale-[0.98]"
          >
            {busy ? '저장 중...' : mode === 'know' ? '저장 (확정)' : '저장 (추정)'}
          </button>

          {delConfirm ? (
            <button
              type="button"
              disabled={delBusy}
              onClick={handleDelete}
              className="w-full border-2 border-red-400 text-red-500 py-[14px] rounded-2xl text-[15px] font-semibold transition-all active:scale-[0.98]"
            >
              {delBusy ? '삭제 중...' : '정말 삭제할게요'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDelConfirm(true)}
              className="w-full text-center text-[14px] text-gray-400 py-3 min-h-[44px]"
            >
              이 약정 삭제
            </button>
          )}
        </section>

      </div>
    </div>
  )
}

// ── "갈아탔어요?" 인앱 프롬프트 ──────────────────────────────────────────────

function SwitchPrompt({
  contract,
  onAnswered,
}: {
  contract: ContractResponse
  onAnswered: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<'yes' | 'no' | null>(null)

  const answer = async (switched: boolean) => {
    if (busy) return
    setBusy(true)
    try {
      await switchLogApi.create({
        contract_id: contract.id,
        category: contract.category,
        provider: contract.provider,
        switched,
      })
      setDone(switched ? 'yes' : 'no')
      setTimeout(onAnswered, 1200)
    } catch {
      setBusy(false)
    }
  }

  if (done === 'yes') {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 mt-4">
        <CheckCircle size={16} className="text-[#10b981] shrink-0" />
        <p className="text-[13px] text-[#0F6E56] font-semibold">절감액이 적립됐어요!</p>
      </div>
    )
  }

  if (done === 'no') {
    return (
      <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 mt-4">
        <p className="text-[13px] text-gray-500">알겠어요. 다음 기회에 알려드릴게요.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-4 mt-4 shadow-sm">
      <p className="text-[13px] font-bold text-gray-800 mb-0.5">
        {contract.provider} {contract.category} 약정이 만료됐어요
      </p>
      <p className="text-[12px] text-gray-400 mb-3">갈아타셨나요?</p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => answer(true)}
          className="flex-1 bg-[#10b981] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-[14px] transition-all active:scale-[0.97]"
        >
          예, 갈아탔어요
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => answer(false)}
          className="flex-1 border border-gray-200 text-gray-500 font-semibold py-2.5 rounded-xl text-[14px] transition-all active:scale-[0.97]"
        >
          아니오
        </button>
      </div>
    </div>
  )
}

// ── 누적 절감 뱃지 ────────────────────────────────────────────────────────────

function SavingsBadge({ summary }: { summary: SwitchLogSummary }) {
  if (summary.switch_count === 0) return null
  return (
    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 mt-4">
      <CheckCircle size={18} className="text-[#10b981] shrink-0" />
      <div>
        <p className="text-[12px] text-[#0F6E56] font-semibold">누적 절감 (추정)</p>
        <p className="text-[16px] font-extrabold text-[#0F6E56]">
          연 약 {Math.round(summary.total_saving_annual / 10000)}만원{' '}
          <span className="text-[12px] font-normal opacity-70">· {summary.switch_count}건 전환</span>
        </p>
      </div>
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
        <Smartphone size={32} className="text-[#10b981]" strokeWidth={1.5} />
      </div>
      <p className="text-[18px] font-extrabold text-gray-800 mb-1">약정을 아직 추가하지 않았어요</p>
      <p className="text-[13px] text-gray-400 mb-8 leading-relaxed">
        만료 전에 알려드릴게요.<br />등록하고 지킴을 시작해 보세요.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-2 bg-[#10b981] text-white font-bold px-8 py-4 rounded-2xl text-[16px] shadow-md active:scale-[0.98] transition-all"
      >
        <Plus size={18} />
        약정 추가하고 지킴 시작
      </button>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [contracts, setContracts] = useState<ContractResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [overlayTarget, setOverlayTarget] = useState<ContractResponse | null>(null)
  const [answeredIds, setAnsweredIds] = useState<Set<number>>(new Set())
  const [switchSummary, setSwitchSummary] = useState<SwitchLogSummary | null>(null)

  const loadData = () => {
    Promise.all([
      contractApi.list(true)
        .then((r) => setContracts([...r.data].sort((a, b) => a.dday - b.dday)))
        .catch(() => setContracts([])),
      switchLogApi.list()
        .then((r) => setAnsweredIds(new Set(r.data.map((l) => l.contract_id).filter(Boolean) as number[])))
        .catch(() => {}),
      switchLogApi.summary()
        .then((r) => setSwitchSummary(r.data))
        .catch(() => {}),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!overlayTarget) return
    window.history.pushState({ overlayId: overlayTarget.id }, '')
    const onPop = () => setOverlayTarget(null)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [overlayTarget?.id])

  const pendingSwitch = contracts.find(
    (c) => c.dday <= 0 && c.dday >= -60 && TELECOM_CATS.has(c.category) && !answeredIds.has(c.id)
  ) ?? null

  const mostUrgent = contracts[0] ?? null

  const handleSaved = (updated: ContractResponse) => {
    setContracts((prev) =>
      [...prev.map((c) => (c.id === updated.id ? updated : c))].sort((a, b) => a.dday - b.dday)
    )
    setOverlayTarget(null)
  }

  const handleDeleted = (id: number) => {
    setContracts((prev) => prev.filter((c) => c.id !== id))
    setOverlayTarget(null)
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 rounded-full border-4 border-gray-100 border-t-[#10b981] animate-spin" />
        </div>
      </Layout>
    )
  }

  const gridSlots = contracts.slice(0, 4)
  const emptyCount = Math.max(0, 4 - gridSlots.length)

  return (
    <Layout>
      <div className="max-w-sm mx-auto pb-6">

        {/* header */}
        <div className="flex items-center justify-between pt-1 pb-5">
          <p className="text-[18px] font-extrabold text-[#10b981] tracking-tight">만기톡</p>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="text-[12px] text-gray-400 border border-gray-200 px-3 py-1.5 rounded-xl"
          >
            {user?.username ?? '내 정보'}
          </button>
        </div>

        {/* 2×2 contract grid */}
        {contracts.length === 0 ? (
          <EmptyState onAdd={() => navigate('/contracts/grid')} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {gridSlots.map((c, i) => (
              <ContractCard
                key={c.id}
                contract={c}
                isUrgent={i === 0}
                onTap={() => setOverlayTarget(c)}
              />
            ))}
            {Array.from({ length: emptyCount }).map((_, i) => (
              <AddCard key={`add-${i}`} onAdd={() => navigate('/contracts/grid')} />
            ))}
          </div>
        )}

        {/* action bar — most urgent within 90 days */}
        {contracts.length > 0 && (
          <div className="mt-3">
            <ActionBar
              contract={mostUrgent}
              onTap={() => mostUrgent && setOverlayTarget(mostUrgent)}
            />
          </div>
        )}

        {/* switch prompt */}
        {pendingSwitch && (
          <SwitchPrompt contract={pendingSwitch} onAnswered={loadData} />
        )}

        {/* savings badge */}
        {switchSummary && <SavingsBadge summary={switchSummary} />}

      </div>

      {/* detail overlay — key forces full remount when switching contracts */}
      {overlayTarget && (
        <DetailOverlay
          key={overlayTarget.id}
          contract={overlayTarget}
          onClose={() => setOverlayTarget(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </Layout>
  )
}
