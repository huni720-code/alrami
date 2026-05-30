import { Link } from 'react-router-dom'
import { Zap, CheckCircle } from 'lucide-react'
import type { KpiCardPerf, KpiCardPerfSummary } from '../../types/kpi'

interface Props {
  cards: KpiCardPerf[]
  summary: KpiCardPerfSummary
  onSmsClick: () => void
}

function fmt(n: number) { return n.toLocaleString() }

export default function CardPerformanceSection({ cards, summary, onSmsClick }: Props) {
  const hasTarget = summary.total_target > 0
  const overallPct = hasTarget
    ? Math.min(100, Math.round((summary.total_spent / summary.total_target) * 100))
    : 0

  // 미달성 카드 중 remaining 가장 적은 카드 (가장 달성에 가까운 카드)
  const urgentCard = cards
    .filter((c) => !c.achieved && c.target != null && c.target > 0)
    .sort((a, b) => a.remaining - b.remaining)[0] ?? null

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[15px] font-bold text-gray-900">카드 실적</p>
        <Link to="/my-cards" className="text-[13px] text-[#10b981] font-medium">전체보기 →</Link>
      </div>

      {/* 전체 달성률 Progress Bar */}
      {hasTarget && (
        <div className="mb-5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[13px] text-gray-500">전체 달성률</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">
                {summary.cards_achieved}/{summary.cards_total}개 달성
              </span>
              <span className="text-[14px] font-extrabold text-gray-700">{overallPct}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                overallPct >= 100 ? 'bg-[#10b981]' : overallPct >= 70 ? 'bg-[#10b981]/80' : 'bg-[#10b981]/50'
              }`}
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] text-gray-400">
              {fmt(summary.total_spent)}원 사용
            </span>
            <span className="text-[11px] text-gray-400">
              목표 {fmt(summary.total_target)}원
            </span>
          </div>
        </div>
      )}

      {/* 부족한 실적 하이라이트 */}
      {urgentCard && (
        <div
          className={`rounded-xl px-4 py-3 mb-4 ${
            urgentCard.remaining < 30000 ? 'bg-orange-50 border border-orange-100' : 'bg-emerald-50'
          }`}
        >
          <p className={`text-[11px] font-semibold mb-0.5 flex items-center gap-1 ${
            urgentCard.remaining < 30000 ? 'text-orange-500' : 'text-[#10b981]'
          }`}>
            <Zap size={12} />
            {urgentCard.remaining < 30000 ? '거의 다 됐어요!' : '다음 목표까지'}
          </p>
          <p className="text-[14px] font-bold text-gray-900">
            {urgentCard.nickname ?? urgentCard.card_name}
            {' — '}
            <span className={urgentCard.remaining < 30000 ? 'text-orange-500' : 'text-[#10b981]'}>
              {fmt(urgentCard.remaining)}원 부족
            </span>
          </p>
          {urgentCard.target && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              실적 달성 시 카드 혜택 적용
            </p>
          )}
        </div>
      )}

      {/* 카드별 실적 */}
      <div className="space-y-4">
        {cards.slice(0, 3).map((card) => {
          const label = card.nickname ?? card.card_name
          const cardHasTarget = card.target != null && card.target > 0
          const urgent = cardHasTarget && !card.achieved && card.remaining < 30000

          return (
            <div key={card.id}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[14px] font-semibold text-gray-800 truncate max-w-[55%]">
                  {label}
                </span>
                {cardHasTarget ? (
                  card.achieved ? (
                    <span className="text-[13px] font-bold text-[#10b981] flex items-center gap-1"><CheckCircle size={13} /> 실적 달성!</span>
                  ) : (
                    <span className={`text-[13px] font-medium ${urgent ? 'text-orange-500' : 'text-gray-500'}`}>
                      {fmt(card.spent)} / {fmt(card.target!)}원
                    </span>
                  )
                ) : (
                  <span className="text-[12px] text-gray-300">목표 미설정</span>
                )}
              </div>

              {cardHasTarget && (
                <>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        card.achieved
                          ? 'bg-[#10b981]'
                          : urgent
                          ? 'bg-orange-400'
                          : 'bg-[#10b981]/60'
                      }`}
                      style={{ width: `${card.pct}%` }}
                    />
                  </div>
                  {!card.achieved && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      {urgent
                        ? `${fmt(card.remaining)}원만 더 쓰면 달성!`
                        : `${fmt(card.remaining)}원 더 필요`}
                    </p>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onSmsClick}
        className="w-full mt-4 border border-[#10b981] text-[#10b981] py-2.5 rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-all"
      >
        + 결제 문자 붙여넣기
      </button>
    </div>
  )
}
