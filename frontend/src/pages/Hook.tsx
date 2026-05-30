import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Smartphone, Clock, CreditCard } from 'lucide-react'
import { recommendationApi } from '../lib/api'
import type { TelecomEstimate, QuickEstimate } from '../lib/api'

const CARRIERS = ['SKT', 'KT', 'LG U+', '알뜰폰'] as const
type Carrier = (typeof CARRIERS)[number]

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

export default function Hook() {
  const navigate = useNavigate()

  // 통신비 진단
  const [carrier, setCarrier] = useState<Carrier | ''>('')
  const [feeInput, setFeeInput] = useState('')
  const [telecomBusy, setTelecomBusy] = useState(false)
  const [telecomResult, setTelecomResult] = useState<TelecomEstimate | null>(null)
  const [telecomError, setTelecomError] = useState('')

  // 카드 절감
  const [cardAmount, setCardAmount] = useState('')
  const [cardBusy, setCardBusy] = useState(false)
  const [cardResult, setCardResult] = useState<QuickEstimate | null>(null)
  const [cardError, setCardError] = useState('')

  const bridgeRef = useRef<HTMLDivElement>(null)

  const isMvno = carrier === '알뜰폰'
  const telecomFee = Math.floor(Number(feeInput)) * 10000
  const canCheckTelecom = carrier && !isMvno && feeInput && telecomFee > 0

  const handleTelecomCheck = async () => {
    if (!canCheckTelecom || telecomBusy) return
    setTelecomBusy(true)
    setTelecomError('')
    try {
      const res = await recommendationApi.telecomEstimate(telecomFee)
      setTelecomResult(res.data)
      setTimeout(() => bridgeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    } catch {
      setTelecomError('잠시 후 다시 시도해주세요')
    } finally {
      setTelecomBusy(false)
    }
  }

  const handleCardCheck = async () => {
    const amount = Math.floor(Number(cardAmount)) * 10000
    if (!amount || cardBusy) return
    setCardBusy(true)
    setCardError('')
    try {
      const res = await recommendationApi.quickEstimate(amount)
      setCardResult(res.data)
    } catch {
      setCardError('잠시 후 다시 시도해주세요')
    } finally {
      setCardBusy(false)
    }
  }

  const showBridge = telecomResult !== null || isMvno

  return (
    <div className="min-h-screen bg-white">
      {/* 브랜드 헤더 */}
      <div className="px-6 pt-14 pb-2">
        <p className="text-[13px] font-bold text-[#10b981] mb-6 tracking-tight">알라미</p>
        <h1 className="text-[24px] font-extrabold text-gray-900 leading-tight">
          매달 고정지출,<br />얼마나 줄일 수 있을까요?
        </h1>
        <p className="text-[14px] text-gray-400 mt-2 mb-6">통신비부터 확인해볼게요</p>
      </div>

      {/* 통신비 진단 섹션 */}
      <div className="px-6 pb-6 space-y-5">
        <div className="flex items-center gap-2">
          <Smartphone size={18} className="text-[#10b981]" />
          <p className="text-[14px] font-bold text-gray-800">통신비 진단</p>
        </div>

        {/* 통신사 칩 */}
        <div>
          <p className="text-[12px] text-gray-500 font-semibold mb-2">통신사</p>
          <div className="flex flex-wrap gap-2">
            {CARRIERS.map((c) => (
              <Chip key={c} label={c} selected={carrier === c} onSelect={() => setCarrier(c)} />
            ))}
          </div>
        </div>

        {/* 알뜰폰 선택 시 */}
        {isMvno && (
          <div className="rounded-2xl bg-[#E1F5EE] p-5">
            <p className="text-[17px] font-bold text-[#0F6E56]">이미 알뜰폰이시네요!</p>
            <p className="text-[13px] text-[#0F6E56] opacity-80 mt-1">
              통신비는 이미 잘 아끼고 있어요.
            </p>
          </div>
        )}

        {/* 월 통신비 입력 */}
        {carrier && !isMvno && (
          <>
            <div>
              <p className="text-[12px] text-gray-500 font-semibold mb-2">월 통신비</p>
              <div className="flex items-baseline border-b-2 border-gray-200 focus-within:border-[#10b981] pb-2 transition-colors">
                <input
                  type="number"
                  inputMode="numeric"
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTelecomCheck()}
                  placeholder="0"
                  className="flex-1 text-[36px] font-extrabold text-gray-900 placeholder:text-gray-200 bg-transparent outline-none"
                />
                <span className="text-[18px] font-semibold text-gray-400 ml-2 pb-1">만원/월</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTelecomCheck}
              disabled={!canCheckTelecom || telecomBusy}
              className="w-full bg-[#10b981] disabled:bg-gray-100 disabled:text-gray-400 text-white py-[16px] rounded-2xl text-[16px] font-bold transition-all active:scale-[0.98]"
            >
              {telecomBusy ? '계산 중...' : '확인하기'}
            </button>
          </>
        )}

        {/* 통신비 결과 */}
        {telecomResult && !isMvno && (
          <div className="rounded-2xl bg-[#E1F5EE] p-5">
            <p className="text-[11px] text-[#0F6E56] font-semibold mb-1">
              알뜰폰으로 바꾸면 대략
            </p>
            <p className="text-[28px] font-extrabold text-[#0F6E56]">
              연 {Math.round(telecomResult.saving_annual / 10000)}만원
              <span className="text-[16px] font-semibold ml-1">아낄 수 있어요</span>
            </p>
            <p className="text-[12px] text-[#0F6E56] opacity-70 mt-1.5">
              월 대략 {Math.round(telecomResult.saving_monthly / 1000)}천원 · 통신사 벤치마크 기준 추정
            </p>
          </div>
        )}

        {telecomError && (
          <p className="text-[12px] text-red-400">{telecomError}</p>
        )}
      </div>

      {/* 브릿지 카드 — 통신비 결과 또는 알뜰폰 선택 후 표시 */}
      {showBridge && (
        <div ref={bridgeRef} className="px-6 pb-6">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <div className="flex items-start gap-3 mb-4">
              <Clock size={20} className="text-[#10b981] mt-0.5 shrink-0" />
              <div>
                <p className="text-[15px] font-bold text-gray-900">
                  가장 이득인 타이밍은 약정 끝나는 날이에요
                </p>
                <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">
                  약정 중에 바꾸면 위약금이 있어요.<br />
                  약정일 알려주면 딱 그때 알려드릴게요.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/contracts/onboarding')}
              className="w-full bg-[#10b981] text-white py-[14px] rounded-xl text-[15px] font-bold transition-all active:scale-[0.98]"
            >
              약정일 등록하기 →
            </button>
          </div>
        </div>
      )}

      {/* 카드 절감 티저 */}
      <div className="px-6 pb-6 space-y-5">
        <div className="flex items-center gap-2">
          <CreditCard size={18} className="text-[#10b981]" />
          <p className="text-[14px] font-bold text-gray-800">카드도 바꾸면?</p>
        </div>

        <p className="text-[13px] text-gray-500 -mt-2">
          월 총지출 입력하면 카드 절약 가능액을 알려드려요
        </p>

        <div className="flex items-baseline border-b-2 border-gray-200 focus-within:border-[#10b981] pb-2 transition-colors">
          <input
            type="number"
            inputMode="numeric"
            value={cardAmount}
            onChange={(e) => setCardAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCardCheck()}
            placeholder="0"
            className="flex-1 text-[36px] font-extrabold text-gray-900 placeholder:text-gray-200 bg-transparent outline-none"
          />
          <span className="text-[18px] font-semibold text-gray-400 ml-2 pb-1">만원/월</span>
        </div>

        <button
          type="button"
          onClick={handleCardCheck}
          disabled={!cardAmount || Number(cardAmount) <= 0 || cardBusy}
          className="w-full bg-gray-900 disabled:bg-gray-100 disabled:text-gray-400 text-white py-[16px] rounded-2xl text-[16px] font-bold transition-all active:scale-[0.98]"
        >
          {cardBusy ? '계산 중...' : '카드 절약액 확인하기'}
        </button>

        {cardResult && (
          <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5">
            <p className="text-[11px] text-gray-500 font-semibold mb-1">카드 잘 조합하면 최대</p>
            <p className="text-[28px] font-extrabold text-gray-900">
              연 {Math.round((cardResult.card_saving_monthly * 12) / 10000)}만원
              <span className="text-[16px] font-semibold ml-1">더 아낄 수 있어요</span>
            </p>
            <p className="text-[12px] text-gray-400 mt-1">
              월 최대 {cardResult.card_saving_monthly.toLocaleString()}원 · 벤치마크 기준 추정이에요
            </p>
            <button
              type="button"
              onClick={() => navigate('/recommend')}
              className="mt-3 w-full border border-gray-200 text-gray-700 py-3 rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-all"
            >
              내 맞춤 카드 추천 보기 →
            </button>
          </div>
        )}

        {cardError && (
          <p className="text-[12px] text-red-400">{cardError}</p>
        )}
      </div>

      <div className="h-12" />
    </div>
  )
}
