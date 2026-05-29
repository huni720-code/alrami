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
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
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
  const [showForm, setShowForm] = useState(false)

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
      setSuccess('등록됐어요!')
      setForm((prev) => ({ ...prev, amount: '', description: '' }))
      setShowForm(false)
      loadExpenses()
      setTimeout(() => setSuccess(''), 2000)
    } catch (err: any) {
      setError(err.response?.data?.detail || '등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('삭제할까요?')) return
    await expenseApi.remove(id)
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <Layout>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-extrabold text-gray-900">지출 기록</h2>
          <p className="text-[13px] text-gray-400 mt-0.5">고정지출을 포함한 지출을 기록하세요</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); setError(''); setSuccess('') }}
          className="bg-[#10b981] text-white px-4 py-2 rounded-xl text-[14px] font-semibold"
        >
          + 추가
        </button>
      </div>

      {/* 성공 토스트 */}
      {success && (
        <div className="bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] px-4 py-3 rounded-xl text-[14px] font-semibold mb-4 text-center">
          {success}
        </div>
      )}

      {/* 입력 폼 — 접기/펼치기 */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <h3 className="text-[16px] font-bold text-gray-800 mb-4">새 지출 추가</h3>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-[13px] font-semibold text-gray-500 mb-1.5">얼마 썼어요?</label>
              <div className="flex items-baseline bg-gray-50 rounded-xl px-4 py-3">
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                  min={1}
                  placeholder="0"
                  className="flex-1 text-[22px] font-bold text-gray-900 placeholder:text-gray-300 bg-transparent outline-none"
                />
                <span className="text-[14px] text-gray-400 ml-1">원</span>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-gray-500 mb-1.5">어디서 썼어요?</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, category: c }))}
                    className={`px-3 py-1.5 rounded-full border text-[12px] font-medium transition-colors ${
                      form.category === c
                        ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                        : 'border-gray-200 text-gray-500'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-semibold text-gray-500 mb-1.5">날짜</label>
                <input
                  type="date"
                  value={form.expense_date}
                  onChange={(e) => setForm((p) => ({ ...p, expense_date: e.target.value }))}
                  required
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[14px] text-gray-700 outline-none focus:ring-2 focus:ring-[#10b981]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-500 mb-1.5">메모 (선택)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="메모"
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[14px] text-gray-700 outline-none focus:ring-2 focus:ring-[#10b981]"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-[13px]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#10b981] disabled:bg-gray-100 text-white disabled:text-gray-300 py-3.5 rounded-xl text-[16px] font-bold transition-all active:scale-[0.98]"
            >
              {submitting ? '저장 중...' : '지출 등록'}
            </button>
          </form>
        </div>
      )}

      {/* 지출 목록 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-bold text-gray-800">지출 내역</h3>
          <div className="flex items-center gap-2">
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2 py-1 text-[13px] text-gray-600 outline-none"
            >
              {[2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
            </select>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2 py-1 text-[13px] text-gray-600 outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m}>{m}월</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#10b981]" />
          </div>
        ) : expenses.length === 0 ? (
          <p className="text-gray-400 text-[14px] text-center py-10">이번 달 지출 내역이 없어요</p>
        ) : (
          <>
            <div className="space-y-1">
              {expenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[11px] font-medium">
                        {e.category}
                      </span>
                      {e.description && (
                        <p className="text-[12px] text-gray-400 mt-0.5">{e.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[15px] font-bold text-gray-800">{formatAmount(e.amount)}</p>
                      <p className="text-[11px] text-gray-400">{formatDate(e.expense_date)}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="text-gray-300 hover:text-red-400 text-[12px] transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-[14px] text-gray-500">이번 달 합계</span>
              <span className="text-[18px] font-extrabold text-gray-900">{formatAmount(total)}</span>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
