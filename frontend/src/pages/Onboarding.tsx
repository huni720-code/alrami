import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userProfileApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const CARRIERS = ['SKT', 'KT', 'LGU+', 'MVNO']
const CARD_PRESETS = [300000, 500000, 1000000, 1500000, 2000000]
const STEPS = ['통신사 정보', '카드 사용', '부가 서비스']

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-12 h-6 rounded-full relative transition-colors ${on ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${
          on ? 'translate-x-6' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export default function Onboarding() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 0
  const [carrier, setCarrier] = useState<string | null>(null)
  const [telecomFee, setTelecomFee] = useState('')
  const [contractEnd, setContractEnd] = useState('')

  // Step 1
  const [cardMonthly, setCardMonthly] = useState('')

  // Step 2
  const [hasOtt, setHasOtt] = useState(false)
  const [hasRental, setHasRental] = useState(false)

  const save = async (data: Record<string, unknown>) => {
    setSaving(true)
    try {
      await userProfileApi.update(data)
    } finally {
      setSaving(false)
    }
  }

  const handleNextStep0 = async () => {
    await save({
      telecom_carrier: carrier,
      telecom_monthly_fee: telecomFee ? parseInt(telecomFee) : null,
      contract_end_date: contractEnd || null,
    })
    setStep(1)
  }

  const handleNextStep1 = async () => {
    await save({ card_monthly_total: cardMonthly ? parseInt(cardMonthly) : null })
    setStep(2)
  }

  const handleComplete = async () => {
    await save({ has_ott: hasOtt, has_rental: hasRental, onboarding_completed: true })
    await refreshProfile()
    navigate('/dashboard')
  }

  const handleSkipAll = async () => {
    await save({ onboarding_completed: true })
    await refreshProfile()
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">안녕하세요, {user?.username}님!</h1>
          <p className="text-gray-500 mt-1 text-sm">맞춤 혜택 추천을 위해 정보를 입력해 주세요</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    i <= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs mt-1 whitespace-nowrap ${i === step ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-16 h-0.5 mb-4 mx-2 transition-colors ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

          {/* Step 0 — 통신사 정보 */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-800">통신사 정보</h2>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">통신사</label>
                <div className="grid grid-cols-4 gap-2">
                  {CARRIERS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCarrier(c)}
                      className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                        carrier === c
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">월 통신료</label>
                <div className="relative">
                  <input
                    type="number"
                    value={telecomFee}
                    onChange={(e) => setTelecomFee(e.target.value)}
                    placeholder="50000"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <span className="absolute right-3 top-2.5 text-sm text-gray-400">원</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">약정 종료일</label>
                <input
                  type="date"
                  value={contractEnd}
                  onChange={(e) => setContractEnd(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleNextStep0}
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? '저장 중...' : '다음'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  건너뛰기
                </button>
              </div>
            </div>
          )}

          {/* Step 1 — 카드 사용 현황 */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-800">카드 사용 현황</h2>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">월 카드 사용액 (전체 합계)</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {CARD_PRESETS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setCardMonthly(String(v))}
                      className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                        cardMonthly === String(v)
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {(v / 10000).toFixed(0)}만원
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={cardMonthly}
                    onChange={(e) => setCardMonthly(e.target.value)}
                    placeholder="직접 입력"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <span className="absolute right-3 top-2.5 text-sm text-gray-400">원</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  이전
                </button>
                <button
                  type="button"
                  onClick={handleNextStep1}
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? '저장 중...' : '다음'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  건너뛰기
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — 부가 서비스 */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-800">부가 서비스</h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-800">OTT 구독 중</p>
                    <p className="text-xs text-gray-400 mt-0.5">넷플릭스, 디즈니+, 왓챠 등</p>
                  </div>
                  <Toggle on={hasOtt} onToggle={() => setHasOtt(!hasOtt)} />
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-800">렌탈 서비스 이용 중</p>
                    <p className="text-xs text-gray-400 mt-0.5">정수기, 공기청정기, 안마의자 등</p>
                  </div>
                  <Toggle on={hasRental} onToggle={() => setHasRental(!hasRental)} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  이전
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? '저장 중...' : '설정 완료'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 전체 건너뛰기 */}
        <p className="text-center mt-5">
          <button
            type="button"
            onClick={handleSkipAll}
            disabled={saving}
            className="text-xs text-gray-400 hover:text-gray-500 underline disabled:opacity-50"
          >
            지금은 건너뛰고 나중에 입력하기
          </button>
        </p>
      </div>
    </div>
  )
}
