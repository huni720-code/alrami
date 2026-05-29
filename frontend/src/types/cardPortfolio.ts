export interface MatchedCategory {
  user_category: string
  benefit_category: string
  benefit_type: string
  rate: number
  monthly_max: number | null
  user_spending: number
  estimated_benefit: number
  reason: string
}

export interface RecommendedCardDetail {
  card_id: number
  name: string
  company: string
  annual_fee: number
  apply_url: string | null
  estimated_monthly_benefit: number
  net_monthly_benefit: number
  matched_categories: MatchedCategory[]
}

export interface CardPortfolioRecommendation {
  cards: RecommendedCardDetail[]
  monthly_benefit: number
  annual_benefit: number
  data_quality: 'actual' | 'estimated'
}
