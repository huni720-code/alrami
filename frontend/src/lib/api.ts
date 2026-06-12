import axios from 'axios'
import type { DashboardKpi } from '../types/kpi'
import type { ImportExpenseItem, ImportResult } from '../types/importExpense'

export type { DashboardKpi }

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // /auth/login, /auth/register 요청 실패는 인터셉터에서 처리하지 않음
    const url = err.config?.url ?? ''
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register')
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// Auth
export const authApi = {
  // 식별자(아이디) = 전화번호(필수). 이메일은 선택.
  register: (data: { phone: string; username: string; email?: string; password: string }) =>
    api.post('/auth/register', data),
  // identifier: 전화번호 또는 이메일 둘 다 허용(백엔드가 '@'로 구분).
  login: (data: { identifier: string; password: string }) =>
    api.post('/auth/login', data),
  forgotPassword: (data: { phone: string }) =>
    api.post<{ message: string }>('/auth/forgot-password', data),
  resetPassword: (data: { phone: string; code: string; new_password: string }) =>
    api.post<{ message: string }>('/auth/reset-password', data),
  me: () => api.get('/users/me'),
}

// Alarms
export const alarmApi = {
  list: () => api.get('/alarms/'),
  create: (data: AlarmCreateInput) => api.post('/alarms/', data),
  update: (id: number, data: Partial<AlarmCreateInput>) => api.patch(`/alarms/${id}`, data),
  remove: (id: number) => api.delete(`/alarms/${id}`),
}

// Expenses
export const expenseApi = {
  list: (params?: { year?: number; month?: number }) => api.get('/expenses/', { params }),
  summary: (params?: { year?: number; month?: number }) => api.get('/expenses/summary', { params }),
  create: (data: ExpenseCreateInput) => api.post('/expenses/', data),
  update: (id: number, data: Partial<ExpenseCreateInput>) => api.patch(`/expenses/${id}`, data),
  remove: (id: number) => api.delete(`/expenses/${id}`),
}

// User Profile
export interface UserProfile {
  telecom_carrier: string | null
  telecom_monthly_fee: number | null
  contract_end_date: string | null
  card_monthly_total: number | null
  has_ott: boolean
  has_rental: boolean
  rental_end_date: string | null
  alarm_days: string
  onboarding_completed: boolean
}

export interface UserProfileUpdate {
  telecom_carrier?: string | null
  telecom_monthly_fee?: number | null
  contract_end_date?: string | null
  card_monthly_total?: number | null
  has_ott?: boolean
  has_rental?: boolean
  rental_end_date?: string | null
  alarm_days?: string
  onboarding_completed?: boolean
}

export const userProfileApi = {
  get: () => api.get<UserProfile>('/users/me/profile'),
  update: (data: UserProfileUpdate) => api.patch<UserProfile>('/users/me/profile', data),
}

// Types
export interface User {
  id: number
  email: string
  username: string
  phone: string | null
  is_active: boolean
  is_admin: boolean
  auth_provider: string
  created_at: string
}

export interface Alarm {
  id: number
  title: string
  description: string | null
  alarm_time: string
  days_of_week: number[]
  is_active: boolean
  user_id: number
  created_at: string
  updated_at: string
}

export interface AlarmCreateInput {
  title: string
  description?: string
  alarm_time: string
  days_of_week: number[]
  is_active?: boolean
}

export interface Expense {
  id: number
  amount: string
  category: string
  description: string | null
  expense_date: string
  user_id: number
  created_at: string
}

export interface ExpenseCreateInput {
  amount: number
  category: string
  description?: string
  expense_date: string
}

export interface ExpenseSummary {
  total: string
  by_category: Record<string, string>
  count: number
}

// Admin
export const adminApi = {
  // 크롤링
  triggerCrawl: (target: string) => api.post(`/admin/crawl/${target}`),
  listTasks: () => api.get('/admin/crawl/tasks'),
  getTask: (taskId: number) => api.get(`/admin/crawl/tasks/${taskId}`),
  approveTask: (taskId: number) => api.post(`/admin/crawl/tasks/${taskId}/approve`),
  listCrawlHistory: () => api.get('/admin/crawl/history'),
  getData: (type: 'cards' | 'telecom') => api.get(`/admin/data/${type}`),
  deleteData: (type: string, id: number) => api.delete(`/admin/data/${type}/${id}`),
  // KPI
  getStats: () => api.get('/admin/stats'),
  // 사용자
  listUsers: (params?: { search?: string }) => api.get('/admin/users', { params }),
  updateUser: (id: number, data: { is_active?: boolean; is_admin?: boolean }) =>
    api.patch(`/admin/users/${id}`, data),
  // 알림
  listAllAlarms: () => api.get('/admin/alarms'),
  // 로그
  listLogs: (params?: { action?: string }) => api.get('/admin/logs', { params }),
  // 벤치마크
  calculateBenchmarks: () => api.post('/admin/benchmarks/calculate'),
  saveBenchmarks: (items: BenchmarkItem[]) => api.post('/admin/benchmarks/save', { items }),
  getBenchmarks: () => api.get('/admin/benchmarks'),
}

