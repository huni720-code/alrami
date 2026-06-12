import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// 토스트 피드백 — 전역 훅 방식(상태관리 라이브러리 없음).
// 하단 중앙 고정, 1.8초 후 자동 사라짐. 표시 문구만, 로직 없음.

type ToastVariant = 'default' | 'error'

type ToastState = {
  id: number
  message: string
  variant: ToastVariant
  leaving: boolean
}

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const VISIBLE_MS = 1800
const FADE_MS = 220

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const idRef = useRef(0)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const removeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (removeTimer.current) clearTimeout(removeTimer.current)
  }

  const showToast = useCallback((message: string, variant: ToastVariant = 'default') => {
    clearTimers()
    const id = ++idRef.current
    setToast({ id, message, variant, leaving: false })
    hideTimer.current = setTimeout(() => {
      setToast((t) => (t && t.id === id ? { ...t, leaving: true } : t))
      removeTimer.current = setTimeout(() => {
        setToast((t) => (t && t.id === id ? null : t))
      }, FADE_MS)
    }, VISIBLE_MS)
  }, [])

  useEffect(() => () => clearTimers(), [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 pointer-events-none">
          <div
            className={`rounded-full px-5 py-3 text-[14px] font-semibold text-white shadow-lg transition-all duration-200 ${
              toast.variant === 'error' ? 'bg-red-500/95' : 'bg-gray-900/90'
            } ${toast.leaving ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Provider 없을 때도 앱이 죽지 않게 noop fallback
    return { showToast: () => {} }
  }
  return ctx
}
