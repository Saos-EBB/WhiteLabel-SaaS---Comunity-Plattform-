import { useRef, useState } from 'react'

export function useSearch<T>(
  data: T[],
  filterFn: (item: T, query: string) => boolean,
  debounceMs = 300,
) {
  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setActiveQuery(q), debounceMs)
  }

  const filtered = activeQuery.trim()
    ? data.filter(item => filterFn(item, activeQuery.toLowerCase()))
    : data

  return { query, handleChange, filtered }
}
