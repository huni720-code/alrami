import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { userApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

const CARRIERS = ['SKT', 'KT', 'LGU+', '알뜰폰'] as const
const CARRIER_API: Record<string, string> = { SKT: 'SKT', KT: 'KT', 'LGU+': 'LGU+', '알뜰폰': 'MVNO' }
const CARRIER_DISPLAY: Record<string, string> = { SKT: 'SKT', KT: 'KT', 'LGU+': 'LGU+', MVNO: '알뜰폰' }

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-12 h-6 rounded-full relative transition-colors ${on ? 'bg-[#10b981]' : 'bg-gray-200'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${on ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function ProfileEdit() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()

  // 필수
  const [telecomFee, setTelecomFee] = useState('')
  const [cardTotal, setCardTotal] = useState('')
  const [contractEnd, setContractEnd] = useState('')

  // 선택
  const [showOptional, setShowOptional] = useState(false)
  const [carrier, setCarrier] = useState<string | null>(null)
  const [hasOtt, setHasOtt] = useState(false)
  const [hasRental, setHasRental] = useState(false)
  const [rentalEnd, setRentalEnd] = useState('')

  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!profile) return
    if (profile.telecom_carrier) setCarrier(CARRIER_DISPLAY[profile.telecom_carrier] ?? profile.telecom_carrier)
    if (profile.telecom_monthly_fee) setTelecomFee(String(profile.telecom_monthly_fee / 10000))
    if (profile.contract_end_date) setContractEnd(profile.contract_end_date)
    if (profile.card_monthly_total) setCardTotal(String(profile.card_monthly_total / 10000))
    setHasOtt(profile.has_ott ?? false)
    setHasRental(profile.has_rental ?? false)
    if (profile.rental_end_date) setRentalEnd(profile.rental_end_date)
  }, [profile])

  const canSubmit = telecomFee.trim() !== '' || cardTotal.trim() !== ''

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      await userApi.updateProfile({
        telecom_carrier: carrier ? CARRIER_API[carrier] : null,
        telecom_monthly_fee: telecomFee ? Math.floor(Number(telecomFee)) * 10000 : null,
        contract_end_date: contractEnd || null,
        card_monthly_total: cardTotal ? Math.floor(Number(cardTotal)) * 10000 : null,
        has_ott: hasOtt,
        has_rental: hasRental,
        rental_end_date: hasRental && rentalEnd ? rentalEnd : null,
        onboarding_completed: true,
      })
      await refreshProfile()
      setDone(true)
      setTimeout(() => navigate('/dashboard'), 1200)
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
          <div className="text-[52px] mb-3">✅</div>
          <p className="text-[20px] font-bold text-gray-800">저장됐어요!</p>
          <p className="text-[14px] text-gray-400 mt-1">대시보드로 이동합니다...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-sm mx-auto pb-10">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="text-gray-400 text-[15px]">
            ←
          </button>
          <h1 className="text-[22px] font-extrabold text-gray-900">내 정보 수정</h1>
        </div>

        {/* 필수 입력 */}
        <div className="space-y-6">

          {/* 통신비 */}
          <div>
            <label className="block text-[15px] font-semibold text-gray-700 mb-1">
              매달 통신비가 얼마인가요?
            </label>
            <p className="text-[12px] text-gray-400 mb-2">데이터 요금제 포함 전체 금액</p>
            <div className="flex items-baseline bg-gray-50 rounded-2xl px-4 py-3.5">
              <input
                type="number"
                inputMode="numeric"
                value={telecomFee}
                onChange={(e) => setTelecomFee(e.target.value)}
                placeholder="0"
                className="flex-1 text-[22px] font-bold text-gray-900 placeholder:text-gray-300 bg-transparent outline-none"
              />
              <span className="text-[15px] text-gray-400 ml-1">만원</span>
            </div>
          </div>

          {/* 카드 사용액 */}
          <div>
            <label className="block text-[15px] font-semibold text-gray-700 mb-1">
              한 달 카드로 얼마나 쓰세요?
            </label>
            <p className="text-[12px] text-gray-400 mb-2">카드 종류 상관없이 합산 금액</p>
            <div className="flex items-baseline bg-gray-50 rounded-2xl px-4 py-3.5">
              <input
                type="number"
                inputMode="numeric"
                value={cardTotal}
                onChange={(e) => setCardTotal(e.target.value)}
                placeholder="0"
                className="flex-1 text-[22px] font-bold text-gray-900 placeholder:text-gray-300 bg-transparent outline-none"
              />
              <span className="text-[15px] text-gray-400 ml-1">만원</span>
            </div>
          </div>

          {/* 약정 종료일 */}
          <div>
            <label className="block text-[15px] font-semibold text-gray-700 mb-1">
              약정은 언제 끝나나요?
              <span className="text-[13px] text-gray-400 font-normal ml-1">(선택)</span>
            </label>
            <input
              type="date"
              value={contractEnd}
              onChange={(e) => setContractEnd(e.target.value)}
              className="w-full bg-gray-50 rounded-2xl px-4 py-3.5 text-[15px] text-gray-700 outline-none focus:ring-2 focus:ring-[#10b981]"
            />
          </div>

          {/* 선택 정보 접기/펼치기 */}
          <div className="border-t border-gray-100 pt-1">
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="w-full flex items-center justify-between py-3 text-[14px] font-semibold text-gray-500"
            >
              <span>선택 정보 입력하기</span>
              <span className="text-gray-400 text-[12px]">{showOptional ? '▲ 접기' : '▼ 펼치기'}</span>
            </button>

            {showOptional && (
              <div className="space-y-5 pt-2">

                {/* 통신사 */}
                <div>
                  <label className="block text-[15px] font-semibold text-gray-700 mb-2">통신사</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CARRIERS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCarrier(carrier === c ? null : c)}
                        className={`py-2.5 rounded-xl border text-[13px] font-medium transition-colors ${
                          carrier === c
                            ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* OTT */}
                <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-4">
                  <div>
                    <p className="text-[15px] font-semibold text-gray-800">OTT 이용 중</p>
                    <p className="text-[12px] text-gray-400 mt-0.5">넷플릭스, 디즈니+ 등</p>
                  </div>
                  <Toggle on={hasOtt} onToggle={() => setHasOtt(!hasOtt)} />
                </div>

                {/* 렌탈 */}
                <div>
                  <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-4">
                    <div>
                      <p className="text-[15px] font-semibold text-gray-800">렌탈 이용 중</p>
                      <p className="text-[12px] text-gray-400 mt-0.5">정수기, 공기청정기 등</p>
                    </div>
                    <Toggle on={hasRental} onToggle={() => setHasRental(!hasRental)} />
                  </div>
                  {hasRental && (
                    <div className="mt-2 px-1">
                      <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                        렌탈 계약 종료일
                        <span className="text-[12px] text-gray-300 font-normal ml-1">(선택)</span>
                      </label>
                      <input
                        type="date"
                        value={rentalEnd}
                        onChange={(e) => setRentalEnd(e.target.value)}
                        className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-[15px] text-gray-700 outline-none focus:ring-2 focus:ring-[#10b981]"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          className="w-full mt-10 bg-[#10b981] disabled:bg-gray-100 text-white disabled:text-gray-300 py-[18px] rounded-2xl text-[17px] font-bold transition-all active:scale-[0.98]"
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>

        {!canSubmit && (
          <p className="text-center text-[12px] text-gray-400 mt-3">
            통신비 또는 카드 사용액 중 하나는 입력해주세요
          </p>
        )}
      </div>
    </Layout>
  )
}
