import TopNav from '@/components/nav/TopNav'
import BottomNav from '@/components/nav/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <main className="pb-16 md:pb-0">{children}</main>
      <BottomNav />
    </>
  )
}
