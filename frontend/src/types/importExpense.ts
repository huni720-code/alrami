export * from './expenseImport'

// Backend import API types
export interface ImportExpenseItem {
  date: string
  card_company: string | null
  merchant: string
  amount: number
  category: string
  description: string
}

export interface ImportResult {
  saved: number
  errors: number
  total: number
}
