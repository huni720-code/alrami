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
      {/* 헤더: 카드명 + 회사 */}
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

      {/* 혜택 카테고리 칩 */}
      {matched_categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {matched_categories.map((mc, i) => (
            <span
              key={i}
              className="text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full"
            >
              {mc.reason}
            </span>
          ))}
        </div>
      )}

      {/* 연회비 + net benefit */}
      <div className="flex items-center justify-between text-[11px] text-gray-400">
        <span>연회비 {annual_fee > 0 ? fmt(annual_fee) : '없음'}</span>
        {annual_fee > 0 && (
          <span>연회비 차감 후 월 {fmt(net_monthly_benefit)}</span>
        )}
      </div>

      {/* 자세히 보기 링크 */}
      {apply_url && (
        <a
          href={apply_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block w-full text-center text-[13px] font-semibold text-[#10b981] border border-emerald-200 rounded-xl py-2 active:scale-[0.98] transition-all"
        >
          자세히 보기 →
        </a>
      )}
    </div>
  )
}
