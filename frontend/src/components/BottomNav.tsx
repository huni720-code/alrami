import { useLocation, useNavigate } from 'react-router-dom'

const TABS = [
  {
    to: '/dashboard',
    label: '홈',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#10b981' : 'none'}
        stroke={active ? '#10b981' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    to: '/my-cards',
    label: '카드',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#10b981' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: '내 정보',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#10b981' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    to: '/coach',
    label: '코치',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#10b981' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    /* 모바일만 표시 — md 이상은 숨김 */
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-bottom">
      <div className="flex items-stretch h-[60px] max-w-lg mx-auto">
        {TABS.map((tab) => {
          const active = location.pathname === tab.to ||
            (tab.to === '/dashboard' && location.pathname === '/')
          return (
            <button
              key={tab.to}
              type="button"
              onClick={() => navigate(tab.to)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
            >
              {tab.icon(active)}
              <span className={`text-[10px] font-medium ${active ? 'text-[#10b981]' : 'text-gray-400'}`}>
                {tab.label}
              </span>
              {active && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-[#10b981] rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
