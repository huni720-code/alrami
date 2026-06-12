import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { userApi, userProfileApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { useToast } from '../components/Toast'

// ── Toggle ─────────────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${on ? 'bg-[#10b981]' : 'bg-gray-200'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

// ── SectionTitle ───────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide px-1 mb-2 mt-1">
      {children}
    </p>
  )
}

// ── EditRow (인라인 편집) ───────────────────────────────────────────────────────

function EditRow({
  label,
  value,
  placeholder,
  inputType = 'text',
  onSave,
}: {
  label: string
  value: string | null
  placeholder: string
  inputType?: string
  onSave: (val: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(value ?? '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const { showToast } = useToast()

  const handleSave = async () => {
    setBusy(true)
    try {
      await onSave(input)
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      // 409(중복 번호) 등 저장 실패 → 토스트로 표시, 편집 상태 유지.
      showToast(e?.response?.data?.detail || '저장에 실패했어요.', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div className="py-3.5 space-y-2">
        <p className="text-[12px] text-gray-400 font-semibold">{label}</p>
        <input
          type={inputType}
          inputMode={inputType === 'tel' ? 'numeric' : 'text'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder={placeholder}
          autoFocus
          className="w-full border-2 border-[#10b981] rounded-xl px-4 py-2.5 text-[15px] outline-none"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleSave}
            className="flex-1 bg-[#10b981] text-white font-bold py-2 rounded-xl text-[14px] disabled:opacity-50"
          >
            {busy ? '저장 중...' : '저장'}
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setInput(value ?? '') }}
            className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-xl text-[14px]"
          >
            취소
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full flex items-center justify-between py-3.5 active:bg-gray-50 rounded-lg transition-colors"
    >
      <span className="text-[15px] text-gray-800">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[14px] text-gray-400 truncate max-w-[150px]">
          {saved ? '저장됐어요 ✓' : (value || placeholder)}
        </span>
        <span className="text-[12px] text-[#10b981] font-semibold flex-shrink-0">변경</span>
      </div>
    </button>
  )
}

// ── 비밀번호 변경 ───────────────────────────────────────────────────────────────

function PasswordChangeSection() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); setError(''); setOpen(false) }

  const handleSave = async () => {
    if (next.length < 8) { setError('새 비밀번호는 8자 이상이어야 해요.'); return }
    if (next !== confirm) { setError('새 비밀번호가 일치하지 않아요.'); return }
    setBusy(true)
    setError('')
    try {
      await userApi.changePassword({ current_password: current, new_password: next })
      setDone(true)
      setTimeout(reset, 2000)
    } catch (e: any) {
      setError(e?.response?.data?.detail || '비밀번호 변경에 실패했어요.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="py-3.5 px-0.5">
        <p className="text-[14px] text-[#10b981] font-semibold">비밀번호가 변경됐어요 ✓</p>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between py-3.5 active:bg-gray-50 rounded-lg transition-colors"
      >
        <span className="text-[15px] text-gray-800">비밀번호 변경</span>
        <span className="text-gray-300 text-[18px] leading-none">›</span>
      </button>
    )
  }

  return (
    <div className="py-3.5 space-y-2.5">
      <p className="text-[13px] font-semibold text-gray-700">비밀번호 변경</p>
      <input
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        placeholder="현재 비밀번호"
        autoFocus
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[15px] outline-none focus:border-[#10b981]"
      />
      <input
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        placeholder="새 비밀번호 (8자 이상)"
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[15px] outline-none focus:border-[#10b981]"
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="새 비밀번호 확인"
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[15px] outline-none focus:border-[#10b981]"
      />
      {error && <p className="text-[12px] text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || !current || !next || !confirm}
          onClick={handleSave}
          className="flex-1 bg-[#10b981] disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold py-2 rounded-xl text-[14px]"
        >
          {busy ? '저장 중...' : '저장'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-xl text-[14px]"
        >
          취소
        </button>
      </div>
    </div>
  )
}

// ── 알림 시점 (백엔드 UserProfile.alarm_days) ───────────────────────────────────
// 각 옵션은 만료일 기준 delta(일). 양수=만료 전, 0=당일, 음수=만료 후.
// 백엔드 스케줄러(alarm_scheduler.CONTRACT_DDAY_TRIGGERS)와 동일한 정수를 저장한다.

const TIMING_OPTIONS = [
  { day: 30, label: '만료 30일 전' },
  { day: 7,  label: '만료 7일 전' },
  { day: 0,  label: '만료일 당일' },
  { day: -7, label: '만료 후 7일' },
]

const DEFAULT_ALARM_DAYS = [30, 7, 0, -7]

function parseAlarmDays(raw: string | null | undefined): number[] {
  if (!raw) return DEFAULT_ALARM_DAYS
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'number')) {
      return parsed
    }
  } catch {}
  return DEFAULT_ALARM_DAYS
}

// ── 회원 탈퇴 확인 ─────────────────────────────────────────────────────────────

function WithdrawSection({ onConfirm }: { onConfirm: () => Promise<void> }) {
  const [step, setStep] = useState<'idle' | 'confirm'>('idle')
  const [busy, setBusy] = useState(false)

  if (step === 'confirm') {
    return (
      <div className="py-3 space-y-2.5">
        <p className="text-[13px] text-gray-500 leading-relaxed">
          탈퇴하면 약정·절감 기록이 모두 삭제되며 복구할 수 없어요.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={async () => { setBusy(true); await onConfirm() }}
            className="flex-1 border-2 border-red-400 text-red-500 font-bold py-2.5 rounded-xl text-[14px] disabled:opacity-50"
          >
            {busy ? '처리 중...' : '탈퇴 확인'}
          </button>
          <button
            type="button"
            onClick={() => setStep('idle')}
            className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-[14px]"
          >
            취소
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setStep('confirm')}
      className="w-full flex items-center justify-between py-3.5 active:bg-gray-50 rounded-lg transition-colors"
    >
      <span className="text-[15px] text-red-400">회원 탈퇴</span>
      <span className="text-gray-300 text-[18px] leading-none">›</span>
    </button>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function ProfileEdit() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [alarmDays, setAlarmDays] = useState<number[]>(DEFAULT_ALARM_DAYS)

  useEffect(() => {
    let cancelled = false
    userProfileApi
      .get()
      .then((res) => {
        if (!cancelled) setAlarmDays(parseAlarmDays(res.data.alarm_days))
      })
      .catch(() => {
        if (!cancelled) setAlarmDays(DEFAULT_ALARM_DAYS)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const toggleTiming = useCallback((day: number) => {
    setAlarmDays((prev) => {
      const has = prev.includes(day)
      const next = has ? prev.filter((d) => d !== day) : [...prev, day]
      // 백엔드에 저장. 정렬해 보기 좋게(만료 전→당일→만료 후).
      const sorted = [...next].sort((a, b) => b - a)
      userProfileApi.update({ alarm_days: JSON.stringify(sorted) }).catch(() => {})
      return sorted
    })
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleWithdraw = async () => {
    try {
      await userApi.deleteMe()
    } catch {
      // backend deactivates account; fall through to logout regardless
    }
    logout()
    navigate('/login')
  }

  return (
    <Layout>
      <div className="max-w-sm mx-auto pb-10">

        {/* 헤더 */}
        <div className="pt-1 pb-5">
          <h1 className="text-[18px] font-extrabold text-[#10b981] tracking-tight">내 정보</h1>
        </div>

        {/* ① 내 정보 */}
        <SectionTitle>내 정보</SectionTitle>
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 mb-5">
          <div className="px-4">
            <EditRow
              label="이름"
              value={user?.username ?? null}
              placeholder="이름을 입력하세요"
              onSave={async (val) => { await userApi.updateMe({ username: val }) }}
            />
          </div>
          <div className="px-4">
            <EditRow
              label="아이디(전화번호)"
              value={user?.phone ?? null}
              placeholder="01012345678"
              inputType="tel"
              onSave={async (val) => { await userApi.updateMe({ phone: val }) }}
            />
          </div>
          <div className="px-4 flex items-center justify-between py-3.5">
            <span className="text-[15px] text-gray-800">이메일</span>
            <span className="text-[14px] text-gray-400 truncate max-w-[200px]">{user?.email}</span>
          </div>
        </div>

        {/* ② 알림 설정 */}
        <SectionTitle>알림 설정</SectionTitle>
        <div className="bg-white rounded-2xl border border-gray-100 mb-5">
          <div className="px-4 py-3.5">
            <p className="text-[12px] text-gray-500 font-semibold mb-3">알림 시점</p>
            <div className="space-y-2.5">
              {TIMING_OPTIONS.map((opt) => {
                const checked = alarmDays.includes(opt.day)
                return (
                  <button
                    key={opt.day}
                    type="button"
                    onClick={() => toggleTiming(opt.day)}
                    className="w-full flex items-center gap-3 py-1 active:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                      checked ? 'bg-[#10b981] border-[#10b981]' : 'border-gray-200'
                    }`}>
                      {checked && (
                        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                          <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[14px] text-gray-700">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 관리자 콘솔 진입 — admin 계정만 */}
        {user?.is_admin && (
          <div className="mb-5">
            <Link
              to="/admin"
              className="w-full flex items-center justify-between bg-gray-900 text-white rounded-2xl px-4 py-3.5 active:opacity-80 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                <span className="text-[15px] font-bold">관리자 콘솔</span>
              </div>
              <span className="text-emerald-400 text-[12px] font-semibold">Admin →</span>
            </Link>
          </div>
        )}

        {/* ③ 계정 */}
        <SectionTitle>계정</SectionTitle>
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 mb-5">

          {/* 비밀번호 변경 — 이메일 가입 유저만 */}
          {user?.auth_provider === 'email' && (
            <div className="px-4">
              <PasswordChangeSection />
            </div>
          )}

          {/* 서비스 이용약관 */}
          <div className="px-4">
            <Link
              to="/terms"
              className="flex items-center justify-between py-3.5 active:bg-gray-50 rounded-lg transition-colors"
            >
              <span className="text-[15px] text-gray-800">서비스 이용약관</span>
              <span className="text-gray-300 text-[18px] leading-none">›</span>
            </Link>
          </div>

          {/* 개인정보처리방침 */}
          <div className="px-4">
            <Link
              to="/privacy"
              className="flex items-center justify-between py-3.5 active:bg-gray-50 rounded-lg transition-colors"
            >
              <span className="text-[15px] text-gray-800">개인정보처리방침</span>
              <span className="text-gray-300 text-[18px] leading-none">›</span>
            </Link>
          </div>

          {/* 로그아웃 */}
          <div className="px-4">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center py-3.5 active:bg-gray-50 rounded-lg transition-colors"
            >
              <span className="text-[15px] text-red-400">로그아웃</span>
            </button>
          </div>

          {/* 회원 탈퇴 */}
          <div className="px-4">
            <WithdrawSection onConfirm={handleWithdraw} />
          </div>
        </div>

      </div>
    </Layout>
  )
}
