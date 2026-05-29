import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CardPortfolioRecommendation } from '../../types/cardPortfolio'
import { fetchPortfolioRecommendation } from '../../services/cardPortfolioService'
import CardPortfolioCard from './CardPortfolioCard'

const MAX_VISIBLE = 2

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ok'; data: CardPortfolioRecommendation }

interface Props {
  onAddCard: () => void
}

export default function CardPortfolioSection({ onAddCard }: Props) {
  const navigate = useNavigate()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetchPortfolioRecommendation().then((result) => {
      if (result) {
        setState({ status: 'ok', data: result })
      } else {
        setState({ status: 'error' })
      }
    })
  }, [])

  /* 로딩 */
  if (state.status === 'loading') {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-100 rounded w-1/2" />
          <div className="h-20 bg-gray-100 rounded-xl" />
          <div className="h-20 bg-gray-100 rounded-xl" />
        </div>
      </div>
    )
  }

  /* API 오류 */
  if (state.status === 'error') {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <p className="text-[15px] font-bold text-gray-900 mb-1">내 소비 맞춤 카드 추천</p>
        <p className="text-[13px] text-gray-400 mb-3">추천 정보를 불러올 수 없습니다</p>
        <button
          type="button"
          onClick={onAddCard}
          className="w-full bg-emerald-50 text-[#10b981] py-3 rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-all"
        >
          내 카드 관리 →
        </button>
      </div>
    )
  }

  const { data } = state

  /* 혜택 데이터 부족 */
  if (data.cards.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <p className="text-[15px] font-bold text-gray-900 mb-1">내 소비 맞춤 카드 추천</p>
        <p className="text-[13px] text-gray-400 mb-1">
          추천 가능한 카드 혜택 데이터가 아직 부족합니다
        </p>
        {data.data_quality === 'estimated' && (
          <p className="text-[12px] text-[#10b981] mb-3">
            소비 데이터가 쌓이면 더 정확해집니다
          </p>
        )}
        <button
          type="button"
          onClick={onAddCard}
          className="w-full bg-emerald-50 text-[#10b981] py-3 rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-all"
        >
          내 카드 관리 →
        </button>
      </div>
    )
  }

  const visible = expanded ? data.cards : data.cards.slice(0, MAX_VISIBLE)
  const hasMore = data.cards.length > MAX_VISIBLE

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-[15px] font-bold text-gray-900">내 소비 맞춤 카드 추천</p>
        <button
          type="button"
          onClick={() => navigate('/my-cards')}
          className="text-[13px] text-[#10b981] font-medium"
        >
          카드 관리 →
        </button>
      </div>

      {/* 기반 데이터 안내 */}
      <p className="text-[11px] text-gray-400 mb-0.5">
        {data.data_quality === 'actual' ? '이번 달 실제 지출 기반' : '소비 패턴 추정 기반'} ·{' '}
        최대 월 예상 혜택{' '}
        <span className="text-[#10b981] font-semibold">
          {data.monthly_benefit.toLocaleString('ko-KR')}원
        </span>
      </p>
      {data.data_quality === 'estimated' ? (
        <p className="text-[11px] text-[#10b981] mb-3">소비 데이터가 쌓이면 더 정확해집니다</p>
      ) : (
        <div className="mb-3" />
      )}

      {/* 카드 목록 */}
      <div className="space-y-3">
        {visible.map((card) => (
          <CardPortfolioCard key={card.card_id} card={card} />
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
            : `나머지 ${data.cards.length - MAX_VISIBLE}개 카드 더 보기 ▼`}
        </button>
      )}

      <p className="text-[10px] text-gray-300 mt-3 text-right">
        예상 혜택은 실제와 다를 수 있습니다
      </p>
    </div>
  )
}
