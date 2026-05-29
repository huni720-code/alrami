const DEFAULT_CHIPS = [
  '이번 달 현황 요약해줘',
  '어떤 카드를 먼저 써야 해?',
  '카드 실적이 얼마나 부족해?',
  '절약액이 얼마야?',
  '통신사 바꾸는 게 이득이야?',
  '렌탈 유지하는 게 좋을까?',
  '약정 종료 언제야?',
  '다음 달 소비 계획 짜줘',
]

interface Props {
  onSelect: (text: string) => void
}

export default function CoachSuggestionChips({ onSelect }: Props) {
  return (
    <div className="overflow-x-auto pb-1 -mx-4 px-4">
      <div className="flex gap-2 w-max">
        {DEFAULT_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onSelect(chip)}
            className="shrink-0 text-[13px] text-gray-600 bg-white border border-gray-200
              px-3.5 py-1.5 rounded-full whitespace-nowrap active:scale-[0.97] transition-all
              hover:border-[#10b981] hover:text-[#10b981]"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
