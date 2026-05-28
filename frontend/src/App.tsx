import { Routes, Route, Navigate } from 'react-router-dom'
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
import Overview from './pages/admin/Overview'
import Users from './pages/admin/Users'
import Engine from './pages/admin/Engine'
import Data from './pages/admin/Data'
import Notifications from './pages/admin/Notifications'
import Logs from './pages/admin/Logs'

export default function App() {
  return (
    <Routes>
      {/* 공개 라우트 */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />

      {/* 온보딩 (기존) */}
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

      {/* 온보딩 Step 1~4 */}
      <Route path="/onboarding/step1" element={<Step1 />} />
      <Route path="/onboarding/step2" element={<Step2 />} />
      <Route path="/onboarding/step3" element={<ProtectedRoute><Step3 /></ProtectedRoute>} />
      <Route path="/onboarding/complete" element={<ProtectedRoute><Complete /></ProtectedRoute>} />

      {/* 일반 사용자 라우트 */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><ExpenseInput /></ProtectedRoute>} />
      <Route path="/alarms" element={<ProtectedRoute><AlarmList /></ProtectedRoute>} />
      <Route path="/sms" element={<ProtectedRoute><SmsSettings /></ProtectedRoute>} />
      <Route path="/my-cards" element={<ProtectedRoute><MyCards /></ProtectedRoute>} />

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

      {/* 기본 리다이렉트 */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
