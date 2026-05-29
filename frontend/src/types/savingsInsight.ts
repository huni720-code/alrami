import type { KpiCardPerf, KpiCardPerfSummary, KpiContract, KpiExpense, KpiMonth, KpiSaving } from './kpi'

// ── 인사이트 생성기 입력 ───────────────────────────────────────
// 모든 값은 기존 KPI API 결과를 그대로 전달. 이 타입 안에서 계산하지 않는다.
export interface InsightInput {
  month: KpiMonth
  expense: KpiExpense
  card_performance: KpiCardPerf[]
  card_performance_summary: KpiCardPerfSummary
  saving: KpiSaving
  contracts: KpiContract[]
}

// ── 인사이트 출력 ─────────────────────────────────────────────
export type InsightLevel = 'urgent' | 'warning' | 'success' | 'info'

export interface SavingsInsight {
  level: InsightLevel
  summary: string           // 한 줄 요약
  recommendation: string    // 추천 행동
  expected_effect: string   // 예상 효과
  caution: string | null    // 주의사항 (없으면 null)
}
