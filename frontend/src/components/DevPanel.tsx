import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// 개발 환경에서만 렌더링 — 빌드(배포)하면 자동으로 사라짐
if (!import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__devPanelEnabled = false
}

const PAGES = [
  { label: '🏠 대시보드',       path: '/dashboard' },
  { label: '📋 온보딩',         path: '/onboarding' },
  { label: '🪝 훅 진단',         path: '/hook' },
  { label: '📦 약정 그리드',     path: '/contracts/grid' },
  { label: '💳 카드실적',       path: '/my-cards' },
  { label: '⭐ 추천',           path: '/recommend' },
  { label: '👤 내정보',         path: '/settings' },
  { label: '🔑 로그인',         path: '/login' },
]

export default function DevPanel() {
  // 개발 환경에서만 표시
  if (!import.meta.env.DEV) return null

  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="fixed bottom-20 right-3 z-[9999] md:bottom-4">
      {/* 토글 버튼 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-full bg-gray-900 text-white text-[11px] font-bold shadow-lg flex items-center justify-center"
        title="개발자 패널"
      >
        DEV
      </button>

      {/* 패널 */}
      {open && (
        <div className="absolute bottom-12 right-0 bg-gray-900 rounded-2xl shadow-2xl p-3 w-44">
          <p className="text-[10px] text-gray-500 mb-2 px-1">📍 페이지 이동</p>
          <div className="space-y-1">
            {PAGES.map((p) => (
              <button
                key={p.path}
                type="button"
                onClick={() => { navigate(p.path); setOpen(false) }}
                className="w-full text-left text-[12px] text-gray-200 hover:text-white hover:bg-gray-700 px-2 py-1.5 rounded-lg transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="border-t border-gray-700 mt-2 pt-2">
            <button
              type="button"
              onClick={() => {
                localStorage.clear()
                sessionStorage.clear()
                window.location.href = '/login'
              }}
              className="w-full text-left text-[12px] text-red-400 hover:text-red-300 px-2 py-1.5 rounded-lg"
            >
              🚪 로그아웃 (초기화)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
