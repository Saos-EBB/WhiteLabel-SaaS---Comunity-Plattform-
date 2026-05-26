'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchApi } from '@/lib/api'

interface CityResult {
  id: number
  name: string
  country: string
  region: string | null
  lat: number
  lng: number
}

interface Props {
  value: string
  onSelect: (city: CityResult) => void
  onClear?: () => void
  placeholder?: string
  className?: string
  inputClassName?: string
  ariaLabel?: string
}

export function CityAutocomplete({
  value,
  onSelect,
  onClear,
  placeholder = 'Stadt',
  className,
  inputClassName,
  ariaLabel,
}: Props) {
  const [inputText, setInputText] = useState(value)
  const [results, setResults] = useState<CityResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep inputText in sync when value is changed externally (e.g. reset)
  useEffect(() => {
    setInputText(value)
    if (!value) {
      setResults([])
      setOpen(false)
      setActiveIndex(-1)
    }
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setInputText(q)
    setActiveIndex(-1)
    if (timer.current) clearTimeout(timer.current)
    if (q.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await fetchApi<CityResult[]>(`/cities/search?q=${encodeURIComponent(q.trim())}`)
        setResults(data)
        setActiveIndex(-1)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function handleSelect(city: CityResult) {
    setInputText(city.name)
    setOpen(false)
    setResults([])
    setActiveIndex(-1)
    onSelect(city)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => {
        const next = Math.min(i + 1, results.length - 1)
        itemRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => {
        const next = Math.max(i - 1, 0)
        itemRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        return next
      })
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && results[activeIndex]) {
        handleSelect(results[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  function handleBlur() {
    // Delay so onMouseDown on items fires first
    setTimeout(() => {
      setOpen(false)
      setActiveIndex(-1)
    }, 150)
  }

  // Close on click outside
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div ref={wrapperRef} className={`relative${className ? ` ${className}` : ''}`}>
      <input
        type="text"
        value={inputText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        aria-autocomplete="list"
        aria-expanded={open}
        autoComplete="off"
        className={inputClassName}
      />
      {open && (
        <ul
          role="listbox"
          className="absolute z-[9999] left-0 right-0 top-full mt-1 rounded-xl border border-outline-variant bg-surface-container-high shadow-md overflow-hidden"
        >
          {loading ? (
            <li className="px-4 py-3 text-sm text-on-surface-variant">Suche…</li>
          ) : results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-on-surface-variant">Keine Stadt gefunden</li>
          ) : (
            results.map((city, index) => (
              <li
                key={city.id}
                ref={el => { itemRefs.current[index] = el }}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(city) }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex items-baseline gap-2 px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                  index === activeIndex
                    ? 'bg-primary-fixed-dim/20 text-on-surface'
                    : 'hover:bg-surface-container'
                }`}
              >
                <span className="font-semibold text-on-surface">{city.name}</span>
                <span className="text-xs text-on-surface-variant">
                  {city.region ? `${city.region}, ` : ''}{city.country}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
