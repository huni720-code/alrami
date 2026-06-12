import { Navigate } from 'react-router-dom'

// DEPRECATED: 카드 추천 완료 화면 제거(동결). 진입 시 약정 그리드로 보냄.
export default function Complete() {
  return <Navigate to="/contracts/grid" replace />
}
