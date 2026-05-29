import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { KpiCardPerf } from '../../types/kpi'
import { buildPortfolioStrategy } from '../../services/cardPortfolioService'
import CardPortfolioCard from './CardPortfolioCard'

const MAX_VISIBLE = 2

interface Props {
  cards: KpiCardPerf[]
  onAddCard: () => void
}

export default function CardPortfolioSection({ cards, onAddCard }: Props) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  if (cards.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <p className="text-[15px] font-bold text-gray-900 mb-1">이번 달 카드 사용 전략</p>
        <p className="text-[13px] text-gray-400 mb-3">
          카드를 등록하면 실적 기반 맞춤 사용 전략을 안내해드려요
        </p>
        <button
          type="button"
          onClick={onAddCard}
          className="w-full bg-emerald-50 text-[#10b981] py-3 rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-all"
        >
          카드 등록하기 →
        </button>
      </div>
    )
  }

  const { strategies, summary } = buildPortfolioStrategy(cards)
  const visible = expanded ? strategies : strategies.slice(0, MAX_VISIBLE)
  const hasMore = strategies.length > MAX_VISIBLE

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[15px] font-bold text-gray-900">이번 달 카드 사용 전략</p>
        <button
          type="button"
          onClick={() => navigate('/my-cards')}
          className="text-[13px] text-[#10b981] font-medium"
        >
          카드 관리 →
        </button>
      </div>

      {/* 요약 */}
      {summary && (
        <p className="text-[13px] text-gray-500 mb-4 leading-relaxed">{summary}</p>
      )}

      {/* 카드 목록 */}
      <div className="space-y-3">
        {visible.map((strategy) => (
          <CardPortfolioCard key={strategy.card_id} strategy={strategy} />
        ))}
      </div>

      {/* 더보기/접기 */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 text-[13px] text-gray-400 py-2 border-t border-gray-50"
        >
          {expanded
            ? '접기 ▲'
            : `나머지 ${strategies.length - MAX_VISIBLE}개 카드 전략 보기 ▼`}
        </button>
      )}

      <p className="text-[10px] text-gray-300 mt-3 text-right">카드 특화 혜택은 카드사 앱에서 확인하세요</p>
    </div>
  )
}
