import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ExpenseInput from './pages/ExpenseInput'
import AlarmList from './pages/AlarmList'
import SmsSettings from './pages/SmsSettings'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'
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

      {/* 일반 사용자 라우트 */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><ExpenseInput /></ProtectedRoute>} />
      <Route path="/alarms" element={<ProtectedRoute><AlarmList /></ProtectedRoute>} />
      <Route path="/sms" element={<ProtectedRoute><SmsSettings /></ProtectedRoute>} />

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
