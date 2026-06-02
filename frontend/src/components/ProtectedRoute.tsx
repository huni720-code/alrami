import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode
  adminOnly?: boolean
}) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // 관리자 전용 경로: 비관리자는 홈으로 돌려보냄
  if (adminOnly && !user.is_admin) return <Navigate to="/dashboard" replace />

  // 온보딩 미완료 시 /onboarding 으로 리다이렉트 (/onboarding/* 경로와 어드민 제외)
  if (
    !user.is_admin &&
    !profile?.onboarding_completed &&
    !location.pathname.startsWith('/onboarding')
  ) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
