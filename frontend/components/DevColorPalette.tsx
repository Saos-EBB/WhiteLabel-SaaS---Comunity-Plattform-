'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ── CSS variable definitions ──────────────────────────────────────────────
const CSS_GROUPS: { label: string; vars: { name: string; label: string }[] }[] = [
  {
    label: 'Background',
    vars: [{ name: '--color-background', label: 'Background' }],
  },
  {
    label: 'Surfaces',
    vars: [
      { name: '--color-surface-container-lowest',  label: 'Container Lowest' },
      { name: '--color-surface-container-low',     label: 'Container Low' },
      { name: '--color-surface-container',         label: 'Container' },
      { name: '--color-surface-container-high',    label: 'Container High' },
      { name: '--color-surface-container-highest', label: 'Container Highest' },
    ],
  },
  {
    label: 'Text',
    vars: [
      { name: '--color-on-surface',         label: 'On Surface' },
      { name: '--color-on-surface-variant', label: 'On Surface Variant' },
    ],
  },
  {
    label: 'Primary',
    vars: [
      { name: '--color-primary-fixed-dim',      label: 'Primary Accent' },
      { name: '--color-primary-container',      label: 'Primary Container' },
      { name: '--color-on-primary-container',   label: 'On Primary Container' },
    ],
  },
  {
    label: 'Secondary & Tertiary',
    vars: [
      { name: '--color-secondary-container', label: 'Secondary Container' },
      { name: '--color-tertiary-fixed-dim',  label: 'Tertiary Accent' },
    ],
  },
  {
    label: 'Borders',
    vars: [
      { name: '--color-outline',         label: 'Outline' },
      { name: '--color-outline-variant', label: 'Outline Variant' },
    ],
  },
  {
    label: 'Error',
    vars: [
      { name: '--color-error',           label: 'Error' },
      { name: '--color-error-container', label: 'Error Container' },
    ],
  },
  {
    label: 'Nav Badges',
    vars: [
      { name: '--color-nav-badge-glow', label: 'Badge Glow' },
    ],
  },
  {
    label: 'Actions',
    vars: [
      { name: '--color-logout', label: 'Abmelden Button' },
    ],
  },
]

const ALL_VARS = CSS_GROUPS.flatMap(g => g.vars.map(v => v.name))

const PRESETS = [
  { label: 'dark',  cls: '' },
  { label: 'light', cls: 'light' },
  { label: 'brick', cls: 'underground-brick' },
  { label: 'neon',  cls: 'underground-neon' },
]

// ── Helpers ───────────────────────────────────────────────────────────────
function rgbToHex(rgb: string): string | null {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return null
  return (
    '#' +
    [m[1], m[2], m[3]]
      .map(n => parseInt(n).toString(16).padStart(2, '0'))
      .join('')
  )
}

function normaliseHex(val: string): string {
  const v = val.trim().toLowerCase()
  // Already a valid 6-digit hex
  if (/^#[0-9a-f]{6}$/.test(v)) return v
  // 3-digit shorthand
  if (/^#[0-9a-f]{3}$/.test(v)) {
    return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]
  }
  return '#000000'
}

function readAllVars(): Record<string, string> {
  const style = getComputedStyle(document.documentElement)
  const out: Record<string, string> = {}
  for (const name of ALL_VARS) {
    out[name] = normaliseHex(style.getPropertyValue(name))
  }
  return out
}

