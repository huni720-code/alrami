import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { userApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

const CARRIERS = ['SKT', 'KT', 'LGU+', '알뜰폰'] as const
const CARRIER_VALUE: Record<string, string> = { 'SKT': 'SKT', 'KT': 'KT', 'LGU+': 'LGU+', '알뜰폰': 'MVNO' }
const CARRIER_DISPLAY: Record<string, string> = { 'SKT': 'SKT', 'KT': 'KT', 'LGU+': 'LGU+', 'MVNO': '알뜰폰' }

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-12 h-6 rounded-full relative transition-colors ${on ? 'bg-[#10b981]' : 'bg-gray-200'}`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${
          on ? 'translate-x-6' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export default function ProfileEdit() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()

  const [carrier, setCarrier] = useState<string | null>(null)
  const [telecomFee, setTelecomFee] = useState('')
  const [contractEnd, setContractEnd] = useState('')
  const [cardTotal, setCardTotal] = useState('')
  const [hasOtt, setHasOtt] = useState(false)
  const [hasRental, setHasRental] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  // 기존 값으로 초기화
  useEffect(() => {
    if (!profile) return
    if (profile.telecom_carrier) {
      const display = CARRIER_DISPLAY[profile.telecom_carrier] ?? profile.telecom_carrier
      setCarrier(display)
    }
    if (profile.telecom_monthly_fee) setTelecomFee(String(profile.telecom_monthly_fee / 10000))
    if (profile.contract_end_date) setContractEnd(profile.contract_end_date)
    if (profile.card_monthly_total) setCardTotal(String(profile.card_monthly_total / 10000))
    setHasOtt(profile.has_ott ?? false)
    setHasRental(profile.has_rental ?? false)
  }, [profile])

  const canSubmit = carrier && telecomFee && cardTotal

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      await userApi.updateProfile({
        telecom_carrier: CARRIER_VALUE[carrier!],
        telecom_monthly_fee: Math.floor(Number(telecomFee)) * 10000,
        contract_end_date: contractEnd || null,
        card_monthly_total: Math.floor(Number(cardTotal)) * 10000,
        has_ott: hasOtt,
        has_rental: hasRental,
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
          <div className="text-4xl mb-3">✅</div>
          <p className="text-lg font-bold text-gray-800">저장됐어요!</p>
          <p className="text-sm text-gray-500 mt-1">대시보드로 이동합니다...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-sm mx-auto pb-10">
        <div className="flex items-center gap-3 mb-6 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-gray-600"
          >
            ← 뒤로
          </button>
          <h1 className="text-xl font-bold text-gray-900">내 정보 수정</h1>
        </div>

        <div className="space-y-6">
          {/* 통신사 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              통신사 <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CARRIERS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCarrier(c)}
                  className={`py-2 rounded-xl border text-sm font-medium transition-colors ${
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

          {/* 월 통신비 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              월 통신비 <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={telecomFee}
                onChange={(e) => setTelecomFee(e.target.value)}
                placeholder="예: 7"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-[#10b981] transition-colors"
              />
              <span className="absolute right-4 top-3 text-sm text-gray-400">만원</span>
            </div>
          </div>

          {/* 약정 종료일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">약정 종료일</label>
            <input
              type="date"
              value={contractEnd}
              onChange={(e) => setContractEnd(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#10b981] transition-colors"
            />
          </div>

          {/* 카드 총 사용액 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              카드 총 사용액 <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">카드별 아님, 월 전체 합계 금액</p>
            <div className="relative">
              <input
                type="number"
                value={cardTotal}
                onChange={(e) => setCardTotal(e.target.value)}
                placeholder="예: 50"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-[#10b981] transition-colors"
              />
              <span className="absolute right-4 top-3 text-sm text-gray-400">만원</span>
            </div>
          </div>

          {/* OTT / 렌탈 */}
          <div className="space-y-3">
            {[
              { label: 'OTT 이용 중', sub: '넷플릭스, 디즈니+ 등', on: hasOtt, toggle: () => setHasOtt(!hasOtt) },
              { label: '렌탈 이용 중', sub: '정수기, 공기청정기 등', on: hasRental, toggle: () => setHasRental(!hasRental) },
            ].map(({ label, sub, on, toggle }) => (
              <div key={label} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
                <Toggle on={on} onToggle={toggle} />
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          className="w-full mt-8 bg-[#10b981] disabled:bg-gray-200 text-white disabled:text-gray-400 py-4 rounded-2xl font-semibold text-base transition-colors"
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </Layout>
  )
}
