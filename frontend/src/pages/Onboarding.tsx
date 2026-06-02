import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userProfileApi, recommendationApi } from '../lib/api'
import type { QuickEstimate } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const CARD_PRESETS = [30, 50, 100, 150, 200]

function fmt만원(won: number) {
  const 만 = Math.round(won / 10000)
  return 만 > 0 ? `${만.toLocaleString()}만원` : `${won.toLocaleString()}원`
}

// ─── 결과 화면 ────────────────────────────────────────────────────────────────
function ResultScreen({
  estimate,
  navigate,
}: {
  estimate: QuickEstimate | null
  navigate: (to: string) => void
}) {
  const hasData = estimate && estimate.total_saving_annual > 0

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 상단 녹색 영역 */}
      <div className="bg-[#10b981] px-6 pt-16 pb-10 text-white">
        <p className="text-[14px] opacity-75 mb-3 font-medium">STEP 4 · 절약 결과</p>

        {hasData ? (
          <>
            <p className="text-[16px] opacity-80 mb-1">예상 연간 절약액</p>
            <p className="text-[48px] font-extrabold leading-tight tracking-tight">
              {fmt만원(estimate.total_saving_annual)}
            </p>
            <p className="text-[16px] opacity-75 mt-2">
              매달 {fmt만원(estimate.total_saving_monthly)} 절약 가능
            </p>
          </>
        ) : (
          <>
            <p className="text-[28px] font-extrabold leading-snug">
              정보를 저장했어요 ✓
            </p>
            <p className="text-[15px] opacity-75 mt-2 leading-relaxed">
              대시보드에서 맞춤<br />절약 추천을 확인하세요
            </p>
          </>
        )}
      </div>

      {/* 세부 내역 */}
      {hasData && (
        <div className="px-6 py-6">
          <p className="text-[13px] text-gray-400 font-semibold mb-4 uppercase tracking-wide">
            월간 절약 내역
          </p>
          <div className="space-y-1">
            {/* FROZEN: card teaser suspended — code preserved */}
            {false && estimate.card_saving_monthly > 0 && (
              <div className="flex items-center justify-between py-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <span className="text-[22px]">💳</span>
                  <span className="text-[15px] text-gray-700 font-medium">카드 혜택 최적화</span>
                </div>
                <span className="text-[16px] font-bold text-gray-900">
                  +{fmt만원(estimate.card_saving_monthly)}
                </span>
              </div>
            )}
            {estimate.telecom_saving_monthly > 0 && (
              <div className="flex items-center justify-between py-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <span className="text-[22px]">📱</span>
                  <span className="text-[15px] text-gray-700 font-medium">통신비 절약</span>
                </div>
                <span className="text-[16px] font-bold text-gray-900">
                  +{fmt만원(estimate.telecom_saving_monthly)}
                </span>
              </div>
            )}
          </div>
          <p className="text-[12px] text-gray-400 mt-4">
            * 실제 혜택은 사용 패턴에 따라 달라질 수 있어요
          </p>
        </div>
      )}

      {/* 하단 버튼 */}
      <div className="mt-auto px-6 pb-10 space-y-3">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="w-full bg-[#10b981] text-white py-[18px] rounded-2xl text-[18px] font-bold active:scale-[0.98] transition-all"
        >
          대시보드에서 확인하기
        </button>
        <button
          type="button"
          onClick={() => navigate('/profile-edit')}
          className="w-full border border-gray-200 text-gray-600 py-[16px] rounded-2xl text-[15px] font-semibold"
        >
          더 정확하게 계산하기
        </button>
      </div>
    </div>
  )
}