// Admin types
export interface AdminStats {
  users_total: number
  users_new_7d: number
  contracts_active: number
  contracts_expiring_30d: number
  alarms_active: number
  switches_total: number
  switches_saving_annual: number
  logs_today: number
}

export interface AdminUser {
  id: number
  email: string
  username: string
  is_active: boolean
  is_admin: boolean
  created_at: string
  expense_count: number
  alarm_count: number
}

export interface AdminAlarm {
  id: number
  title: string
  alarm_time: string
  days_of_week: number[]
  is_active: boolean
  user_id: number
  user_email: string
  username: string
}

export interface AdminLogEntry {
  id: string
  action: string
  target_type: string | null
  target_id: number | null
  detail: Record<string, unknown> | null
  performed_by_email: string
  created_at: string
}

export interface CrawlDiffSummary {
  added: number
  removed: number
  modified: number
}

export interface CrawlHistoryEntry {
  id: number
  target: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  record_count: number | null
  approved: boolean
  diff_summary: CrawlDiffSummary | null
  error_message: string | null
  created_at: string
  completed_at: string | null
  created_by_email: string
}

export interface BenchmarkItem {
  benchmark_type: 'card' | 'telecom'
  label: string
  spending_monthly: number | null
  saving_monthly: number
  saving_annual: number
  best_strategy: Record<string, unknown> | null
}

export interface SavedBenchmark extends BenchmarkItem {
  id: number
  calculated_at: string
}

// Recommendation types
export interface QuickEstimate {
  input_amount: number
  card_saving_monthly: number
  telecom_saving_monthly: number
  total_saving_monthly: number
  total_saving_annual: number
  matched_bracket: string
}

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

export interface RecommendedCard {
  card_id: number
  name: string
  company: string
  annual_fee: number
  apply_url: string | null
  estimated_monthly_benefit: number
  net_monthly_benefit: number
  matched_categories: MatchedCategory[]
}

export interface CardRecommendation {
  cards: RecommendedCard[]
  monthly_benefit: number
  annual_benefit: number
  data_quality: 'actual' | 'estimated'
}

export interface TelecomRecommendedPlan {
  carrier: string
  plan_name: string
  monthly_fee: number
}

export interface TelecomRecommendation {
  current_fee: number
  recommended_plan: TelecomRecommendedPlan
  monthly_saving: number
  annual_saving: number
}

export interface Portfolio {
  card_recommendation: CardRecommendation
  telecom_recommendation: TelecomRecommendation | null
  total_monthly_saving: number
  total_annual_saving: number
}

export interface TelecomEstimate {
  current_fee: number
  saving_monthly: number
  saving_annual: number
  label: string
  // 결정 카드: 선택약정 할인 소멸/재약정 시나리오 (백엔드 계산)
  lapse_monthly: number
  lapse_increase_monthly: number
  reattach_monthly: number
  assumption: string
}

export const recommendationApi = {
  quickEstimate: (amount: number) =>
    api.get<QuickEstimate>('/recommendations/quick-estimate', { params: { amount } }),
  telecomEstimate: (currentFee: number) =>
    api.get<TelecomEstimate>('/recommendations/telecom-estimate', { params: { current_fee: currentFee } }),
  portfolio: () => api.get<Portfolio>('/recommendations/portfolio'),
}

