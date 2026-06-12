import { Navigate } from 'react-router-dom'

// DEPRECATED: 카드/소비 온보딩 스텝 제거(동결). 라우트에서 빠졌고 진입 시 새 온보딩으로 보냄.
export default function Step2() {
  return <Navigate to="/onboarding" replace />
}
