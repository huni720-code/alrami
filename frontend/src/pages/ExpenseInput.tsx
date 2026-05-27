import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { expenseApi } from '../lib/api'
import type { Expense } from '../lib/api'
import Layout from '../components/Layout'

const CATEGORIES = ['식비', '교통', '쇼핑', '의료', '문화/여가', '주거/통신', '교육', '금융', '기타']

function formatAmount(amount: string | number) {
  return Number(amount).toLocaleString('ko-KR') + '원'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

export default function ExpenseInput() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    amount: '',
    category: '식비',
    description: '',
    expense_date: new Date().toISOString().slice(0, 10),
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const now = new Date()
  const [filterYear, setFilterYear] = useState(now.getFullYear())
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1)

  const loadExpenses = () => {
    setLoading(true)
    expenseApi.list({ year: filterYear, month: filterMonth })
      .then((res) => setExpenses(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadExpenses() }, [filterYear, filterMonth])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await expenseApi.create({
        amount: Number(form.amount),
        category: form.category,
        description: form.description || undefined,
        expense_date: form.expense_date + 'T00:00:00',
      })
      setSuccess('지출이 등록되었습니다.')
      setForm((prev) => ({ ...prev, amount: '', description: '' }))
      loadExpenses()
    } catch (err: any) {
      setError(err.response?.data?.detail || '등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return
    await expenseApi.remove(id)
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <Layout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">지출 입력</h2>

      {/* 입력 폼 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="font-semibold text-gray-700 mb-4">새 지출 등록</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">금액 (원)</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              required
              min={1}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: 15000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
            <select
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
            <input
              type="date"
              value={form.expense_date}
              onChange={(e) => setForm((p) => ({ ...p, expense_date: e.target.value }))}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메모 (선택)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="메모 입력"
            />
          </div>

          {error && (
            <div className="md:col-span-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="md:col-span-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
              {success}
            </div>
          )}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors"
            >
              {submitting ? '등록 중...' : '지출 등록'}
            </button>
          </div>
        </form>
      </div>

      {/* 지출 목록 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-semibold text-gray-700">지출 내역</h3>
          <div className="flex items-center gap-2">
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              {[2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
            </select>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : expenses.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">지출 내역이 없습니다.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2 pr-4">날짜</th>
                    <th className="pb-2 pr-4">카테고리</th>
                    <th className="pb-2 pr-4">메모</th>
                    <th className="pb-2 pr-4 text-right">금액</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 pr-4 text-gray-600">{formatDate(e.expense_date)}</td>
                      <td className="py-2 pr-4">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-500">{e.description || '-'}</td>
                      <td className="py-2 pr-4 text-right font-medium">{formatAmount(e.amount)}</td>
                      <td className="py-2">
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-red-400 hover:text-red-600 text-xs"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
              <span className="font-bold text-gray-800">
                합계: {formatAmount(total)}
              </span>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