// ── Inner component (hooks always run in dev) ─────────────────────────────
function Inner() {
  const [open,          setOpen]          = useState(false)
  const [pickMode,      setPickMode]      = useState(false)
  const [values,        setValues]        = useState<Record<string, string>>({})
  const [pickedColors,  setPickedColors]  = useState<{ bg: string | null; text: string | null; border: string | null } | null>(null)
  const [highlighted,   setHighlighted]   = useState<Set<string>>(new Set())
  const [savedThemes,   setSavedThemes]   = useState<Record<string, Record<string, string>>>({})
  const [saveName,      setSaveName]      = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [copied,        setCopied]        = useState(false)
  const hoveredElRef = useRef<HTMLElement | null>(null)

  const refresh = useCallback(() => setValues(readAllVars()), [])

  useEffect(() => { if (open) refresh() }, [open, refresh])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dev-color-themes')
      if (raw) setSavedThemes(JSON.parse(raw))
    } catch {}
  }, [])

  // ── Setters ──────────────────────────────────────────────────────────────
  const setVar = (name: string, value: string) => {
    document.documentElement.style.setProperty(name, value)
    setValues(prev => ({ ...prev, [name]: value }))
  }

  const resetAll = () => {
    ALL_VARS.forEach(n => document.documentElement.style.removeProperty(n))
    setTimeout(refresh, 0)
    setPickedColors(null)
    setHighlighted(new Set())
  }

  const applyPreset = (cls: string) => {
    PRESETS.forEach(p => { if (p.cls) document.documentElement.classList.remove(p.cls) })
    if (cls) document.documentElement.classList.add(cls)
    resetAll()
  }

  const applyCustomTheme = (theme: Record<string, string>) => {
    resetAll()
    for (const [name, value] of Object.entries(theme)) {
      document.documentElement.style.setProperty(name, value)
    }
    setValues(theme)
  }

  const saveTheme = () => {
    if (!saveName.trim()) return
    const theme = readAllVars()
    const updated = { ...savedThemes, [saveName.trim()]: theme }
    setSavedThemes(updated)
    localStorage.setItem('dev-color-themes', JSON.stringify(updated))
    setSaveName('')
    setShowSaveInput(false)
  }

  const deleteTheme = (name: string) => {
    const updated = { ...savedThemes }
    delete updated[name]
    setSavedThemes(updated)
    localStorage.setItem('dev-color-themes', JSON.stringify(updated))
  }

  const exportCSS = async () => {
    const current = readAllVars()
    const lines = ALL_VARS.map(n => `  ${n}: ${current[n]};`)
    await navigator.clipboard.writeText(`.my-theme {\n${lines.join('\n')}\n}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // ── Element Picker ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pickMode) return

    document.body.style.cursor = 'crosshair'

    const onOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('[data-dev-palette]')) return
      if (hoveredElRef.current && hoveredElRef.current !== el) {
        hoveredElRef.current.style.outline = ''
        hoveredElRef.current.style.outlineOffset = ''
      }
      el.style.outline = '2px dashed #a78bfa'
      el.style.outlineOffset = '2px'
      hoveredElRef.current = el
    }

    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('[data-dev-palette]')) return
      e.preventDefault()
      e.stopPropagation()

      // Clean up highlight
      el.style.outline = ''
      el.style.outlineOffset = ''
      hoveredElRef.current = null

      const computed = getComputedStyle(el)
      const bg     = rgbToHex(computed.backgroundColor)
      const text   = rgbToHex(computed.color)
      const border = rgbToHex(computed.borderColor)

      setPickedColors({ bg, text, border })

      // Find matching vars
      const currentVars = readAllVars()
      const matched = new Set<string>()
      for (const [varName, varVal] of Object.entries(currentVars)) {
        if (bg && varVal === bg)     matched.add(varName)
        if (text && varVal === text) matched.add(varName)
        if (border && varVal === border) matched.add(varName)
      }
      setHighlighted(matched)
      setPickMode(false)
    }

    document.addEventListener('mouseover', onOver)
    document.addEventListener('click', onClick, true)

    return () => {
      document.body.style.cursor = ''
      if (hoveredElRef.current) {
        hoveredElRef.current.style.outline = ''
        hoveredElRef.current.style.outlineOffset = ''
        hoveredElRef.current = null
      }
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('click', onClick, true)
    }
  }, [pickMode])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div data-dev-palette className="fixed bottom-44 right-4 z-[9997] flex flex-col items-end gap-2 select-none">
      {open && (
        <div
          data-dev-palette
          className="flex flex-col w-72 max-h-[72vh] rounded-2xl shadow-2xl overflow-hidden border border-violet-500/30"
          style={{ background: 'var(--color-surface-container)' }}
        >
          {/* ── Sticky header ── */}
          <div
            data-dev-palette
            className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between border-b border-violet-500/20"
            style={{ background: 'var(--color-surface-container-high)' }}
          >
            <span className="text-xs font-bold tracking-wider" style={{ color: '#a78bfa' }}>
              🎨 Dev Colors
            </span>
            <div className="flex gap-1">
              <button
                data-dev-palette
                onClick={() => { setPickMode(p => !p); if (open) refresh() }}
                title="Klick auf ein Element um seine Farben zu sehen"
                className="text-[11px] px-2 py-1 rounded-lg font-medium transition-all"
                style={{
                  background: pickMode ? '#7c3aed' : 'var(--color-surface-container-highest)',
                  color: pickMode ? '#fff' : 'var(--color-on-surface-variant)',
                }}
              >
                {pickMode ? '✕ picking…' : '🖱 pick'}
              </button>
              <button
                data-dev-palette
                onClick={resetAll}
                title="Alle Inline-Overrides entfernen"
                className="text-[11px] px-2 py-1 rounded-lg transition-colors"
                style={{ background: 'var(--color-surface-container-highest)', color: 'var(--color-on-surface-variant)' }}
              >
                reset
              </button>
              <button
                data-dev-palette
                onClick={exportCSS}
                title="CSS in Zwischenablage kopieren"
                className="text-[11px] px-2 py-1 rounded-lg transition-colors"
                style={{ background: 'var(--color-surface-container-highest)', color: copied ? '#4ade80' : 'var(--color-on-surface-variant)' }}
              >
                {copied ? '✓' : 'copy'}
              </button>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div data-dev-palette className="overflow-y-auto flex flex-col gap-5 p-4">

            {/* Picked element display */}
            {pickedColors && (
              <div data-dev-palette className="rounded-xl p-3 flex flex-col gap-2 border border-violet-500/20"
                style={{ background: 'var(--color-surface-container-high)' }}>
                <p className="text-[11px] font-semibold" style={{ color: '#a78bfa' }}>Picked element</p>
                <div className="flex gap-3 flex-wrap">
                  {[
                    { label: 'bg',     color: pickedColors.bg },
                    { label: 'text',   color: pickedColors.text },
                    { label: 'border', color: pickedColors.border },
                  ].filter(c => c.color).map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-md border border-white/10 flex-shrink-0"
                        style={{ backgroundColor: color! }}
                      />
                      <div>
                        <p className="text-[9px] leading-none" style={{ color: 'var(--color-on-surface-variant)' }}>{label}</p>
                        <p className="text-[10px] font-mono leading-tight" style={{ color: 'var(--color-on-surface)' }}>{color}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {highlighted.size > 0 ? (
                  <p className="text-[10px]" style={{ color: '#a78bfa' }}>
                    ↑ {highlighted.size} passende{highlighted.size === 1 ? ' Variable' : ' Variablen'} unten hervorgehoben
                  </p>
                ) : (
                  <p className="text-[10px]" style={{ color: 'var(--color-on-surface-variant)' }}>
                    Kein exakter Treffer — Farbe könnte durch Opacity-Modifier abweichen
                  </p>
                )}
              </div>
            )}

            {/* Built-in presets */}
            <div data-dev-palette>
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-2"
                style={{ color: 'var(--color-on-surface-variant)' }}>
                Presets
              </p>
              <div className="flex gap-1 flex-wrap">
                {PRESETS.map(p => (
                  <button
                    data-dev-palette
                    key={p.label}
                    onClick={() => applyPreset(p.cls)}
                    className="text-[11px] px-2.5 py-1 rounded-lg transition-colors"
                    style={{ background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Saved themes */}
            {Object.keys(savedThemes).length > 0 && (
              <div data-dev-palette>
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-2"
                  style={{ color: 'var(--color-on-surface-variant)' }}>
                  Gespeichert
                </p>
                <div className="flex gap-1 flex-wrap">
                  {Object.keys(savedThemes).map(name => (
                    <div key={name} className="flex items-center gap-0.5">
                      <button
                        data-dev-palette
                        onClick={() => applyCustomTheme(savedThemes[name])}
                        className="text-[11px] px-2.5 py-1 rounded-l-lg"
                        style={{ background: '#4c1d95', color: '#c4b5fd' }}
                      >
                        {name}
                      </button>
                      <button
                        data-dev-palette
                        onClick={() => deleteTheme(name)}
                        className="text-[11px] px-1.5 py-1 rounded-r-lg"
                        style={{ background: '#4c1d95', color: '#c4b5fd', opacity: 0.6 }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save current palette */}
            <div data-dev-palette>
              {showSaveInput ? (
                <div className="flex gap-2 items-center">
                  <input
                    data-dev-palette
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveTheme(); if (e.key === 'Escape') setShowSaveInput(false) }}
                    placeholder="Theme-Name…"
                    autoFocus
                    className="flex-1 px-2 py-1 rounded-lg text-xs outline-none"
                    style={{
                      background: 'var(--color-surface-container-high)',
                      border: '1px solid #7c3aed',
                      color: 'var(--color-on-surface)',
                    }}
                  />
                  <button
                    data-dev-palette
                    onClick={saveTheme}
                    className="text-xs px-2 py-1 rounded-lg font-medium"
                    style={{ background: '#7c3aed', color: '#fff' }}
                  >
                    Save
                  </button>
                  <button
                    data-dev-palette
                    onClick={() => setShowSaveInput(false)}
                    className="text-xs"
                    style={{ color: 'var(--color-on-surface-variant)' }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  data-dev-palette
                  onClick={() => setShowSaveInput(true)}
                  className="text-[11px] transition-colors"
                  style={{ color: '#a78bfa' }}
                >
                  + Als Theme speichern
                </button>
              )}
            </div>

            {/* ── CSS variable groups ── */}
            {CSS_GROUPS.map(group => (
              <div key={group.label} data-dev-palette>
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-2"
                  style={{ color: 'var(--color-on-surface-variant)' }}>
                  {group.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {group.vars.map(({ name, label }) => {
                    const isHighlighted = highlighted.has(name)
                    return (
                      <label
                        key={name}
                        data-dev-palette
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl cursor-pointer transition-all"
                        style={{
                          background: isHighlighted
                            ? 'rgba(124, 58, 237, 0.15)'
                            : 'transparent',
                          outline: isHighlighted
                            ? '1px solid rgba(167, 139, 250, 0.5)'
                            : '1px solid transparent',
                        }}
                      >
                        {/* Color swatch + native color picker */}
                        <div className="relative flex-shrink-0">
                          <div
                            className="w-7 h-7 rounded-lg border border-white/10"
                            style={{ backgroundColor: values[name] || '#000' }}
                          />
                          <input
                            data-dev-palette
                            type="color"
                            value={values[name] || '#000000'}
                            onChange={e => setVar(name, e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </div>

                        <span className="flex-1 text-[11px] leading-tight" style={{ color: 'var(--color-on-surface)' }}>
                          {label}
                        </span>

                        <span className="text-[10px] font-mono flex-shrink-0" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.7 }}>
                          {values[name] || '—'}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}

          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        data-dev-palette
        onClick={() => setOpen(o => !o)}
        className="text-xs font-bold px-3 py-2 rounded-full shadow-lg transition-all active:scale-95"
        style={{ background: '#7c3aed', color: '#fff' }}
      >
        {open ? '✕ Colors' : '🎨 Colors'}
      </button>
    </div>
  )
}

// ── Public export: dev-only wrapper ──────────────────────────────────────
export function DevColorPalette() {
  if (process.env.NODE_ENV === 'production') return null
  return <Inner />
}
