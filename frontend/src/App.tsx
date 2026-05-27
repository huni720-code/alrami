import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ExpenseInput from './pages/ExpenseInput'
import AlarmList from './pages/AlarmList'
import SmsSettings from './pages/SmsSettings'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <ExpenseInput />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alarms"
        element={
          <ProtectedRoute>
            <AlarmList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sms"
        element={
          <ProtectedRoute>
            <SmsSettings />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
