// ── 카드 우선순위 ─────────────────────────────────────────────
// urgent    : 실적 목표 대비 잔여 < 50,000원 — 지금 집중 필요
// focus     : 실적 미달성, 잔여 ≥ 50,000원
// achieved  : 이번 달 실적 달성 완료
// no_target : 실적 목표 미설정
export type CardPriority = 'urgent' | 'focus' | 'achieved' | 'no_target'

// ── 카드별 사용 전략 ──────────────────────────────────────────
// 모든 수치(spent, target, remaining, pct)는 KPI API 값을 그대로 전달.
// 이 타입 내부에서 계산하지 않는다.
export interface CardStrategy {
  card_id: number
  card_name: string
  nickname: string | null
  recommended_categories: string[]
  reason: string
  expected_effect: string
  priority: CardPriority
  // KPI 원본 데이터 (pass-through)
  spent: number
  target: number | null
  remaining: number
  achieved: boolean
  pct: number
}

// ── 전체 포트폴리오 전략 ──────────────────────────────────────
export interface CardPortfolioStrategy {
  strategies: CardStrategy[]
  summary: string
}
