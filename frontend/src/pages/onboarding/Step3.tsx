import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const CARRIERS = ['SKT', 'KT', 'LGU+', '알뜰폰'] as const
const CARRIER_VALUE: Record<string, string> = {
  SKT: 'SKT', KT: 'KT', 'LGU+': 'LGU+', '알뜰폰': 'MVNO',
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-12 h-7 rounded-full relative transition-colors duration-200 ${on ? 'bg-[#10b981]' : 'bg-gray-200'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow transition-transform duration-200 ${
        on ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  )
}

export default function Step3() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  const [carrier, setCarrier] = useState<string | null>(null)
  const [telecomFee, setTelecomFee] = useState('')
  const [contractEnd, setContractEnd] = useState('')
  const [cardTotal, setCardTotal] = useState('')
  const [hasOtt, setHasOtt] = useState(false)
  const [hasRental, setHasRental] = useState(false)
  const [showOptional, setShowOptional] = useState(false)
  const [saving, setSaving] = useState(false)

  // 통신비 또는 카드 중 하나만 있으면 저장 가능
  const canSubmit = telecomFee.trim() !== '' || cardTotal.trim() !== ''

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      await userApi.updateProfile({
        telecom_carrier: carrier ? CARRIER_VALUE[carrier] : null,
        telecom_monthly_fee: telecomFee ? Math.floor(Number(telecomFee)) * 10000 : null,
        contract_end_date: contractEnd || null,
        card_monthly_total: cardTotal ? Math.floor(Number(cardTotal)) * 10000 : null,
        has_ott: hasOtt,
        has_rental: hasRental,
        onboarding_completed: true,
      })
      await refreshProfile()
      navigate('/onboarding/complete')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    setSaving(true)
    try {
      await userApi.updateProfile({ onboarding_completed: true })
      await refreshProfile()
      navigate('/dashboard')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* 진행 표시 */}
      <div className="flex gap-1.5 px-6 pt-6 mb-8">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className={`h-1 flex-1 rounded-full ${n <= 3 ? 'bg-[#10b981]' : 'bg-gray-100'}`} />
        ))}
      </div>

      <div className="flex-1 px-6">
        <p className="text-[13px] text-[#10b981] font-bold mb-3 tracking-wide">STEP 3</p>
        <h2 className="text-[28px] font-extrabold text-gray-900 leading-tight mb-2">
          조금만 더<br />알려주세요
        </h2>
        <p className="text-[14px] text-gray-400 mb-8">정확한 절약 추천을 위해 필요해요</p>

        {/* 필수: 통신비 */}
        <div className="mb-6">
          <label className="block text-[15px] font-bold text-gray-800 mb-1">
            매달 통신비가 얼마인가요?
          </label>
          <p className="text-[12px] text-gray-400 mb-2">납부 고지서 기준 금액</p>
          <div className="flex items-baseline bg-gray-50 rounded-2xl px-4 py-4">
            <input
              type="number"
              inputMode="numeric"
              value={telecomFee}
              onChange={(e) => setTelecomFee(e.target.value)}
              placeholder="0"
              autoFocus
              className="flex-1 text-[32px] font-extrabold text-gray-900 placeholder:text-gray-200 bg-transparent outline-none"
            />
            <span className="text-[17px] text-gray-400 ml-2">만원</span>
          </div>
        </div>

        {/* 필수: 카드 사용액 */}
        <div className="mb-6">
          <label className="block text-[15px] font-bold text-gray-800 mb-1">
            한 달 카드로 얼마나 쓰세요?
          </label>
          <p className="text-[12px] text-gray-400 mb-2">카드 종류 상관없이 합산 금액</p>
          <div className="flex items-baseline bg-gray-50 rounded-2xl px-4 py-4">
            <input
              type="number"
              inputMode="numeric"
              value={cardTotal}
              onChange={(e) => setCardTotal(e.target.value)}
              placeholder="0"
              className="flex-1 text-[32px] font-extrabold text-gray-900 placeholder:text-gray-200 bg-transparent outline-none"
            />
            <span className="text-[17px] text-gray-400 ml-2">만원</span>
          </div>
        </div>

        {/* 선택: 더 정확하게 */}
        <div className="border-t border-gray-100 pt-2 mb-4">
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="w-full flex items-center justify-between py-3 text-[14px] font-semibold text-gray-500"
          >
            <span>더 정확하게 계산하기</span>
            <span className="text-[12px] text-gray-400">{showOptional ? '▲ 접기' : '▼ 펼치기'}</span>
          </button>

          {showOptional && (
            <div className="space-y-5 pt-2">
              {/* 통신사 */}
              <div>
                <label className="block text-[14px] font-semibold text-gray-700 mb-2">통신사</label>
                <div className="grid grid-cols-4 gap-2">
                  {CARRIERS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCarrier(carrier === c ? null : c)}
                      className={`py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                        carrier === c
                          ? 'bg-[#10b981] text-white'
                          : 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* 약정 종료일 */}
              <div>
                <label className="block text-[14px] font-semibold text-gray-700 mb-2">
                  약정 종료일
                  <span className="text-[12px] text-gray-400 font-normal ml-1">(선택)</span>
                </label>
                <input
                  type="date"
                  value={contractEnd}
                  onChange={(e) => setContractEnd(e.target.value)}
                  className="w-full bg-gray-50 rounded-2xl px-4 py-3.5 text-[15px] text-gray-700 outline-none focus:ring-2 focus:ring-[#10b981]"
                />
              </div>

              {/* OTT / 렌탈 */}
              {[
                { label: 'OTT 이용 중', sub: '넷플릭스, 디즈니+ 등', on: hasOtt, toggle: () => setHasOtt(!hasOtt) },
                { label: '렌탈 이용 중', sub: '정수기, 공기청정기 등', on: hasRental, toggle: () => setHasRental(!hasRental) },
              ].map(({ label, sub, on, toggle }) => (
                <div key={label} className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-4">
                  <div>
                    <p className="text-[15px] font-semibold text-gray-800">{label}</p>
                    <p className="text-[12px] text-gray-400 mt-0.5">{sub}</p>
                  </div>
                  <Toggle on={on} onToggle={toggle} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="px-6 pb-10 space-y-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          className="w-full bg-[#10b981] disabled:bg-gray-100 text-white disabled:text-gray-300 py-[18px] rounded-2xl text-[18px] font-bold transition-all active:scale-[0.98]"
        >
          {saving ? '저장 중...' : '내 절약액 확인하기 →'}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={saving}
          className="w-full text-[13px] text-gray-400 py-2"
        >
          나중에 입력할게요
        </button>
      </div>
    </div>
  )
}
