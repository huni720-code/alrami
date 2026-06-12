import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Smartphone, Wifi, Tv, Droplets, Plus, X, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { contractApi, switchLogApi, recommendationApi } from '../lib/api'
import type { ContractResponse, SwitchLogSummary, TelecomEstimate, ProviderInfo } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import ContractHelperSection from '../components/ContractHelperSection'
import InlineContractAdd from '../components/InlineContractAdd'
import { useToast } from '../components/Toast'

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

function fmtMonthDay(d: string) {
  const [, m, day] = d.split('-')
  return `${parseInt(m)}월 ${parseInt(day)}일`
}

function ownerCat(c: ContractResponse) {
  return c.owner_label ? `${c.owner_label} · ${c.category}` : c.category
}

// 상태 라벨 톤 — 판정은 백엔드(contract.status), 프론트는 색만 매핑
type ContractStatus = ContractResponse['status']
const STATUS_TONE: Record<ContractStatus, { pill: string; dday: string; border: string; icon: string }> = {
  여유: { pill: 'bg-emerald-50 text-emerald-600', dday: 'text-gray-500', border: 'border-gray-100', icon: 'text-[#10b981]' },
  점검: { pill: 'bg-amber-50 text-amber-600', dday: 'text-amber-500', border: 'border-gray-100', icon: 'text-[#10b981]' },
  임박: { pill: 'bg-red-50 text-red-500', dday: 'text-orange-500', border: 'border-red-400', icon: 'text-red-400' },
  지남: { pill: 'bg-red-50 text-red-500', dday: 'text-red-500', border: 'border-red-400', icon: 'text-red-400' },
}

// 날짜 계산은 백엔드(contractApi.estimate). 프론트는 표시·포맷만.

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

// ── UrgentCard (가장 임박 1건, 큰 카드) ───────────────────────────────────────

// 상태별 카드 톤 — 판정은 백엔드 status, 프론트는 색만
const URGENT_TONE: Record<ContractStatus, { card: string; sub: string; title: string; cta: string }> = {
  여유: { card: 'bg-gray-50 border-gray-100', sub: 'text-gray-400', title: 'text-gray-900', cta: 'text-gray-400' },
  점검: { card: 'bg-amber-50 border-amber-100', sub: 'text-amber-500', title: 'text-amber-900', cta: 'text-amber-500' },
  임박: { card: 'bg-red-50 border-red-100', sub: 'text-red-500', title: 'text-red-700', cta: 'text-red-500' },
  지남: { card: 'bg-red-50 border-red-100', sub: 'text-red-500', title: 'text-red-700', cta: 'text-red-500' },
}

function UrgentCard({ contract, onTap }: { contract: ContractResponse; onTap: () => void }) {
  const tone = URGENT_TONE[contract.status]
  return (
    <button
      type="button"
      onClick={onTap}
      className={`w-full border ${tone.card} rounded-2xl px-5 py-4 flex items-center justify-between text-left active:scale-[0.98] transition-all`}
    >
      <div className="min-w-0">
        <p className={`text-[12px] font-semibold ${tone.sub}`}>
          {contract.status} · {ddayLabel(contract.dday)}
        </p>
        <p className={`text-[17px] font-extrabold mt-0.5 truncate ${tone.title}`}>
          {ownerCat(contract)} · {contract.provider}
        </p>
      </div>
      <span className={`text-[13px] font-bold shrink-0 ml-3 ${tone.cta}`}>결정 카드 →</span>
    </button>
  )
}

// ── CompactRow (나머지 약정 리스트 행) ────────────────────────────────────────