export const userApi = {
  getProfile: () => api.get<UserProfile>('/users/me/profile'),
  updateProfile: (data: UserProfileUpdate) => api.patch<UserProfile>('/users/me/profile', data),
  updateMe: (data: { phone?: string; username?: string }) => api.patch<User>('/users/me', data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.patch('/users/me/password', data),
  deleteMe: () => api.delete('/users/me'),
}

// MyCards types
export interface MyCard {
  id: number
  card_id: number
  card_name: string
  card_company: string
  nickname: string | null
  last_4_digits: string | null
  performance_target: number | null
  this_month_spent: number
  remaining: number
  achieved: boolean
}

export interface CardCatalogItem {
  id: number
  name: string
  company: string
  annual_fee: number
}

export interface SmsParseResult {
  parsed: {
    card_company: string
    amount: number
    merchant: string | null
  }
  matched_card: {
    card_name: string
    this_month_spent: number
    performance_target: number
    remaining: number
    achieved: boolean
  } | null
  message: string
}

export interface CardTransaction {
  id: number
  user_card_id: number | null
  card_name: string | null
  amount: number
  merchant: string | null
  transaction_at: string
}

export const dashboardApi = {
  kpi: () => api.get<DashboardKpi>('/dashboard/kpi'),
}

export const importApi = {
  bulkSave: (items: ImportExpenseItem[]) =>
    api.post<ImportResult>('/import/expenses', { items }),
}

// ── Contract (약정 watchdog) ─────────────────────────────────

export interface ContractResponse {
  id: number
  category: string
  provider: string
  start_date: string | null
  term_months: number | null
  monthly_fee: number | null
  penalty_fee: number | null
  device_subsidy: number | null
  owner_label: string | null
  end_date: string
  accuracy: 'estimated' | 'confirmed'
  is_active: boolean
  dday: number
  status: '여유' | '점검' | '임박' | '지남'
}

export interface ContractCreateInput {
  category: string
  provider: string
  start_date?: string       // YYYY-MM-DD (start+term 경로)
  term_months?: number
  end_date?: string         // YYYY-MM-DD (confirmed 직접 입력 경로)
  monthly_fee?: number
  penalty_fee?: number
  device_subsidy?: number
  owner_label?: string
  accuracy?: 'estimated' | 'confirmed'
}

export interface ContractUpdateInput {
  category?: string
  provider?: string
  start_date?: string
  term_months?: number
  end_date?: string         // confirmed 승격 시 직접 override
  monthly_fee?: number
  penalty_fee?: number
  device_subsidy?: number
  owner_label?: string | null
  accuracy?: 'estimated' | 'confirmed'
  is_active?: boolean
}

export interface ContractEstimate {
  end_date: string
  dday: number
}

export interface ProviderInfo {
  provider: string
  short_number: string | null
  center_number: string | null
  app_name: string | null
  check_path: string | null
  category_hint: string | null
}

export const contractApi = {
  list: (activeOnly = true) =>
    api.get<ContractResponse[]>('/contracts', { params: { active_only: activeOnly } }),
  create: (data: ContractCreateInput) =>
    api.post<ContractResponse>('/contracts', data),
  update: (id: number, data: ContractUpdateInput) =>
    api.patch<ContractResponse>(`/contracts/${id}`, data),
  remove: (id: number) =>
    api.delete(`/contracts/${id}`),
  estimate: (startDate: string, termMonths: number) =>
    api.get<ContractEstimate>('/contracts/estimate', {
      params: { start_date: startDate, term_months: termMonths },
    }),
  providerInfo: (provider?: string) =>
    api.get<ProviderInfo[]>('/contracts/provider-info', {
      params: provider ? { provider } : undefined,
    }),
}

// Switch Logs (전환기록)
export interface SwitchLogCreate {
  contract_id?: number
  category: string
  provider: string
  switched: boolean
  estimated_saving_annual?: number
}

export interface SwitchLogResponse {
  id: number
  contract_id: number | null
  category: string
  provider: string
  switched: boolean
  estimated_saving_annual: number | null
  switched_at: string
}

export interface SwitchLogSummary {
  switch_count: number
  total_saving_annual: number
}

export const switchLogApi = {
  create: (data: SwitchLogCreate) =>
    api.post<SwitchLogResponse>('/switch-logs', data),
  list: () =>
    api.get<SwitchLogResponse[]>('/switch-logs'),
  summary: () =>
    api.get<SwitchLogSummary>('/switch-logs/summary'),
}

export const myCardsApi = {
  list: () => api.get<MyCard[]>('/my-cards'),
  cardCatalog: () => api.get<CardCatalogItem[]>('/my-cards/card-catalog'),
  add: (data: {
    card_id: number
    nickname?: string
    last_4_digits?: string
    performance_target?: number
  }) => api.post<MyCard>('/my-cards', data),
  remove: (userCardId: number) => api.delete(`/my-cards/${userCardId}`),
  parseSms: (raw_sms: string) => api.post<SmsParseResult>('/my-cards/parse-sms', { raw_sms }),
  transactions: (year: number, month: number) =>
    api.get<CardTransaction[]>('/my-cards/transactions', { params: { year, month } }),
}
