import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Step1() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')

  const handleSubmit = () => {
    const amount = Math.floor(Number(input)) * 10000
    if (!amount || amount <= 0) return
    navigate('/onboarding/step2', { state: { amount } })
  }

  return (
    <div className="min-h-screen bg-white flex flex-col px-6" style={{ paddingTop: '14vh' }}>
      <div className="w-full max-w-sm mx-auto">

        {/* 브랜드 */}
        <p className="text-[15px] font-bold text-[#10b981] mb-10 tracking-tight">만기톡</p>

        {/* 헤드라인 */}
        <h1 className="text-[28px] font-extrabold text-gray-900 leading-tight mb-3">
          매달 고정지출에서<br />
          <span className="text-[#10b981]">새는 돈</span>을 찾아드려요
        </h1>
        <p className="text-[16px] text-gray-400 mb-12">
          한 달 고정지출 총액을 알려주세요
        </p>

        {/* 큰 숫자 입력 */}
        <div className="mb-10">
          <div className="flex items-baseline border-b-2 border-gray-200 focus-within:border-[#10b981] transition-colors pb-3">
            <input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="0"
              autoFocus
              className="flex-1 text-[52px] font-extrabold text-gray-900 placeholder:text-gray-200 bg-transparent outline-none"
            />
            <span className="text-[22px] font-semibold text-gray-400 ml-2 pb-1">만원</span>
          </div>
          <p className="text-[13px] text-gray-300 mt-3">예: 통신비 + 카드값 + 렌탈 합계</p>
        </div>

        {/* CTA 버튼 */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!input || Number(input) <= 0}
          className="w-full bg-[#10b981] disabled:bg-gray-100 text-white disabled:text-gray-300
            py-[18px] rounded-2xl text-[17px] font-bold transition-all
            active:scale-[0.98]"
        >
          절약액 계산하기
        </button>

        <p className="text-center text-[13px] text-gray-300 mt-5">
          로그인 없이 바로 확인 가능해요
        </p>
      </div>
    </div>
  )
}
