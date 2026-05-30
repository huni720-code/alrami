const CHIPS: { label: string; question: string }[] = [
  { label: '이번 달 현황',   question: '이번 달 현황 요약해줘' },
  { label: '카드 사용 순서', question: '어떤 카드를 먼저 써야 해?' },
  { label: '카드 실적 확인', question: '카드 실적이 얼마나 부족해?' },
  { label: '절약액 확인',    question: '절약액이 얼마야?' },
  { label: '통신사 교체',    question: '통신사 바꾸는 게 이득이야?' },
  { label: '렌탈 유지 여부', question: '렌탈 유지하는 게 좋을까?' },
  { label: '약정 종료일',    question: '약정 종료 언제야?' },
  { label: '다음 달 계획',   question: '다음 달 소비 계획 짜줘' },
]

interface Props {
  onSelect: (question: string) => void
  disabled?: boolean
}

export default function CoachSuggestionChips({ onSelect, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHIPS.map(({ label, question }) => (
        <button
          key={question}
          type="button"
          onClick={() => onSelect(question)}
          disabled={disabled}
          className={`text-[13px] px-3.5 py-2 rounded-full border whitespace-nowrap
            transition-all active:scale-[0.97] min-h-[36px]
            ${disabled
              ? 'border-gray-100 text-gray-300 bg-white cursor-not-allowed'
              : 'border-gray-200 text-gray-600 bg-white hover:border-[#10b981] hover:text-[#10b981]'
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
