// ── 알림 심각도 ───────────────────────────────────────────────
// expired : 이미 종료됨 (days_left <= 0)
// urgent  : 1~7일 이내
// warning : 8~30일 이내
// normal  : 30일 초과
export type AlertSeverity = 'expired' | 'urgent' | 'warning' | 'normal'

// ── 메시지 생성기 입력 ────────────────────────────────────────
// 모든 값은 KPI API / UserProfile에서 직접 전달 — 이 타입 안에서 계산 없음
export interface ContractAlertInput {
  type: 'telecom' | 'rental'
  label: string
  end_date: string
  days_left: number
  carrier: string | null
  monthly_fee: number | null
  estimated_saving: number  // KpiSaving.recommended_monthly 에서 전달
}

// ── 메시지 생성기 출력 ────────────────────────────────────────
export interface ContractAlertMessage {
  severity: AlertSeverity
  headline: string       // 한 줄 요약
  action: string         // 추천 행동
  detail: string | null  // 세부 정보 (월 납부액, 절약액 등) — 없으면 null
}
