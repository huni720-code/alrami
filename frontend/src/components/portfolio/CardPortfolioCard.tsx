import type { RecommendedCardDetail } from '../../types/cardPortfolio'

function fmt(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

interface Props {
  card: RecommendedCardDetail
}

export default function CardPortfolioCard({ card }: Props) {
  const {
    name, company, annual_fee, apply_url,
    estimated_monthly_benefit, net_monthly_benefit, matched_categories,
  } = card

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      {/* 카드명 + 월 예상 혜택 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <p className="text-[15px] font-bold text-gray-900 truncate">{name}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{company}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[18px] font-extrabold text-[#10b981] leading-none">
            {fmt(estimated_monthly_benefit)}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">월 예상 혜택</p>
        </div>
      </div>

      {/* 카테고리별 혜택 상세 (user_category + reason = rate/type 포함) */}
      {matched_categories.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {matched_categories.map((mc, i) => (
            <div key={i} className="flex items-start justify-between gap-2">
              <span className="shrink-0 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {mc.user_category}
              </span>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-right leading-tight">
                {mc.reason}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 연회비 + 연회비 차감 후 혜택 */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-50">
        <span>연회비 {annual_fee > 0 ? fmt(annual_fee) : '없음'}</span>
        {annual_fee > 0 && (
          <span>차감 후 월 <span className="text-gray-600 font-medium">{fmt(net_monthly_benefit)}</span></span>
        )}
      </div>

      {/* 자세히 보기 (apply_url 있을 때만, 발급 강요 톤 없음) */}
      {apply_url && (
        <a
          href={apply_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block w-full text-center text-[13px] text-[#10b981] border border-emerald-200 rounded-xl py-2 active:scale-[0.98] transition-all"
        >
          자세히 보기 →
        </a>
      )}
    </div>
  )
}
