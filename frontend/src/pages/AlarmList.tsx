import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { alarmApi } from '../lib/api'
import type { Alarm, AlarmCreateInput } from '../lib/api'
import Layout from '../components/Layout'

const DAYS = ['월', '화', '수', '목', '금', '토', '일']

export default function AlarmList() {
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<AlarmCreateInput>({
    title: '',
    description: '',
    alarm_time: '08:00',
    days_of_week: [0, 1, 2, 3, 4],
    is_active: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    alarmApi.list().then((res) => setAlarms(res.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggleDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day].sort(),
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await alarmApi.create(form)
      setShowForm(false)
      setForm({ title: '', description: '', alarm_time: '08:00', days_of_week: [0, 1, 2, 3, 4], is_active: true })
      load()
    } catch (err: any) {
      setError(err.response?.data?.detail || '알람 생성에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (alarm: Alarm) => {
    await alarmApi.update(alarm.id, { is_active: !alarm.is_active })
    setAlarms((prev) => prev.map((a) => a.id === alarm.id ? { ...a, is_active: !a.is_active } : a))
  }

  const handleDelete = async (id: number) => {
    if (!confirm('알람을 삭제하시겠습니까?')) return
    await alarmApi.remove(id)
    setAlarms((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">알람 관리</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? '취소' : '+ 알람 추가'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">새 알람 추가</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">알람 제목</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 아침 기상"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시간</label>
                <input
                  type="time"
                  value={form.alarm_time}
                  onChange={(e) => setForm((p) => ({ ...p, alarm_time: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">반복 요일</label>
              <div className="flex gap-2">
                {DAYS.map((day, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                      form.days_of_week.includes(idx)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">메모 (선택)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="알람 메모"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors"
            >
              {submitting ? '저장 중...' : '알람 저장'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : alarms.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">등록된 알람이 없습니다.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {alarms.map((alarm) => (
              <div key={alarm.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleActive(alarm)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      alarm.is_active ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        alarm.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <div>
                    <p className="font-medium text-gray-800">{alarm.title}</p>
                    <p className="text-sm text-gray-500">
                      {alarm.alarm_time.slice(0, 5)} · {alarm.days_of_week.map((d) => DAYS[d]).join(' ')}
                      {alarm.description && ` · ${alarm.description}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(alarm.id)}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
