import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import OAuthCallback from './pages/OAuthCallback'
import MyCards from './pages/MyCards'
import Dashboard from './pages/Dashboard'
import ExpenseInput from './pages/ExpenseInput'
import AlarmList from './pages/AlarmList'
import SmsSettings from './pages/SmsSettings'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'
import Onboarding from './pages/Onboarding'
import Step1 from './pages/onboarding/Step1'
import Step2 from './pages/onboarding/Step2'
import Step3 from './pages/onboarding/Step3'
import Complete from './pages/onboarding/Complete'
import ProfileEdit from './pages/ProfileEdit'
import ExpenseImport from './pages/ExpenseImport'
import Coach from './pages/Coach'
import Recommend from './pages/Recommend'
import Overview from './pages/admin/Overview'
import Users from './pages/admin/Users'
import Engine from './pages/admin/Engine'
import Data from './pages/admin/Data'
import Notifications from './pages/admin/Notifications'
import Logs from './pages/admin/Logs'

// 로그인 여부에 따라 첫 화면 분기
function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-gray-100 border-t-[#10b981] animate-spin" />
    </div>
  )
  return <Navigate to={user ? '/dashboard' : '/onboarding/step1'} replace />
}

export default function App() {
  return (
    <Routes>
      {/* 공개 라우트 */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />

      {/* 온보딩 (기존) */}
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

      {/* 온보딩: step1~2는 비로그인, step3~complete는 로그인 필요 */}
      <Route path="/onboarding/step1" element={<Step1 />} />
      <Route path="/onboarding/step2" element={<Step2 />} />
      <Route path="/onboarding/step3" element={<ProtectedRoute><Step3 /></ProtectedRoute>} />
      <Route path="/onboarding/complete" element={<ProtectedRoute><Complete /></ProtectedRoute>} />

      {/* 일반 사용자 라우트 */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><ExpenseInput /></ProtectedRoute>} />
      <Route path="/alarms" element={<ProtectedRoute><AlarmList /></ProtectedRoute>} />
      <Route path="/sms" element={<ProtectedRoute><SmsSettings /></ProtectedRoute>} />
      <Route path="/expense-import" element={<ProtectedRoute><ExpenseImport /></ProtectedRoute>} />
      <Route path="/coach" element={<ProtectedRoute><Coach /></ProtectedRoute>} />
      <Route path="/my-cards" element={<ProtectedRoute><MyCards /></ProtectedRoute>} />
      <Route path="/recommend" element={<ProtectedRoute><Recommend /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />

      {/* 관리자 콘솔 (중첩 라우트) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="users" element={<Users />} />
        <Route path="engine" element={<Engine />} />
        <Route path="data" element={<Data />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="logs" element={<Logs />} />
      </Route>

      {/* 기본 리다이렉트: 로그인 여부에 따라 분기 */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
