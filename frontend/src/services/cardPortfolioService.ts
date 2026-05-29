import { recommendationApi } from '../lib/api'
import type { CardPortfolioRecommendation } from '../types/cardPortfolio'

export async function fetchPortfolioRecommendation(): Promise<CardPortfolioRecommendation | null> {
  try {
    const res = await recommendationApi.portfolio()
    return res.data.card_recommendation as CardPortfolioRecommendation
  } catch {
    return null
  }
}
