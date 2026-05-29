export interface KpiMonth {
  year: number
  month: number
}

export interface KpiExpense {
  total: number
  count: number
}

export interface KpiCardPerf {
  id: number
  card_name: string
  nickname: string | null
  spent: number
  target: number | null
  remaining: number
  achieved: boolean
  pct: number
}

export interface KpiCardPerfSummary {
  total_spent: number
  total_target: number
  cards_achieved: number
  cards_total: number
}

export interface KpiSaving {
  recommended_monthly: number
  recommended_annual: number
}

export interface KpiContract {
  type: 'telecom' | 'rental'
  label: string
  end_date: string
  days_left: number
  urgent: boolean
}

export interface DashboardKpi {
  month: KpiMonth
  expense: KpiExpense
  card_performance: KpiCardPerf[]
  card_performance_summary: KpiCardPerfSummary
  saving: KpiSaving
  contracts: KpiContract[]
}
