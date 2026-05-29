export const EXPENSE_CATEGORIES = [
  '식비', '교통', '쇼핑', '의료', '문화/여가', '주거/통신', '교육', '금융', '기타',
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]

export interface ParsedExpense {
  id: string
  date: string              // YYYY-MM-DD
  card_company: string | null
  merchant: string
  amount: number
  category: ExpenseCategory
  description: string
  raw_line: string          // 원본 줄 (디버그/참고용)
}

export interface ImportParseResult {
  items: ParsedExpense[]
  failed_lines: string[]    // 파싱 실패 줄
}
