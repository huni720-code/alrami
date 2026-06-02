import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Smartphone, Wifi, Tv, Droplets, Plus, X } from 'lucide-react'
import { contractApi, dashboardApi } from '../lib/api'
import type { ContractResponse } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

// 제휴 링크 (가나다순 · 수수료 크기가 순서를 바꾸지 않는다)
const MOYO_URL = 'https://www.moyoplan.com'
const AITDA_URL = 'https://www.aitda.kr'

const TELECOM_CATS = new Set(['휴대폰', '인터넷', 'TV'])

// ── utils ──────────────────────────────────────────────────────────────────────

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

function ddayBadgeClass(dday: number) {
  if (dday <= 0) return 'bg-red-500 text-white'
  if (dday <= 30) return 'bg-orange-500 text-white'
  if (dday <= 90) return 'bg-amber-400 text-white'
  return 'bg-gray-100 text-gray-500'
}

function heroGradient(dday: number) {
  if (dday <= 0) return 'from-red-500 to-rose-600'
  if (dday <= 30) return 'from-orange-500 to-red-500'
  if (dday <= 90) return 'from-amber-400 to-orange-400'
  return 'from-[#10b981] to-[#059669]'
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

// ── Edit bottom sheet ──────────────────────────────────────────────────────────

type EditMode = 'know' | 'unknown'

interface EditSheetProps {
  contract: ContractResponse
  onClose: () => void
  onSaved: (updated: ContractResponse) => void
  onDeleted: (id: number) => void
}

function EditSheet({ contract, onClose, onSaved, onDeleted }: EditSheetProps) {
  const [mode, setMode] = useState<EditMode>(
    contract.accuracy === 'confirmed' ? 'know' : 'unknown'
  )
  const [endDate, setEndDate] = useState(contract.end_date ?? '')
  const [startMonth, setStartMonth] = useState('')
  const [termMonths, setTermMonths] = useState<TermOpt | null>(null)
  const [busy, setBusy] = useState(false)
  const [delConfirm, setDelConfirm] = useState(false)
  const [delBusy, setDelBusy] = useState(false)

  const maxMonth = new Date().toISOString().slice(0, 7)
  const previewEnd = mode === 'unknown' && startMonth && termMonths
    ? addMonths(startMonth, termMonths)
    : null

  const canSave =
    (mode === 'know' && !!endDate) ||
    (mode === 'unknown' && !!startMonth && !!termMonths)

  const switchMode = (m: EditMode) => {
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
          : {
              start_date: `${startMonth}-01`,
              term_months: termMonths!,
              accuracy: 'estimated' as const,
            }
      const res = await contractApi.update(contract.id, payload)
      onSaved(res.data)
    } catch {
      // keep sheet open for retry
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
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl px-6 pt-5 pb-10 max-w-lg mx-auto shadow-2xl">
        {/* drag handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CatIcon category={contract.category} size={18} className="text-[#10b981]" />
            <p className="text-[16px] font-bold text-gray-900">
              {contract.provider}{' '}
              <span className="text-[14px] text-gray-400 font-normal">{contract.category}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* mode toggle */}
        <div className="flex gap-2 mb-5">
          <Chip label="만료일 알아요" selected={mode === 'know'} onSelect={() => switchMode('know')} />
          <Chip label="언제인지 몰라요" selected={mode === 'unknown'} onSelect={() => switchMode('unknown')} />
        </div>

        {/* know mode */}
        {mode === 'know' && (
          <div className="mb-5">
            <p className="text-[12px] text-gray-500 font-semibold mb-2">약정 만료일</p>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border-2 border-gray-200 focus:border-[#10b981] rounded-2xl px-4 py-4 text-[16px] font-semibold text-gray-900 outline-none transition-colors"
            />
          </div>
        )}

        {/* unknown mode */}
        {mode === 'unknown' && (
          <div className="space-y-4 mb-5">
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

        {/* save */}
        <button
          type="button"
          disabled={!canSave || busy}
          onClick={handleSave}
          className="w-full bg-[#10b981] disabled:bg-gray-100 disabled:text-gray-400 text-white py-[16px] rounded-2xl text-[16px] font-bold mb-3 transition-all active:scale-[0.98]"
        >
          {busy ? '저장 중...' : mode === 'know' ? '저장 (확정)' : '저장 (추정)'}
        </button>

        {/* delete */}
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
      </div>
    </>
  )
}

// ── Hero card ─────────────────────────────────────────────────────────────────

function HeroCard({
  contract,
  annualSaving,
  onTap,
}: {
  contract: ContractResponse
  annualSaving: number
  onTap: () => void
}) {
  const isTelecom = TELECOM_CATS.has(contract.category)
  const showCta = contract.dday <= 90

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => e.key === 'Enter' && onTap()}
      className={`w-full rounded-3xl p-6 shadow-md cursor-pointer bg-gradient-to-br ${heroGradient(contract.dday)} active:scale-[0.98] transition-all select-none`}
    >
      {/* top row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <CatIcon category={contract.category} size={14} className="text-white/80" />
            <span className="text-[12px] text-white/80">{contract.category}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              contract.accuracy === 'confirmed'
                ? 'bg-white/20 text-white'
                : 'bg-white/10 text-yellow-200'
            }`}>
              {contract.accuracy === 'confirmed' ? '확정' : '추정'}
            </span>
          </div>
          <p className="text-[26px] font-extrabold text-white leading-tight">{contract.provider}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] text-white/70 mb-0.5">약정 만료</p>
          <p className="text-[40px] font-black text-white leading-none">{ddayLabel(contract.dday)}</p>
        </div>
      </div>

      <p className="text-[12px] text-white/70 mb-4">{fmtYearMonth(contract.end_date)} 만료</p>

      {/* 통신만: 진단 (추정·근거·조건 3종 병기) */}
      {isTelecom && annualSaving > 0 && (
        <div className="bg-white/15 rounded-2xl px-4 py-3 mb-4">
          <p className="text-[10px] text-white/60 mb-1.5 leading-relaxed">
            추정 · 입력하신 통신비 기준 · 알뜰폰 전환 가정
          </p>
          <p className="text-[11px] text-white/75 mb-0.5">지금 안 바꾸면</p>
          <p className="text-[20px] font-extrabold text-white">
            연 약 {Math.round(annualSaving / 10000)}만원 손해
          </p>
        </div>
      )}

      {/* 카테고리별 CTA */}
      {showCta && (
        isTelecom ? (
          <div className="space-y-2">
            {/* 가나다순 · 수수료가 순서를 바꾸지 않는다 */}
            <div className="flex gap-2">
              <a
                href={MOYO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-white/20 active:bg-white/30 text-white font-bold py-3 rounded-2xl text-[14px] text-center transition-all active:scale-[0.98]"
              >
                모요
              </a>
              <a
                href={AITDA_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-white/20 active:bg-white/30 text-white font-bold py-3 rounded-2xl text-[14px] text-center transition-all active:scale-[0.98]"
              >
                아정당
              </a>
            </div>
            <p className="text-[10px] text-white/50 text-center leading-relaxed">
              외부 서비스로 연결돼요 · 가입 시 만기톡이 수수료를 받아요
            </p>
          </div>
        ) : (
          /* 정수기: 갈아타기 아님, 소유이전·해지 안내만 (수익화 X) */
          <div className="bg-white/15 rounded-2xl px-4 py-3">
            <p className="text-[13px] text-white font-semibold mb-1">의무기간 종료 후엔</p>
            <p className="text-[12px] text-white/80 leading-relaxed">
              소유 이전 또는 해지가 가능해요.<br />렌탈사에 직접 문의해 보세요.
            </p>
          </div>
        )
      )}

      <p className="text-[11px] text-white/40 text-center mt-3">탭해서 날짜 수정</p>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

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
  const [annualSaving, setAnnualSaving] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<ContractResponse | null>(null)

  useEffect(() => {
    Promise.all([
      contractApi.list(true)
        .then((r) => setContracts([...r.data].sort((a, b) => a.dday - b.dday)))
        .catch(() => setContracts([])),
      dashboardApi.kpi()
        .then((r) => setAnnualSaving(r.data.saving.recommended_annual))
        .catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const hero = contracts[0] ?? null
  const rest = contracts.slice(1)

  const handleSaved = (updated: ContractResponse) => {
    setContracts((prev) =>
      [...prev.map((c) => (c.id === updated.id ? updated : c))].sort((a, b) => a.dday - b.dday)
    )
    setEditTarget(null)
  }

  const handleDeleted = (id: number) => {
    setContracts((prev) => prev.filter((c) => c.id !== id))
    setEditTarget(null)
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

        {/* hero / empty */}
        {hero ? (
          <HeroCard
            contract={hero}
            annualSaving={annualSaving}
            onTap={() => setEditTarget(hero)}
          />
        ) : (
          <EmptyState onAdd={() => navigate('/contracts/grid')} />
        )}

        {/* rest list */}
        {rest.length > 0 && (
          <div className="mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
            {rest.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setEditTarget(c)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50 transition-colors ${
                  i > 0 ? 'border-t border-gray-50' : ''
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                  <CatIcon category={c.category} size={17} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-gray-800 truncate leading-tight">
                    {c.provider}{' '}
                    <span className="text-gray-400 font-normal">{c.category}</span>
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      c.accuracy === 'confirmed'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-500'
                    }`}>
                      {c.accuracy === 'confirmed' ? '확정' : '추정'}
                    </span>
                    <span className="text-[11px] text-gray-400">{fmtYearMonth(c.end_date)} 만료</span>
                  </div>
                </div>
                <span className={`shrink-0 text-[12px] font-bold px-2.5 py-1 rounded-full ${ddayBadgeClass(c.dday)}`}>
                  {ddayLabel(c.dday)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* add more */}
        {contracts.length > 0 && (
          <button
            type="button"
            onClick={() => navigate('/contracts/grid')}
            className="w-full mt-3 flex items-center justify-center gap-1.5 text-[13px] text-[#10b981] font-semibold py-3 min-h-[44px]"
          >
            <Plus size={15} /> 약정 추가
          </button>
        )}

      </div>

      {/* edit bottom sheet */}
      {editTarget && (
        <EditSheet
          contract={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </Layout>
  )
}
