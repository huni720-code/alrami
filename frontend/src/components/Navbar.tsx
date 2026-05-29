import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CreditCard, Menu, X, Settings, Star } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/* 데스크탑 전용 메뉴 항목 */
const NAV = [
  { to: '/dashboard', label: '홈' },
  { to: '/my-cards', label: '카드실적', icon: 'card' },
  { to: '/recommend', label: '추천', icon: 'star' },
  { to: '/settings', label: '내 정보', icon: 'settings' },
  { to: '/alarms', label: '알람관리' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => {
    logout()
    setOpen(false)
    navigate('/login')
  }

  const handleNav = (to: string) => {
    navigate(to)
    setOpen(false)
  }

  return (
    <>
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-[52px] flex items-center justify-between">
          {/* 로고 */}
          <Link to="/dashboard" className="text-[20px] font-extrabold text-[#10b981] tracking-tight">
            알라미
          </Link>

          {/* 데스크탑: 가로 메뉴 */}
          <div className="hidden md:flex items-center gap-5">
            {NAV.map((n) => {
              const active = location.pathname === n.to
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-1 text-[13px] font-medium transition-colors ${
                    active ? 'text-[#10b981]' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {n.icon === 'card' && <CreditCard size={13} />}
                  {n.icon === 'star' && <Star size={13} />}
                  {n.icon === 'settings' && <Settings size={13} />}
                  {n.label}
                </Link>
              )
            })}
            {user?.is_admin && (
              <Link to="/admin" className="text-[13px] font-medium text-emerald-500 hover:text-emerald-700">
                관리자
              </Link>
            )}
            <span className="text-[13px] text-gray-400">{user?.username}</span>
            <button onClick={handleLogout} className="text-[13px] text-red-400 hover:text-red-600">
              로그아웃
            </button>
          </div>

          {/* 모바일: 햄버거 (보조 — 관리자·로그아웃용) */}
          <button
            className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label="메뉴"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* 모바일 드롭다운 — 보조 기능(관리자·로그아웃) */}
      {open && (
        <>
          <div className="fixed inset-0 z-30 bg-black/10" onClick={() => setOpen(false)} />
          <div className="fixed top-[52px] left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-md md:hidden">
            <div className="max-w-lg mx-auto py-1">
              {user && (
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-[11px] text-gray-400">로그인됨</p>
                  <p className="text-[14px] font-semibold text-gray-800">{user.username}</p>
                </div>
              )}
              {user?.is_admin && (
                <button
                  onClick={() => handleNav('/admin')}
                  className="w-full px-4 py-3.5 text-[14px] font-medium text-emerald-600 hover:bg-emerald-50 text-left"
                >
                  관리자 콘솔
                </button>
              )}
              <div className="border-t border-gray-50">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3.5 text-[14px] font-medium text-red-500 hover:bg-red-50 text-left"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
