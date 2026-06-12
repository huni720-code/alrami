import { useEffect, useMemo, useState } from 'react'
import { contractApi } from '../lib/api'
import {
  CAT_META,
  PROVIDERS,
  TERM_MONTHS,
  type Category,
  type TermOpt,
} from '../lib/contractConstants'

// 홈 인라인 약정 추가 — 화면 이동 없이 그 자리에서 펼치는 컴팩트 폼.
// 날짜/금액 연산은 백엔드. '몰라요' 예상 만료일은 contractApi.estimate 호출(프론트 계산 금지).

type Mode = 'know' | 'unknown'

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

function fmtYearMonth(d: string) {
  const [y, m] = d.split('-')
  return `${y}년 ${parseInt(m)}월`
}

export default function InlineContractAdd({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category | null>(null)

  const [mode, setMode] = useState<Mode>('know')
  const [provider, setProvider] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startMonth, setStartMonth] = useState('')
  const [termMonths, setTermMonths] = useState<TermOpt | null>(null)
  const [feeInput, setFeeInput] = useState('')
  const [ownerLabel, setOwnerLabel] = useState('')

  const [previewEnd, setPreviewEnd] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const maxMonth = new Date().toISOString().slice(0, 7)
  const meta = category ? CAT_META.find((m) => m.cat === category)! : null

  // 폼 초기화
  const resetForm = () => {
    setMode('know')
    setProvider('')
    setEndDate('')
    setStartMonth('')
    setTermMonths(null)
    setFeeInput('')
    setOwnerLabel('')
    setPreviewEnd(null)
    setError('')
  }

  const togglePanel = () => {
    if (open) {
      setOpen(false)
      setCategory(null)
      resetForm()
    } else {
      setOpen(true)
    }
  }

  const pickCategory = (c: Category) => {
    setCategory((prev) => (prev === c ? prev : c))
    resetForm()
  }

  const resetMode = (m: Mode) => {
    setMode(m)
    setEndDate('')
    setStartMonth('')
    setTermMonths(null)
    setPreviewEnd(null)
  }

  // 예상 만료일 미리보기 — 백엔드 estimate (프론트 계산 금지)
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
  const ownerArg = ownerLabel.trim() || undefined

  const canSave = useMemo(() => {
    if (!category || !provider) return false
    if (mode === 'know') return !!endDate
    return !!startMonth && !!termMonths
  }, [category, provider, mode, endDate, startMonth, termMonths])

  const handleSave = async () => {
    if (!canSave || !category || busy) return
    setBusy(true)
    setError('')
    try {
      await contractApi.create(
        mode === 'know'
          ? {
              category,
              provider,
              end_date: endDate,
              monthly_fee: fee,
              owner_label: ownerArg,
              accuracy: 'confirmed',
            }
          : {
              category,
              provider,
              start_date: `${startMonth}-01`,
              term_months: termMonths ?? undefined,
              monthly_fee: fee,
              owner_label: ownerArg,
              accuracy: 'estimated',
            }
      )
      // 성공 → 패널 접고 목록 새로고침
      setOpen(false)
      setCategory(null)
      resetForm()
      onAdded()
    } catch {
      setError('저장에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden">
      {/* 토글 버튼 */}
      <button
        type="button"
        onClick={togglePanel}
        className="w-full py-4 flex items-center justify-center gap-2 text-gray-400 active:bg-gray-50 transition-all"
      >
        <span className={`text-[18px] leading-none transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
        <span className="text-[14px] font-semibold">가족 약정 추가</span>
      </button>

      {/* 인라인 패널 (아코디언) */}
      {open && (
        <div className="px-4 pb-5 pt-1 space-y-5">

          {/* a. 카테고리 4개 아이콘 */}
          <div className="grid grid-cols-4 gap-2">
            {CAT_META.map(({ cat, Icon }) => {
              const sel = category === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => pickCategory(cat)}
                  className={`rounded-2xl border-2 py-3 flex flex-col items-center gap-1 transition-all active:scale-[0.97] ${
                    sel ? 'border-[#10b981] bg-[#E1F5EE]' : 'border-gray-200 bg-white'
                  }`}
                >
                  <Icon size={22} strokeWidth={1.5} className={sel ? 'text-[#0F6E56]' : 'text-gray-400'} />
                  <span className={`text-[11px] font-semibold ${sel ? 'text-[#0F6E56]' : 'text-gray-500'}`}>{cat}</span>
                </button>
              )
            })}
          </div>

          {/* b. 컴팩트 입력폼 */}
          {category && meta && (
            <div className="space-y-5">

              {/* 알아요 / 몰라요 */}
              <div className="flex gap-2">
                <Chip label="만료일 알아요" selected={mode === 'know'} onSelect={() => resetMode('know')} />
                <Chip label="언제인지 몰라요" selected={mode === 'unknown'} onSelect={() => resetMode('unknown')} />
              </div>

              {/* 통신사/렌탈사 */}
              <div>
                <p className="text-[12px] text-gray-500 font-semibold mb-2">{meta.providerLabel}</p>
                <div className="flex flex-wrap gap-2">
                  {PROVIDERS[category].map((c) => (
                    <Chip key={c} label={c} selected={provider === c} onSelect={() => setProvider(c)} />
                  ))}
                </div>
              </div>

              {/* 알아요 */}
              {mode === 'know' && (
                <div>
                  <p className="text-[12px] text-gray-500 font-semibold mb-2">약정 만료일</p>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border-2 border-gray-200 focus:border-[#10b981] rounded-2xl px-4 py-3.5 text-[16px] font-semibold text-gray-900 outline-none transition-colors"
                  />
                </div>
              )}

              {/* 몰라요 */}
              {mode === 'unknown' && (
                <>
                  <div>
                    <p className="text-[12px] text-gray-500 font-semibold mb-2">가입하신 달</p>
                    <input
                      type="month"
                      value={startMonth}
                      max={maxMonth}
                      onChange={(e) => setStartMonth(e.target.value)}
                      className="w-full border-2 border-gray-200 focus:border-[#10b981] rounded-2xl px-4 py-3.5 text-[16px] font-semibold text-gray-900 outline-none transition-colors"
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
                      <p className="text-[20px] font-extrabold text-[#0F6E56]">{fmtYearMonth(previewEnd)}쯤</p>
                    </div>
                  )}
                </>
              )}

              {/* 누구 약정인가요 — 자유 입력 (예시만) */}
              <div>
                <p className="text-[13px] text-gray-700 font-bold mb-2">
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

              {/* 월 요금 (선택) — 원 단위 */}
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
                    className="flex-1 text-[24px] font-extrabold text-gray-900 placeholder:text-gray-200 bg-transparent outline-none"
                  />
                  <span className="text-[15px] font-semibold text-gray-400 ml-2 pb-1">원/월</span>
                </div>
              </div>

              {error && (
                <p className="text-[13px] text-red-500 font-semibold">{error}</p>
              )}

              {/* 저장 */}
              <button
                type="button"
                disabled={!canSave || busy}
                onClick={handleSave}
                className="w-full bg-[#10b981] disabled:bg-gray-100 disabled:text-gray-400 text-white py-[15px] rounded-2xl text-[16px] font-bold transition-all active:scale-[0.98]"
              >
                {busy ? '저장 중...' : mode === 'know' ? '추가하기 (확정)' : '추가하기 (추정)'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
