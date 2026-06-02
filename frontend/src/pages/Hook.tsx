import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { recommendationApi } from '../lib/api'
import type { TelecomEstimate } from '../lib/api'

const CARRIERS = ['SKT', 'KT', 'LG U+', '알뜰폰'] as const
type Carrier = (typeof CARRIERS)[number]

const TERM_OPTIONS = [12, 24, 36] as const
type TermMonths = (typeof TERM_OPTIONS)[number]

function Chip({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`px-4 py-2.5 rounded-full border text-[14px] font-semibold transition-colors min-h-[44px] active:scale-[0.97] ${
        selected
          ? 'border-[#10b981] bg-[#E1F5EE] text-[#0F6E56]'
          : 'border-gray-200 text-gray-600 bg-white'
      }`}
    >
      {label}
    </button>
  )
}

function computeEndDate(startMonth: string, termMonths: number): string {
  const [y, m] = startMonth.split('-').map(Number)
  const totalMonths = (m - 1) + termMonths
  const targetYear = y + Math.floor(totalMonths / 12)
  const targetMonth = (totalMonths % 12) + 1
  const lastDay = new Date(targetYear, targetMonth, 0).getDate()
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

export default function Hook() {
  const navigate = useNavigate()

  const [carrier, setCarrier] = useState<Carrier | ''>('')
  const [mode, setMode] = useState<'know' | 'unknown' | null>(null)
  const [endDate, setEndDate] = useState('')
  const [startMonth, setStartMonth] = useState('')
  const [termMonths, setTermMonths] = useState<TermMonths | null>(null)
  const [feeInput, setFeeInput] = useState('')

  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<TelecomEstimate | null>(null)
  const [error, setError] = useState('')
  const resultRef = useRef<HTMLDivElement>(null)

  const resolvedEndDate = useMemo(() => {
    if (mode === 'know') return endDate
    if (mode === 'unknown' && startMonth && termMonths) {
      return computeEndDate(startMonth, termMonths)
    }
    return ''
  }, [mode, endDate, startMonth, termMonths])

  const fee = Math.floor(Number(feeInput)) * 10000
  const canCheck = !!carrier && !!resolvedEndDate && fee > 0 && !busy

  const resetResult = () => setResult(null)

  const handleCarrierSelect = (c: Carrier) => {
    setCarrier(c)
    setMode(null)
    setEndDate('')
    setStartMonth('')
    setTermMonths(null)
    resetResult()
  }

  const handleCheck = async () => {
    if (!canCheck) return
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const res = await recommendationApi.telecomEstimate(fee)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((res.data as any)?.error === 'benchmark_not_ready') {
        setError('절약액 데이터 준비 중이에요. 잠시 후 다시 확인해주세요.')
        return
      }
      setResult(res.data)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    } catch {
      setError('잠시 후 다시 시도해주세요.')
    } finally {
      setBusy(false)
    }
  }

  const handleCta = () => {
    sessionStorage.setItem('pending_contract', JSON.stringify({
      category: 'mobile',
      provider: carrier,
      end_date: resolvedEndDate,
      monthly_fee: fee,
      accuracy: mode === 'know' ? 'confirmed' : 'estimated',
    }))
    navigate('/login?from=hook')
  }

  const maxMonth = new Date().toISOString().slice(0, 7)

  return (
    <div className="min-h-screen bg-white">
      {/* 브랜드 헤더 */}
      <div className="px-6 pt-14 pb-6">
        <p className="text-[13px] font-bold text-[#10b981] mb-6 tracking-tight">만기톡</p>
        <h1 className="text-[24px] font-extrabold text-gray-900 leading-tight">
          약정 끝나는 날,<br />알고 계세요?
        </h1>
        <p className="text-[14px] text-gray-400 mt-2">
          만료 직전에 카톡으로 알려드릴게요
        </p>
      </div>

      <div className="px-6 space-y-8 pb-16">

        {/* 1. 통신사 */}
        <div>
          <p className="text-[12px] text-gray-500 font-semibold mb-3">통신사</p>
          <div className="flex flex-wrap gap-2">
            {CARRIERS.map((c) => (
              <Chip key={c} label={c} selected={carrier === c} onSelect={() => handleCarrierSelect(c)} />
            ))}
          </div>
        </div>

        {/* 2. 만료일 입력 방식 */}
        {carrier && (
          <div>
            <p className="text-[12px] text-gray-500 font-semibold mb-3">약정 만료일</p>
            <div className="flex gap-2 mb-4">
              <Chip
                label="만료일 알아요"
                selected={mode === 'know'}
                onSelect={() => { setMode('know'); setStartMonth(''); setTermMonths(null); resetResult() }}
              />
              <Chip
                label="언제인지 몰라요"
                selected={mode === 'unknown'}
                onSelect={() => { setMode('unknown'); setEndDate(''); resetResult() }}
              />
            </div>

            {mode === 'know' && (
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); resetResult() }}
                className="w-full border-2 border-gray-200 focus:border-[#10b981] rounded-2xl px-4 py-4 text-[16px] font-semibold text-gray-900 outline-none transition-colors"
              />
            )}

            {mode === 'unknown' && (
              <div className="space-y-4">
                <div>
                  <p className="text-[12px] text-gray-400 mb-2">가입하신 달</p>
                  <input
                    type="month"
                    value={startMonth}
                    max={maxMonth}
                    onChange={(e) => { setStartMonth(e.target.value); resetResult() }}
                    className="w-full border-2 border-gray-200 focus:border-[#10b981] rounded-2xl px-4 py-4 text-[16px] font-semibold text-gray-900 outline-none transition-colors"
                  />
                </div>
                <div>
                  <p className="text-[12px] text-gray-400 mb-2">약정 기간</p>
                  <div className="flex gap-2">
                    {TERM_OPTIONS.map((t) => (
                      <Chip key={t} label={`${t}개월`} selected={termMonths === t} onSelect={() => { setTermMonths(t); resetResult() }} />
                    ))}
                  </div>
                </div>
                {resolvedEndDate && (
                  <p className="text-[13px] text-[#0F6E56] font-semibold">
                    → 예상 만료일: {resolvedEndDate.replace(/-/g, '.')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. 월 통신비 */}
        {resolvedEndDate && (
          <div>
            <p className="text-[12px] text-gray-500 font-semibold mb-3">월 통신비</p>
            <div className="flex items-baseline border-b-2 border-gray-200 focus-within:border-[#10b981] pb-2 transition-colors">
              <input
                type="number"
                inputMode="numeric"
                value={feeInput}
                onChange={(e) => { setFeeInput(e.target.value); resetResult() }}
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                placeholder="0"
                className="flex-1 text-[36px] font-extrabold text-gray-900 placeholder:text-gray-200 bg-transparent outline-none"
              />
              <span className="text-[18px] font-semibold text-gray-400 ml-2 pb-1">만원/월</span>
            </div>
          </div>
        )}

        {/* 4. 확인 버튼 */}
        {resolvedEndDate && (
          <button
            type="button"
            onClick={handleCheck}
            disabled={!canCheck}
            className="w-full bg-[#10b981] disabled:bg-gray-100 disabled:text-gray-400 text-white py-[16px] rounded-2xl text-[16px] font-bold transition-all active:scale-[0.98]"
          >
            {busy ? '계산 중...' : '얼마나 더 내는지 확인하기'}
          </button>
        )}

        {error && <p className="text-[12px] text-red-400">{error}</p>}

        {/* 5. 결과 + CTA */}
        {result && (
          <div ref={resultRef} className="space-y-4">
            {result.saving_annual > 0 ? (
              <div className="rounded-2xl bg-[#E1F5EE] p-5">
                <p className="text-[11px] text-[#0F6E56] font-semibold mb-1">
                  알뜰폰으로 바꾸면 대략
                </p>
                <p className="text-[28px] font-extrabold text-[#0F6E56]">
                  연 {Math.round(result.saving_annual / 10000)}만원
                  <span className="text-[16px] font-semibold ml-1">손해(추정)</span>
                </p>
                <p className="text-[12px] text-[#0F6E56] opacity-70 mt-1.5">
                  월 약 {Math.round(result.saving_monthly / 1000)}천원 · 통신사 벤치마크 기준 추정
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5">
                <p className="text-[14px] font-semibold text-gray-700">
                  현재 요금제가 저렴한 편이에요
                </p>
                <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">
                  약정 만료 시점에 더 좋은 조건이 있으면 바로 알려드릴게요.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleCta}
              className="w-full bg-[#10b981] text-white py-[16px] rounded-2xl text-[16px] font-bold transition-all active:scale-[0.98]"
            >
              만기 전 알림 받기 →
            </button>
            <p className="text-center text-[12px] text-gray-400">
              카카오 1초 로그인으로 바로 시작
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
