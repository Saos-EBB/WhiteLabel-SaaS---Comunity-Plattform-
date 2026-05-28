import { Loader2 } from 'lucide-react'

const SIZE: Record<number, string> = { 3: 'h-3 w-3', 4: 'h-4 w-4', 5: 'h-5 w-5', 6: 'h-6 w-6' }

export function Spinner({ size = 5 }: { size?: 3 | 4 | 5 | 6 }) {
  return <Loader2 className={`${SIZE[size]} text-on-surface-variant animate-spin`} aria-hidden="true" />
}