// ─── 메인 온보딩 ──────────────────────────────────────────────────────────────
export default function Onboarding() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [telecomFee, setTelecomFee] = useState('')
  const [cardMonthly, setCardMonthly] = useState('')
  const [contractEnd, setContractEnd] = useState('')
  const [estimate, setEstimate] = useState<QuickEstimate | null>(null)
  const [busy, setBusy] = useState(false)

  const goBack = () => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4)

  const skipAll = async () => {
    setBusy(true)
    try {
      await userProfileApi.update({ onboarding_completed: true })
      await refreshProfile()
      navigate('/dashboard')
    } finally {
      setBusy(false)
    }
  }

  const finishAndEstimate = async () => {
    setBusy(true)
    try {
      await userProfileApi.update({
        telecom_monthly_fee: telecomFee ? Math.floor(Number(telecomFee)) * 10000 : null,
        card_monthly_total: cardMonthly ? Math.floor(Number(cardMonthly)) * 10000 : null,
        contract_end_date: contractEnd || null,
        onboarding_completed: true,
      })
      await refreshProfile()

      if (cardMonthly) {
        try {
          const res = await recommendationApi.quickEstimate(
            Math.floor(Number(cardMonthly)) * 10000,
          )
          setEstimate(res.data)
        } catch {
          // 추정 실패 시 결과 화면은 기본 메시지로 표시
        }
      }
      setStep(4)
    } finally {
      setBusy(false)
    }
  }

  if (step === 4) {
    return <ResultScreen estimate={estimate} navigate={navigate} />
  }

  const progressPct = ((step - 1) / 3) * 100

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* 진행 바 */}
      <div className="h-[3px] bg-gray-100">
        <div
          className="h-full bg-[#10b981] transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* 상단 내비 */}
      <div className="flex items-center justify-between px-6 py-5">
        {step > 1 ? (
          <button type="button" onClick={goBack} className="text-[24px] text-gray-400 leading-none">
            ←
          </button>
        ) : (
          <div className="w-7" />
        )}

        <span className="text-[13px] text-gray-400 font-medium">{step} / 3</span>

        <button
          type="button"
          onClick={skipAll}
          disabled={busy}
          className="text-[13px] text-gray-400 disabled:opacity-40"
        >
          건너뛰기
        </button>
      </div>

      {/* 질문 영역 */}
      <div className="flex-1 px-6 pt-4">

        {/* STEP 1 — 통신비 */}
        {step === 1 && (
          <div>
            <p className="text-[13px] text-[#10b981] font-bold mb-3 tracking-wide">STEP 1</p>
            <h2 className="text-[28px] font-extrabold text-gray-900 leading-tight mb-2">
              매달 통신비가<br />얼마인가요?
            </h2>
            <p className="text-[14px] text-gray-400 mb-10">
              데이터 요금제 포함, 전체 금액
            </p>

            <div className="flex items-baseline bg-gray-50 rounded-2xl px-5 py-5">
              <input
                type="number"
                inputMode="numeric"
                value={telecomFee}
                onChange={(e) => setTelecomFee(e.target.value)}
                placeholder="0"
                autoFocus
                className="flex-1 text-[40px] font-extrabold text-gray-900 placeholder:text-gray-200 bg-transparent outline-none"
              />
              <span className="text-[20px] text-gray-400 ml-2 font-medium">만원</span>
            </div>

            <p className="text-[13px] text-gray-400 mt-3">
              예: 5G 요금제 기준 보통 5 ~ 8만원
            </p>
          </div>
        )}

        {/* STEP 2 — 카드 사용액 */}
        {step === 2 && (
          <div>
            <p className="text-[13px] text-[#10b981] font-bold mb-3 tracking-wide">STEP 2</p>
            <h2 className="text-[28px] font-extrabold text-gray-900 leading-tight mb-2">
              한 달 카드로<br />얼마나 쓰세요?
            </h2>
            <p className="text-[14px] text-gray-400 mb-8">
              카드 종류 상관없이 합산 금액
            </p>

            <div className="flex flex-wrap gap-2 mb-5">
              {CARD_PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCardMonthly(cardMonthly === String(v) ? '' : String(v))}
                  className={`px-5 py-2.5 rounded-full border text-[14px] font-semibold transition-colors ${
                    cardMonthly === String(v)
                      ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {v}만원
                </button>
              ))}
            </div>

            <div className="flex items-baseline bg-gray-50 rounded-2xl px-5 py-5">
              <input
                type="number"
                inputMode="numeric"
                value={cardMonthly}
                onChange={(e) => setCardMonthly(e.target.value)}
                placeholder="직접 입력"
                autoFocus
                className="flex-1 text-[40px] font-extrabold text-gray-900 placeholder:text-gray-200 bg-transparent outline-none"
              />
              <span className="text-[20px] text-gray-400 ml-2 font-medium">만원</span>
            </div>
          </div>
        )}

        {/* STEP 3 — 약정 종료일 */}
        {step === 3 && (
          <div>
            <p className="text-[13px] text-[#10b981] font-bold mb-3 tracking-wide">STEP 3</p>
            <h2 className="text-[28px] font-extrabold text-gray-900 leading-tight mb-2">
              약정은 언제<br />끝나나요?
            </h2>
            <p className="text-[14px] text-gray-400 mb-10">
              모르면 그냥 넘어가도 괜찮아요
            </p>

            <input
              type="date"
              value={contractEnd}
              onChange={(e) => setContractEnd(e.target.value)}
              className="w-full bg-gray-50 rounded-2xl px-5 py-5 text-[20px] font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#10b981]"
            />

            <p className="text-[13px] text-gray-400 mt-3">
              약정 만료 시 더 저렴한 요금제로 바꿀 수 있어요
            </p>
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="px-6 pb-10 pt-6">
        <button
          type="button"
          onClick={step === 3 ? finishAndEstimate : () => setStep((step + 1) as 2 | 3 | 4)}
          disabled={busy}
          className="w-full bg-[#10b981] text-white py-[18px] rounded-2xl text-[18px] font-bold transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {busy
            ? '계산 중...'
            : step === 3
            ? '내 절약액 확인하기 →'
            : '다음 →'}
        </button>

        {step === 1 && (
          <p className="text-center text-[13px] text-gray-400 mt-4">
            {user?.username}님, 3개 질문만 답하면 끝이에요
          </p>
        )}
      </div>
    </div>
  )
}
