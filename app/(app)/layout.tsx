import TopNav from '@/components/nav/TopNav'
import BottomNav from '@/components/nav/BottomNav'
import AuthProvider from '@/components/AuthProvider'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TopNav />
      <main className="pb-16 md:pb-0">{children}</main>
      <BottomNav />
    </AuthProvider>
  )
}
