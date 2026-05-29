import type { CardStrategy } from '../../types/cardPortfolio'

const PRIORITY_STYLE = {
  urgent: {
    wrap:    'border border-orange-200 bg-orange-50',
    badge:   'bg-orange-100 text-orange-600',
    bar:     'bg-orange-400',
    accent:  'text-orange-600',
    label:   '집중!',
  },
  focus: {
    wrap:    'border border-emerald-100 bg-white',
    badge:   'bg-emerald-50 text-[#10b981]',
    bar:     'bg-[#10b981]/70',
    accent:  'text-[#10b981]',
    label:   '진행중',
  },
  achieved: {
    wrap:    'border border-gray-100 bg-white',
    badge:   'bg-emerald-100 text-emerald-700',
    bar:     'bg-[#10b981]',
    accent:  'text-[#10b981]',
    label:   '달성!',
  },
  no_target: {
    wrap:    'border border-gray-100 bg-white',
    badge:   'bg-gray-100 text-gray-400',
    bar:     'bg-gray-200',
    accent:  'text-gray-400',
    label:   '목표없음',
  },
}

function fmt(n: number) { return n.toLocaleString('ko-KR') + '원' }

interface Props {
  strategy: CardStrategy
}

export default function CardPortfolioCard({ strategy }: Props) {
  const {
    card_name, nickname, recommended_categories,
    reason, expected_effect, priority,
    spent, target, pct, achieved,
  } = strategy

  const s = PRIORITY_STYLE[priority]
  const label = nickname ?? card_name

  return (
    <div className={`rounded-2xl p-4 ${s.wrap}`}>
      {/* 헤더: 카드명 + 우선순위 배지 */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[15px] font-bold text-gray-900 truncate max-w-[65%]">{label}</p>
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${s.badge}`}>
          {s.label}
        </span>
      </div>

      {/* 추천 사용처 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {recommended_categories.map((cat) => (
          <span
            key={cat}
            className="text-[11px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
          >
            {cat}
          </span>
        ))}
      </div>

      {/* 이유 */}
      <p className={`text-[13px] leading-relaxed mb-1 ${s.accent} font-medium`}>{reason}</p>

      {/* 예상 효과 */}
      <p className="text-[12px] text-gray-400 leading-relaxed mb-3">{expected_effect}</p>

      {/* 실적 프로그레스 바 */}
      {target != null && target > 0 && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] text-gray-400">{fmt(spent)} 사용</span>
            {achieved ? (
              <span className="text-[11px] font-bold text-[#10b981]">✅ 달성!</span>
            ) : (
              <span className="text-[11px] text-gray-400">목표 {fmt(target)}</span>
            )}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${s.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-right text-[11px] text-gray-400 mt-1">{pct}%</p>
        </div>
      )}
    </div>
  )
}
