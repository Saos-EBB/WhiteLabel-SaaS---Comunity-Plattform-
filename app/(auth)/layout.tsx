import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Link
            href="/"
            className="text-3xl font-bold text-on-surface tracking-tight"
            aria-label="XXX home"
          >
            XXX
          </Link>
        </div>
        {children}
      </div>
    </div>
  )
}
