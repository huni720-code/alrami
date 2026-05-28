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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900 leading-snug whitespace-pre-line">
            {'매달 고정지출에서\n새고 있는 돈이 있어요'}
          </h1>
          <p className="mt-3 text-gray-500 text-sm">한 달 고정지출 총액을 입력해주세요</p>
        </div>

        <div className="relative mb-6">
          <input
            type="number"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="예: 30"
            className="w-full border-b-2 border-gray-200 focus:border-[#10b981] outline-none py-3 pr-10 text-2xl font-semibold text-gray-900 placeholder:text-gray-300 transition-colors"
          />
          <span className="absolute right-0 bottom-3 text-gray-400 text-base">만원</span>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!input || Number(input) <= 0}
          className="w-full bg-[#10b981] disabled:bg-gray-200 text-white disabled:text-gray-400 py-4 rounded-2xl font-semibold text-base transition-colors"
        >
          절약액 계산하기
        </button>
      </div>
    </div>
  )
}
