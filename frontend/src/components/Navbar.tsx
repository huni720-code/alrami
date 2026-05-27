import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/dashboard', label: '대시보드' },
  { to: '/expenses', label: '지출입력' },
  { to: '/alarms', label: '알람관리' },
  { to: '/sms', label: '문자연동' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link to="/dashboard" className="text-xl font-bold text-blue-600">
          알라미
        </Link>
        <div className="flex items-center gap-4">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`text-sm font-medium transition-colors ${
                location.pathname.startsWith(n.to)
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {n.label}
            </Link>
          ))}
          {user?.is_admin && (
            <Link
              to="/admin"
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/admin'
                  ? 'text-emerald-600'
                  : 'text-emerald-500 hover:text-emerald-700'
              }`}
            >
              관리자
            </Link>
          )}
          <span className="text-sm text-gray-500">{user?.username}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700"
          >
            로그아웃
          </button>
        </div>
      </div>
    </nav>
  )
}
