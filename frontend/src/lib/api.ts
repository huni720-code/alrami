import axios from 'axios'

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
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// Auth
export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
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

// Types
export interface User {
  id: number
  email: string
  username: string
  is_active: boolean
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
