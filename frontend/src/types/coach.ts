import type { DashboardKpi } from '../lib/api'

export type MessageRole = 'user' | 'coach'

export interface CoachMessage {
  id: string
  role: MessageRole
  text: string
  timestamp: string  // ISO string
}

// ── 코치 컨텍스트 ─────────────────────────────────────────────
// 모든 수치는 KPI API 결과를 그대로 전달. 이 타입 내부에서 계산하지 않는다.
export interface CoachContext {
  kpi: DashboardKpi
}
