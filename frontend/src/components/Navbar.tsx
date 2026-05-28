import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CreditCard, Menu, X, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/dashboard', label: '대시보드' },
  { to: '/my-cards', label: '카드실적', icon: 'card' },
  { to: '/expenses', label: '지출입력' },
  { to: '/alarms', label: '알람관리' },
  { to: '/sms', label: '문자연동' },
  { to: '/settings', label: '내 정보 수정', icon: 'settings' },
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
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="text-xl font-bold text-[#10b981]">
            알라미
          </Link>

          {/* 데스크탑: 가로 메뉴 */}
          <div className="hidden md:flex items-center gap-4">
            {NAV.map((n) => {
              const active = location.pathname.startsWith(n.to)
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                    active ? 'text-[#10b981]' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {n.icon === 'card' && <CreditCard size={14} />}
                  {n.icon === 'settings' && <Settings size={14} />}
                  {n.label}
                </Link>
              )
            })}
            {user?.is_admin && (
              <Link to="/admin" className="text-sm font-medium text-emerald-500 hover:text-emerald-700">
                관리자
              </Link>
            )}
            <span className="text-sm text-gray-400">{user?.username}</span>
            <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-600">
              로그아웃
            </button>
          </div>

          {/* 모바일: 햄버거 버튼 */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label="메뉴"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* 모바일 드롭다운 메뉴 */}
      {open && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 z-30 bg-black/20"
            onClick={() => setOpen(false)}
          />
          {/* 메뉴 패널 */}
          <div className="fixed top-[53px] left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-lg md:hidden">
            <div className="max-w-lg mx-auto py-2">
              {/* 사용자 정보 */}
              {user && (
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs text-gray-400">로그인됨</p>
                  <p className="text-sm font-semibold text-gray-800">{user.username}</p>
                </div>
              )}

              {/* 메뉴 항목 */}
              {NAV.map((n) => {
                const active = location.pathname.startsWith(n.to)
                return (
                  <button
                    key={n.to}
                    onClick={() => handleNav(n.to)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors text-left ${
                      active ? 'text-[#10b981] bg-emerald-50' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {n.icon === 'card' && <CreditCard size={16} className="text-gray-400" />}
                    {n.icon === 'settings' && <Settings size={16} className="text-gray-400" />}
                    {!n.icon && <span className="w-4" />}
                    {n.label}
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#10b981]" />}
                  </button>
                )
              })}

              {user?.is_admin && (
                <button
                  onClick={() => handleNav('/admin')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 text-left"
                >
                  <span className="w-4" />
                  관리자 콘솔
                </button>
              )}

              {/* 로그아웃 */}
              <div className="border-t border-gray-100 mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-red-500 hover:bg-red-50 text-left"
                >
                  <span className="w-4" />
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