function CompactRow({ contract, onTap }: { contract: ContractResponse; onTap: () => void }) {
  const tone = STATUS_TONE[contract.status]
  return (
    <button
      type="button"
      onClick={onTap}
      className="w-full flex items-center gap-3 px-1 py-3.5 text-left active:bg-gray-50 transition-colors"
    >
      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
        <CatIcon category={contract.category} size={18} className="text-[#10b981]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-gray-900 truncate">{ownerCat(contract)}</p>
        <p className="text-[12px] text-gray-400 mt-0.5 truncate">
          {contract.provider} · {fmtYearMonth(contract.end_date)}
          {contract.accuracy === 'estimated' ? ' 추정' : ''}
        </p>
      </div>
      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${tone.pill}`}>
        {contract.status} {ddayLabel(contract.dday)}
      </span>
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
  onSaved: (updated: ContractResponse, keepOpen?: boolean) => void
  onDeleted: (id: number) => void
}) {
  const { showToast } = useToast()
  const isMobile = contract.category === '휴대폰'

  // 바텀시트 슬라이드업 — 마운트 후 한 틱 뒤 enter 클래스 토글(라이브러리 없음)
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // body 스크롤 잠금 — 시트 열릴 때만
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // 지남(만료 경과) 상태 — 판정은 백엔드 status, 일수는 백엔드 dday의 절대값만 표시(연산 금지)
  const isLapsed = contract.status === '지남'
  const lapsedDays = Math.abs(contract.dday)

  const [localFee, setLocalFee] = useState<number | null>(contract.monthly_fee)
  const hasFee = isMobile && !!localFee
  const [feeInput, setFeeInput] = useState('')
  const [feeSaving, setFeeSaving] = useState(false)
  const [feeEditing, setFeeEditing] = useState(false)

  const [diagnosis, setDiagnosis] = useState<TelecomEstimate | null>(null)
  const [diagLoading, setDiagLoading] = useState(isMobile && !!contract.monthly_fee)

  // 결정 카드 의도 토글: 폰 그대로(keep) / 새 폰으로(switch)
  const [intent, setIntent] = useState<'keep' | 'switch'>('keep')

  // 비휴대폰(인터넷·TV·정수기) 결정 토글: 유지(stay) / 바꿈·해지(leave)
  const [planIntent, setPlanIntent] = useState<'stay' | 'leave'>('stay')

  const [mode, setMode] = useState<'know' | 'unknown'>(
    contract.accuracy === 'confirmed' ? 'know' : 'unknown'
  )
  const [endDate, setEndDate] = useState(contract.end_date ?? '')
  const [startMonth, setStartMonth] = useState('')
  const [termMonths, setTermMonths] = useState<TermOpt | null>(null)
  const [busy, setBusy] = useState(false)
  const [delConfirm, setDelConfirm] = useState(false)
  const [delBusy, setDelBusy] = useState(false)
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [showHelper, setShowHelper] = useState(false)
  const [showChecklistHelper, setShowChecklistHelper] = useState(false)

  // owner_label 편집 — 자유 입력 (예시만)
  const [ownerLabel, setOwnerLabel] = useState(contract.owner_label ?? '')
  const [ownerBusy, setOwnerBusy] = useState(false)
  const ownerDirty = (ownerLabel.trim() || '') !== (contract.owner_label ?? '')

  const handleSaveOwner = async () => {
    if (ownerBusy || !ownerDirty) return
    setOwnerBusy(true)
    try {
      const res = await contractApi.update(contract.id, {
        owner_label: ownerLabel.trim() || null,
      })
      showToast('저장했어요')
      onSaved(res.data, true)
    } catch {
      showToast('저장에 실패했어요', 'error')
    } finally {
      setOwnerBusy(false)
    }
  }

  const maxMonth = new Date().toISOString().slice(0, 7)
  const canSave =
    (mode === 'know' && !!endDate) ||
    (mode === 'unknown' && !!startMonth && !!termMonths)

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

  useEffect(() => {
    if (!isMobile || !localFee) return
    setDiagLoading(true)
    setDiagnosis(null)
    recommendationApi.telecomEstimate(localFee)
      .then((r) => setDiagnosis(r.data))
      .catch(() => {})
      .finally(() => setDiagLoading(false))
  }, [localFee])

  useEffect(() => {
    contractApi.providerInfo().then((r) => setProviders(r.data)).catch(() => {})
  }, [])

  const handleHelperConfirmed = async (hp: string, confirmedDate: string): Promise<boolean> => {
    setBusy(true)
    try {
      const res = await contractApi.update(contract.id, {
        provider: hp,
        end_date: confirmedDate,
        accuracy: 'confirmed',
      })
      showToast('저장했어요')
      onSaved(res.data)
      return true
    } catch {
      showToast('저장에 실패했어요', 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  const handleSaveFee = async () => {
    const val = parseInt(feeInput)
    if (!val || val < 1000 || val > 2_000_000) {
      showToast('금액을 확인해 주세요 (1,000원 ~ 200만원)', 'error')
      return
    }
    setFeeSaving(true)
    try {
      const res = await contractApi.update(contract.id, { monthly_fee: val })
      setLocalFee(val)
      setFeeInput('')
      setFeeEditing(false)
      showToast('저장했어요')
      onSaved(res.data, true)
    } catch {
      showToast('저장에 실패했어요', 'error')
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
      showToast('저장했어요')
      onSaved(res.data)
    } catch {
      showToast('저장에 실패했어요', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setDelBusy(true)
    try {
      await contractApi.remove(contract.id)
      showToast('삭제했어요')
      onDeleted(contract.id)
    } catch {
      showToast('저장에 실패했어요', 'error')
      setDelBusy(false)
    }
  }

  // 닫기 — 슬라이드다운 후 history.back (popstate가 overlayTarget 해제)
  const requestClose = () => {
    setEntered(false)
    setTimeout(() => window.history.back(), 250)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* dim 배경 — 탭하면 닫힘 */}
      <div
        onClick={requestClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-[250ms] ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* 바텀시트 */}
      <div
        className={`relative bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto transition-transform duration-[250ms] ease-out ${
          entered ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* 핸들바 */}
        <div className="sticky top-0 bg-white z-10 pt-3 pb-2 rounded-t-3xl">
          <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto" />
        </div>

      {/* sticky header */}
      <div className="sticky top-[24px] bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3 z-10">
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-gray-900 truncate">
            {contract.provider}{' '}
            <span className="text-gray-400 font-normal">
              {contract.owner_label ? `${contract.owner_label} ` : ''}{contract.category}
            </span>
          </p>
          <p className="text-[12px] text-gray-400">
            {fmtYearMonth(contract.end_date)} 만료 · {ddayLabel(contract.dday)}
          </p>
        </div>
        <CatIcon category={contract.category} size={20} className="text-[#10b981] shrink-0" />
        <button
          type="button"
          onClick={requestClose}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 rounded-full active:bg-gray-100 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="px-5 py-5 pb-12 space-y-6">

        {/* 누구 약정인가요 — 자유 입력 (예시만) */}
        <section>
          <p className="text-[12px] text-gray-500 font-semibold mb-3">누구 약정인가요?</p>
          <input
            type="text"
            value={ownerLabel}
            maxLength={8}
            onChange={(e) => setOwnerLabel(e.target.value)}
            placeholder="예: 엄마 휴대폰, 아빠, 할머니"
            className="w-full border-2 border-gray-200 focus:border-[#10b981] rounded-2xl px-4 py-3.5 text-[15px] font-semibold text-gray-900 outline-none transition-colors"
          />
          {ownerDirty && (
            <button
              type="button"
              disabled={ownerBusy}
              onClick={handleSaveOwner}
              className="mt-3 w-full bg-[#10b981] disabled:bg-gray-100 disabled:text-gray-400 text-white py-3.5 rounded-2xl text-[15px] font-bold transition-all active:scale-[0.98]"
            >
              {ownerBusy ? '저장 중...' : '라벨 저장'}
            </button>
          )}
        </section>

        {/* 결정 카드 — 휴대폰 only */}
        {isMobile && (
          <section>
            {isLapsed ? (
              <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 mb-3">
                <p className="text-[14px] font-extrabold text-red-600">약정이 {lapsedDays}일 전에 끝났어요</p>
                <p className="text-[12px] text-red-500 font-semibold mt-0.5">지금 바꿔도 위약금 0원이에요</p>
              </div>
            ) : (
              <p className="text-[12px] text-gray-500 font-semibold mb-3">만료 후 결정</p>
            )}

            {/* 의도 토글 */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setIntent('keep')}
                className={`flex-1 py-2.5 rounded-full border text-[13px] font-semibold transition-colors min-h-[44px] active:scale-[0.97] ${
                  intent === 'keep' ? 'border-[#10b981] bg-[#E1F5EE] text-[#0F6E56]' : 'border-gray-200 text-gray-600 bg-white'
                }`}
              >
                폰 그대로 쓸래요
              </button>
              <button
                type="button"
                onClick={() => setIntent('switch')}
                className={`flex-1 py-2.5 rounded-full border text-[13px] font-semibold transition-colors min-h-[44px] active:scale-[0.97] ${
                  intent === 'switch' ? 'border-[#10b981] bg-[#E1F5EE] text-[#0F6E56]' : 'border-gray-200 text-gray-600 bg-white'
                }`}
              >
                새 폰으로 바꿀래요
              </button>
            </div>

            {/* ── 그대로 분기 ── */}
            {intent === 'keep' && (
              <>
                {diagLoading && (
                  <div className="rounded-2xl bg-gray-50 p-4 space-y-2.5">
                    <div className="h-3 w-20 rounded-full bg-gray-200 animate-pulse" />
                    <div className="h-6 w-32 rounded-lg bg-gray-200 animate-pulse" />
                    <div className="h-3 w-40 rounded-full bg-gray-200 animate-pulse" />
                  </div>
                )}

                {!diagLoading && hasFee && diagnosis && (
                  <div className="space-y-3">
                    {/* A. 그대로 두면 / (지남) 지금 그대로면 */}
                    <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
                      <p className="text-[11px] text-red-500 font-semibold mb-1">
                        {isLapsed ? 'A. 지금 그대로면 (이미 적용 중)' : 'A. 그대로 두면'}
                      </p>
                      <p className="text-[20px] font-extrabold text-red-600">
                        월 {diagnosis.lapse_monthly.toLocaleString()}원
                      </p>
                      <p className="text-[13px] text-red-500 font-semibold mt-0.5">
                        {isLapsed
                          ? `할인 없이 내는 중이에요 (+${diagnosis.lapse_increase_monthly.toLocaleString()}원/월)`
                          : `할인이 사라져요 (+${diagnosis.lapse_increase_monthly.toLocaleString()}원/월)`}
                      </p>
                      <p className="text-[11px] text-red-400 mt-1.5">
                        {isLapsed
                          ? '약정이 끝나 원래 요금으로 이미 올랐어요'
                          : '선택약정 할인 중이라면 만료 후 원래 요금으로 올라요'}
                      </p>
                    </div>

                    {/* B. 재약정하면 */}
                    <div className="rounded-2xl bg-[#E1F5EE] border border-[#10b981]/20 p-4">
                      <p className="text-[11px] text-[#0F6E56] font-semibold mb-1">B. 재약정하면</p>
                      <p className="text-[20px] font-extrabold text-[#0F6E56]">
                        월 {diagnosis.reattach_monthly.toLocaleString()}원 유지
                      </p>
                      <p className="text-[13px] text-[#0F6E56] font-semibold mt-0.5">선택약정 25% 다시 적용</p>
                      {isLapsed && (
                        <p className="text-[11px] text-[#0F6E56] opacity-70 mt-1">지금 바꿔도 위약금 0원</p>
                      )}
                    </div>

                    {/* C. 알뜰폰으로 가면 */}
                    {diagnosis.saving_annual > 0 && (
                      <div className="rounded-2xl bg-[#E1F5EE] border border-[#10b981]/20 p-4">
                        <p className="text-[11px] text-[#0F6E56] font-semibold mb-1">C. 알뜰폰으로 가면</p>
                        <p className="text-[20px] font-extrabold text-[#0F6E56]">
                          월 약 {diagnosis.saving_monthly.toLocaleString()}원, 연 약 {Math.round(diagnosis.saving_annual / 10000)}만원 아껴요 (추정)
                        </p>
                        <p className="text-[11px] text-[#0F6E56] opacity-70 mt-0.5">(실제 요금제·통화량에 따라 달라요)</p>
                        {isLapsed && (
                          <p className="text-[11px] text-[#0F6E56] opacity-70 mt-1">지금 바꿔도 위약금 0원</p>
                        )}
                      </div>
                    )}

                    {/* 근거 */}
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      근거: 입력한 월 요금 기준 · B는 선택약정 25% 규칙, A·C는 추정
                    </p>

                    {/* 모요/아정당 — C 아래, AFFILIATE_ENABLED 게이트 */}
                    {AFFILIATE_ENABLED && (
                      <div className="space-y-2 pt-1">
                        <div className="flex gap-2">
                          <a href={MOYO_URL} target="_blank" rel="noopener noreferrer"
                            className="flex-1 bg-[#10b981] text-white font-bold py-3 rounded-2xl text-[15px] text-center active:opacity-80 transition-all">
                            모요
                          </a>
                          <a href={AITDA_URL} target="_blank" rel="noopener noreferrer"
                            className="flex-1 bg-[#10b981] text-white font-bold py-3 rounded-2xl text-[15px] text-center active:opacity-80 transition-all">
                            아정당
                          </a>
                        </div>
                        <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                          외부 서비스로 연결돼요 · 가입 시 만기톡이 수수료를 받아요
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 요금 미입력 — 입력 유도 */}
                {!diagLoading && !hasFee && (
                  <div className="rounded-2xl bg-gray-50 p-4 space-y-3">
                    <p className="text-[13px] text-gray-600 font-semibold">월 통신비를 입력하면 결정 카드를 드려요</p>
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
              </>
            )}

            {/* ── 교체 분기 (정적 카피, 금액 단정 금지) ── */}
            {intent === 'switch' && (
              <div className="space-y-3">
                {isLapsed ? (
                  <div className="rounded-2xl bg-[#E1F5EE] border border-[#10b981]/20 p-4">
                    <p className="text-[13px] text-[#0F6E56] font-semibold leading-relaxed">
                      지금 바꾸면 위약금 없어요 — 바로 진행해도 돼요.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                    <p className="text-[13px] text-amber-700 font-semibold leading-relaxed">
                      바꾸려면 만기 다음날 이후에 — 만기 전에 바꾸면 할인반환금(위약금)이 나와요. 만기 다음날부터는 0원.
                    </p>
                  </div>
                )}
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[13px] text-gray-600 leading-relaxed">
                    통신사에서 새 폰: 공시지원금 vs 선택약정 중 유리한 쪽. 금액은 기기·요금제마다 달라요.
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[13px] text-gray-600 leading-relaxed">
                    자급제 폰 + 알뜰폰: 총비용이 낮은 경우가 많아요.
                  </p>
                </div>
                <p className="text-[12px] text-[#0F6E56] font-semibold leading-relaxed">
                  바꾸고 나면 새 약정을 등록하세요 — 다음 2년도 지켜봐 드려요.
                </p>
              </div>
            )}
          </section>
        )}

        {/* 인터넷·TV — 만료 후 결정 토글 (금액 단정 금지: 데이터 없는 품목) */}
        {(contract.category === '인터넷' || contract.category === 'TV') && (
          <section>
            {isLapsed ? (
              <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 mb-3">
                <p className="text-[14px] font-extrabold text-red-600">약정이 {lapsedDays}일 전에 끝났어요</p>
                <p className="text-[12px] text-red-500 font-semibold mt-0.5">지금 진행해도 위약금 없어요</p>
              </div>
            ) : (
              <p className="text-[12px] text-gray-500 font-semibold mb-3">만료 후 결정</p>
            )}

            {/* 의도 토글 */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setPlanIntent('stay')}
                className={`flex-1 py-2.5 rounded-full border text-[13px] font-semibold transition-colors min-h-[44px] active:scale-[0.97] ${
                  planIntent === 'stay' ? 'border-[#10b981] bg-[#E1F5EE] text-[#0F6E56]' : 'border-gray-200 text-gray-600 bg-white'
                }`}
              >
                그대로 쓸래요
              </button>
              <button
                type="button"
                onClick={() => setPlanIntent('leave')}
                className={`flex-1 py-2.5 rounded-full border text-[13px] font-semibold transition-colors min-h-[44px] active:scale-[0.97] ${
                  planIntent === 'leave' ? 'border-[#10b981] bg-[#E1F5EE] text-[#0F6E56]' : 'border-gray-200 text-gray-600 bg-white'
                }`}
              >
                다른 곳으로 바꿀래요
              </button>
            </div>

            {/* 그대로 분기 */}
            {planIntent === 'stay' && (
              <div className="space-y-3">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[13px] text-gray-600 leading-relaxed">
                    재약정 조건(사은품·요금할인)을 통신사에 문의하세요. 그냥 두면 혜택 없이 같은 요금이에요.
                  </p>
                </div>
                <ul className="rounded-2xl bg-gray-50 p-4 space-y-2.5">
                  {[
                    '재약정 사은품·요금할인 조건 문의',
                    '결합할인(휴대폰·TV) 영향 확인',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[13px] text-gray-600 leading-relaxed">
                      <CheckCircle size={16} className="text-[#10b981] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[12px] text-[#0F6E56] font-semibold leading-relaxed">
                  재약정 혜택을 챙기면 보통 유리해요.
                </p>
              </div>
            )}

            {/* 바꿀래요 분기 */}
            {planIntent === 'leave' && (
              <div className="space-y-3">
                {isLapsed ? (
                  <div className="rounded-2xl bg-[#E1F5EE] border border-[#10b981]/20 p-4">
                    <p className="text-[13px] text-[#0F6E56] font-semibold leading-relaxed">
                      지금 바꾸면 위약금 없어요 — 바로 진행해도 돼요.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                    <p className="text-[13px] text-amber-700 font-semibold leading-relaxed">
                      만기 전에 해지하면 위약금이 나와요 — 만기 다음날부터는 0원.
                    </p>
                  </div>
                )}
                <ul className="rounded-2xl bg-gray-50 p-4 space-y-2.5">
                  {[
                    '타사 신규가입 혜택(사은품·할인) 비교',
                    '결합할인(휴대폰·TV) 영향 확인',
                    '해지 시 장비 반납',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[13px] text-gray-600 leading-relaxed">
                      <CheckCircle size={16} className="text-[#10b981] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[12px] text-[#0F6E56] font-semibold leading-relaxed">
                  신규가입 혜택을 챙기면 보통 유리해요.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowChecklistHelper((v) => !v)}
              className="mt-3 w-full flex items-center justify-between text-[14px] text-[#0F6E56] font-bold bg-[#E1F5EE] border border-[#10b981]/40 rounded-2xl px-4 py-3.5 min-h-[48px] active:scale-[0.98] transition-all"
            >
              <span>고객센터 연락 · 약정일 확인</span>
              {showChecklistHelper ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {showChecklistHelper && (
              <ContractHelperSection
                category={contract.category}
                allProviders={providers}
                onSaveConfirmed={handleHelperConfirmed}
                busy={busy}
              />
            )}
          </section>
        )}

        {/* 정수기(렌탈) — 의무기간 후 결정 토글 */}
        {contract.category === '정수기' && (
          <section>
            {isLapsed ? (
              <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 mb-3">
                <p className="text-[14px] font-extrabold text-red-600">의무기간이 {lapsedDays}일 전에 끝났어요</p>
                <p className="text-[12px] text-red-500 font-semibold mt-0.5">지금 해지·교체해도 위약금 없어요</p>
              </div>
            ) : (
              <p className="text-[12px] text-gray-500 font-semibold mb-3">의무기간 끝나면</p>
            )}

            {/* 의도 토글 */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setPlanIntent('stay')}
                className={`flex-1 py-2.5 rounded-full border text-[13px] font-semibold transition-colors min-h-[44px] active:scale-[0.97] ${
                  planIntent === 'stay' ? 'border-[#10b981] bg-[#E1F5EE] text-[#0F6E56]' : 'border-gray-200 text-gray-600 bg-white'
                }`}
              >
                계속 쓸래요
              </button>
              <button
                type="button"
                onClick={() => setPlanIntent('leave')}
                className={`flex-1 py-2.5 rounded-full border text-[13px] font-semibold transition-colors min-h-[44px] active:scale-[0.97] ${
                  planIntent === 'leave' ? 'border-[#10b981] bg-[#E1F5EE] text-[#0F6E56]' : 'border-gray-200 text-gray-600 bg-white'
                }`}
              >
                해지·교체할래요
              </button>
            </div>

            {/* 계속 분기 */}
            {planIntent === 'stay' && (
              <div className="space-y-3">
                {!!contract.monthly_fee && (
                  <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                    <p className="text-[13px] text-amber-700 font-semibold leading-relaxed">
                      지금처럼 두면 매달 {contract.monthly_fee.toLocaleString()}원이 계속 나가요
                    </p>
                  </div>
                )}
                <ul className="rounded-2xl bg-gray-50 p-4 space-y-2.5">
                  {[
                    '의무기간 끝나면 소유권 이전 여부 확인',
                    '계속 쓰면 멤버십·AS 조건 확인',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[13px] text-gray-600 leading-relaxed">
                      <CheckCircle size={16} className="text-[#10b981] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 해지·교체 분기 */}
            {planIntent === 'leave' && (
              <div className="space-y-3">
                {isLapsed ? (
                  <div className="rounded-2xl bg-[#E1F5EE] border border-[#10b981]/20 p-4">
                    <p className="text-[13px] text-[#0F6E56] font-semibold leading-relaxed">
                      지금 해지·교체해도 위약금 없어요 — 바로 진행해도 돼요.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                    <p className="text-[13px] text-amber-700 font-semibold leading-relaxed">
                      의무기간 내에 해지하면 위약금이 나와요 — 기간이 끝난 뒤가 안전해요.
                    </p>
                  </div>
                )}
                <ul className="rounded-2xl bg-gray-50 p-4 space-y-2.5">
                  {[
                    '해지 위약금 0원인지 확인',
                    '신규 렌탈 재계약·타사 혜택 비교',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[13px] text-gray-600 leading-relaxed">
                      <CheckCircle size={16} className="text-[#10b981] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[12px] text-[#0F6E56] font-semibold leading-relaxed">
                  재계약·신규 혜택을 챙기면 보통 유리해요.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowChecklistHelper((v) => !v)}
              className="mt-3 w-full flex items-center justify-between text-[14px] text-[#0F6E56] font-bold bg-[#E1F5EE] border border-[#10b981]/40 rounded-2xl px-4 py-3.5 min-h-[48px] active:scale-[0.98] transition-all"
            >
              <span>렌탈사 연락 · 약정일 확인</span>
              {showChecklistHelper ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {showChecklistHelper && (
              <ContractHelperSection
                category={contract.category}
                allProviders={providers}
                onSaveConfirmed={handleHelperConfirmed}
                busy={busy}
              />
            )}
          </section>
        )}

        {/* 월 요금 — 모든 카테고리에서 확인·수정 가능 (원 단위) */}
        <section>
          <p className="text-[12px] text-gray-500 font-semibold mb-3">월 요금</p>
          {!feeEditing ? (
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3.5">
              <p className="text-[16px] font-extrabold text-gray-900">
                {localFee ? `${localFee.toLocaleString()}원` : <span className="text-gray-400 font-normal">미입력</span>}
              </p>
              <button
                type="button"
                onClick={() => { setFeeInput(localFee ? String(localFee) : ''); setFeeEditing(true) }}
                className="text-[13px] text-[#0F6E56] font-bold min-h-[44px] px-3 rounded-xl active:bg-[#E1F5EE] transition-colors"
              >
                {localFee ? '수정' : '입력'}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveFee()}
                placeholder="예: 25000"
                autoFocus
                className="flex-1 border-2 border-gray-200 focus:border-[#10b981] rounded-2xl px-4 py-3 text-[16px] font-semibold outline-none transition-colors"
              />
              <button
                type="button"
                disabled={!feeInput || feeSaving}
                onClick={handleSaveFee}
                className="bg-[#10b981] disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold px-5 rounded-2xl text-[14px] transition-colors"
              >
                {feeSaving ? '...' : '확인'}
              </button>
              <button
                type="button"
                onClick={() => setFeeEditing(false)}
                className="text-[13px] text-gray-400 px-2 min-h-[44px]"
              >
                취소
              </button>
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-2">원 단위로 입력해요 (예: 25,000원이면 25000)</p>
        </section>

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

              {/* 확인 도우미 — 몰라요 경로 */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowHelper((v) => !v)}
                  className="w-full flex items-center justify-between text-[14px] text-[#0F6E56] font-bold bg-[#E1F5EE] border border-[#10b981]/40 rounded-2xl px-4 py-3.5 min-h-[48px] active:scale-[0.98] transition-all"
                >
                  <span>약정일 정확히 확인하는 법</span>
                  {showHelper ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {showHelper && (
                  <ContractHelperSection
                    category={contract.category}
                    allProviders={providers}
                    onSaveConfirmed={handleHelperConfirmed}
                    busy={busy}
                  />
                )}
              </div>
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
              className="w-full text-center text-[14px] text-gray-500 py-3 min-h-[44px] rounded-xl active:bg-gray-100 transition-colors"
            >
              이 약정 삭제
            </button>
          )}
        </section>

      </div>
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

// ── HomeSkeleton (첫 로딩) ────────────────────────────────────────────────────

function HomeSkeleton() {
  return (
    <div className="max-w-sm mx-auto pb-6">
      {/* header */}
      <div className="flex items-center justify-between pt-1 pb-4">
        <p className="text-[18px] font-extrabold text-[#10b981] tracking-tight">만기톡</p>
        <div className="w-16 h-7 rounded-xl bg-gray-100 animate-pulse" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 px-4 py-5">
        {/* 요약 자리 — 회색 바 2줄 */}
        <div className="space-y-2.5 pb-5">
          <div className="h-3.5 w-28 rounded-full bg-gray-100 animate-pulse" />
          <div className="h-6 w-48 rounded-lg bg-gray-100 animate-pulse" />
        </div>

        {/* 리스트 행 모양 블록 3개 */}
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 rounded-full bg-gray-100 animate-pulse" />
                <div className="h-3 w-24 rounded-full bg-gray-100 animate-pulse" />
              </div>
              <div className="h-6 w-14 rounded-full bg-gray-100 animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

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

  const handleSaved = (updated: ContractResponse, keepOpen = false) => {
    setContracts((prev) =>
      [...prev.map((c) => (c.id === updated.id ? updated : c))].sort((a, b) => a.dday - b.dday)
    )
    if (keepOpen) {
      // 요금·라벨처럼 시트 안에서 이어지는 저장은 시트 유지 + 최신 데이터로 갱신
      setOverlayTarget(updated)
    } else {
      setOverlayTarget(null)
    }
  }

  const handleDeleted = (id: number) => {
    setContracts((prev) => prev.filter((c) => c.id !== id))
    setOverlayTarget(null)
  }

  if (loading) {
    return (
      <Layout>
        <HomeSkeleton />
      </Layout>
    )
  }

  // 다음 만기 = 백엔드 end_date 오름차순 첫 항목 (프론트 재정렬·계산 금지)
  const nextExpiry = contracts[0] ?? null
  const restContracts = contracts.slice(1)

  return (
    <Layout>
      <div className="max-w-sm mx-auto pb-6">

        {/* header */}
        <div className="flex items-center justify-between pt-1 pb-4">
          <p className="text-[18px] font-extrabold text-[#10b981] tracking-tight">만기톡</p>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="text-[12px] text-gray-400 border border-gray-200 px-3 py-1.5 rounded-xl"
          >
            {user?.username ?? '내 정보'}
          </button>
        </div>

        {contracts.length === 0 ? (
          <EmptyState onAdd={() => navigate('/contracts/grid')} />
        ) : (
          <>
            {/* 본문 카드 — 요약 + 임박 + 리스트 + 추가 (gray-50 배경 위 흰 카드) */}
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-5">
              {/* 요약 헤더 */}
              <div className="pb-5">
                <p className="text-[13px] text-gray-400">
                  우리집 약정 {contracts.length}건 지켜보는 중
                </p>
                {nextExpiry && (
                  <p className="text-[20px] font-extrabold text-gray-900 leading-snug mt-1 tracking-tight">
                    다음 만기, {fmtMonthDay(nextExpiry.end_date)}{' '}
                    {nextExpiry.owner_label ? `${nextExpiry.owner_label} ` : ''}{nextExpiry.category}
                  </p>
                )}
              </div>

              {/* 가장 임박 1건 — 큰 카드 */}
              {mostUrgent && (
                <UrgentCard contract={mostUrgent} onTap={() => setOverlayTarget(mostUrgent)} />
              )}

              {/* 나머지 약정 — 컴팩트 리스트 */}
              {restContracts.length > 0 && (
                <div className="mt-4 divide-y divide-gray-100">
                  {restContracts.map((c) => (
                    <CompactRow key={c.id} contract={c} onTap={() => setOverlayTarget(c)} />
                  ))}
                </div>
              )}

              {/* 가족 약정 추가 — 홈에서 인라인으로 펼침 */}
              <div className="mt-4">
                <InlineContractAdd onAdded={() => { loadData(); showToast('추가했어요') }} />
              </div>
            </div>

            {/* 알림 수신 번호 없음 — 슬림 배너 (phone 있으면 미표시) */}
            {!user?.phone && (
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="w-full mt-4 flex items-center justify-between bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-left active:scale-[0.99] transition-all"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-amber-700">만기 알림 받을 번호가 없어요</p>
                  <p className="text-[12px] text-amber-600/80 mt-0.5">번호를 등록하면 카톡으로 알려드려요</p>
                </div>
                <span className="text-[13px] font-bold text-amber-700 shrink-0 ml-3">등록하기 →</span>
              </button>
            )}
          </>
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
