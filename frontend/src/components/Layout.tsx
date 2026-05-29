import Navbar from './Navbar'
import BottomNav from './BottomNav'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단: 데스크탑에서만 풀 메뉴, 모바일은 로고만 */}
      <Navbar />
      {/* 본문: 모바일에서 하단 탭바 높이만큼 패딩 */}
      <main className="max-w-lg mx-auto px-4 py-4 pb-[76px] md:pb-6">
        {children}
      </main>
      {/* 하단 탭바: 모바일 전용 */}
      <BottomNav />
    </div>
  )
}
