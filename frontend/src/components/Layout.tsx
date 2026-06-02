import BottomNav from './BottomNav'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-lg mx-auto px-4 py-4 pb-[76px]">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
