import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userProfileApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

// 온보딩 — 통신비 1개 질문(선택, 건너뛰기 가능) → 약정 그리드로 연결.
// 카드/소비 질문은 동결(freeze)로 제거됨. 계산은 백엔드, 여기선 저장만.

export default function Onboarding() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [telecomFee, setTelecomFee] = useState('')
  const [busy, setBusy] = useState(false)

  // 통신비 저장(있으면) → onboarding_completed 표시 → 약정 그리드로
  const finish = async (withFee: boolean) => {
    if (busy) return
    setBusy(true)
    try {
      await userProfileApi.update({
        telecom_monthly_fee: withFee && telecomFee ? Math.floor(Number(telecomFee)) * 10000 : null,
        onboarding_completed: true,
      })
      await refreshProfile()
      navigate('/contracts/grid')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* 상단 내비 */}
      <div className="flex items-center justify-end px-6 pt-6 pb-2">
        <button
          type="button"
          onClick={() => finish(false)}
          disabled={busy}
          className="text-[13px] text-gray-400 disabled:opacity-40"
        >
          건너뛰기
        </button>
      </div>

      {/* 질문 영역 */}
      <div className="flex-1 px-6 pt-6">
        <p className="text-[13px] text-[#10b981] font-bold mb-3 tracking-tight">만기톡</p>
        <h2 className="text-[28px] font-extrabold text-gray-900 leading-tight mb-2 tracking-tight">
          매달 통신비가<br />얼마인가요?
        </h2>
        <p className="text-[14px] text-gray-400 mb-10">
          데이터 요금제 포함, 전체 금액 (선택)
        </p>

        <div className="flex items-baseline bg-gray-50 rounded-2xl px-5 py-5">
          <input
            type="number"
            inputMode="numeric"
            value={telecomFee}
            onChange={(e) => setTelecomFee(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && finish(true)}
            placeholder="0"
            autoFocus
            className="flex-1 text-[40px] font-extrabold text-gray-900 placeholder:text-gray-200 bg-transparent outline-none"
          />
          <span className="text-[20px] text-gray-400 ml-2 font-medium">만원</span>
        </div>

        <p className="text-[13px] text-gray-400 mt-3">
          몰라도 괜찮아요. 약정부터 등록할 수 있어요.
        </p>
      </div>

      {/* 하단 고정 CTA */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-100 px-6 pt-3 pb-8">
        <button
          type="button"
          onClick={() => finish(true)}
          disabled={busy}
          className="w-full bg-[#10b981] text-white py-[18px] rounded-2xl text-[18px] font-bold transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? '저장 중...' : '약정 등록하러 가기 →'}
        </button>
        {user?.username && (
          <p className="text-center text-[13px] text-gray-400 mt-4">
            {user.username}님, 약정 만료를 대신 지켜드릴게요
          </p>
        )}
      </div>
    </div>
  )
}
