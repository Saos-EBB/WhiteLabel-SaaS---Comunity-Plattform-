// ─── Types ────────────────────────────────────────────────────────────────────

interface LetterData {
  el: HTMLDivElement
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  angularVelocity: number
  w: number
  h: number
  radius: number
  active: boolean
  grounded: boolean
}

// ─── Module-level state ───────────────────────────────────────────────────────

let letters: LetterData[] = []
let physicsRafId: number | null = null
let shakeRafId:   number | null = null

// ─── Constants ────────────────────────────────────────────────────────────────

const GRAVITY           = 0.45
const RESTITUTION       = 0.22
const FRICTION_AIR      = 0.018
const FRICTION_FLOOR_X  = 0.90
const FRICTION_FLOOR_ANG = 0.85
const FLOOR_PAD         = 80
const MAX_LETTERS       = 500

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createLetterEl(char: string, fontSize: number): HTMLDivElement {
  const el = document.createElement('div')
  el.textContent = char
  const color =
    getComputedStyle(document.documentElement).getPropertyValue('--color-on-surface').trim() ||
    '#e0e0e0'
  el.style.cssText =
    `font-size:${fontSize}px;` +
    `font-weight:700;` +
    `font-family:inherit;` +
    `color:${color};` +
    `z-index:200;` +
    `user-select:none;` +
    `pointer-events:none;` +
    `position:fixed;` +
    `left:0;` +
    `top:0;` +
    `margin:0;` +
    `padding:0;` +
    `line-height:1;`
  document.body.appendChild(el)
  return el
}

function measureAndPlace(
  chars: string[],
  originRect: { left: number; top: number },
  fontSize: number,
): LetterData[] {
  // Create one hidden off-screen container with all chars as spans
  const measDiv = document.createElement('div')
  measDiv.style.cssText =
    `position:fixed;left:-9999px;top:-9999px;` +
    `font-size:${fontSize}px;font-weight:700;font-family:inherit;` +
    `line-height:1;white-space:nowrap;visibility:hidden;`
  chars.forEach((c) => {
    const span = document.createElement('span')
    span.textContent = c
    measDiv.appendChild(span)
  })
  document.body.appendChild(measDiv)

  const spans = measDiv.querySelectorAll('span')
  const result: LetterData[] = chars.map((char, i) => {
    const span = spans[i] as HTMLSpanElement
    const offsetLeft = span.offsetLeft
    const w = span.offsetWidth || fontSize * 0.6
    const h = span.offsetHeight || fontSize
    const el = createLetterEl(char, fontSize)
    const x = originRect.left + offsetLeft
    const y = originRect.top
    el.style.left = x + 'px'
    el.style.top  = y + 'px'
    return {
      el,
      x, y,
      vx: 0, vy: 0,
      rotation: 0, angularVelocity: 0,
      w, h,
      radius: (w + h) / 4,
      active: false,
      grounded: false,
    }
  })

  document.body.removeChild(measDiv)
  return result
}

// ─── Physics loop (internal) ──────────────────────────────────────────────────

function startPhysicsLoop(): void {
  if (physicsRafId) return

  function step() {
    const floor = window.innerHeight - FLOOR_PAD
    const right = window.innerWidth

    letters.forEach((d) => {
      if (!d.active || d.grounded) return

      d.vx *= (1 - FRICTION_AIR)
      d.vy *= (1 - FRICTION_AIR)
      d.angularVelocity *= (1 - FRICTION_AIR)

      d.vy += GRAVITY
      d.x  += d.vx
      d.y  += d.vy
      d.rotation += d.angularVelocity

      // walls
      if (d.x < 0) {
        d.x  = 0
        d.vx = Math.abs(d.vx) * RESTITUTION
      }
      if (d.x + d.w > right) {
        d.x  = right - d.w
        d.vx = -Math.abs(d.vx) * RESTITUTION
      }

      // floor
      if (d.y + d.h >= floor) {
        d.y  = floor - d.h
        d.vy = -Math.abs(d.vy) * RESTITUTION
        d.vx *= FRICTION_FLOOR_X
        d.angularVelocity *= FRICTION_FLOOR_ANG
        if (Math.abs(d.vy) < 1.0 && Math.abs(d.vx) < 0.4) {
          d.vy = 0
          d.vx = 0
          d.angularVelocity = 0
          d.grounded = true
        }
      }

      d.el.style.left      = d.x + 'px'
      d.el.style.top       = d.y + 'px'
      d.el.style.transform = `rotate(${d.rotation}deg)`
    })

    // Collision resolution — active non-grounded letters only
    const active = letters.filter((d) => d.active && !d.grounded)
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i]
        const b = active[j]
        const dx   = (b.x + b.w / 2) - (a.x + a.w / 2)
        const dy   = (b.y + b.h / 2) - (a.y + a.h / 2)
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const minD = a.radius + b.radius
        if (dist >= minD) continue

        const overlap = (minD - dist) * 0.5
        const nx = dx / dist
        const ny = dy / dist
        a.x -= nx * overlap
        a.y -= ny * overlap
        b.x += nx * overlap
        b.y += ny * overlap

        const dvx = b.vx - a.vx
        const dvy = b.vy - a.vy
        const dot = dvx * nx + dvy * ny
        if (dot < 0) continue

        const imp = dot * (1 + RESTITUTION) * 0.5
        a.vx += imp * nx;  a.vy += imp * ny
        b.vx -= imp * nx;  b.vy -= imp * ny
        a.grounded = false
        b.grounded = false
      }
    }

    physicsRafId = requestAnimationFrame(step)
  }

  physicsRafId = requestAnimationFrame(step)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function initLogoLetters(text: string, originRect: DOMRect): void {
  cleanup()
  const chars = text.split('').filter((c) => c.trim())
  letters = measureAndPlace(chars, originRect, 20)
}

export function startShaking(): void {
  let intensity = 0
  let tick      = 0

  function shakeFrame() {
    tick++
    intensity = Math.min(tick * 0.3, 35)
    letters.forEach((d) => {
      const dx  = (Math.random() - 0.5) * 2 * intensity
      const dy  = (Math.random() - 0.5) * intensity * 0.4
      const rot = (Math.random() - 0.5) * intensity * 0.5
      d.el.style.transform = `translate(${dx}px,${dy}px) rotate(${rot}deg)`
    })
    shakeRafId = requestAnimationFrame(shakeFrame)
  }

  shakeRafId = requestAnimationFrame(shakeFrame)
}

export function triggerBreak(): void {
  if (shakeRafId) { cancelAnimationFrame(shakeRafId); shakeRafId = null }
  letters.forEach((d) => {
    const rect = d.el.getBoundingClientRect()
    d.x = rect.left
    d.y = rect.top
    d.el.style.transform = ''
    d.el.style.left = d.x + 'px'
    d.el.style.top  = d.y + 'px'
    d.vx             = (Math.random() - 0.5) * 14
    d.vy             = -(3 + Math.random() * 7)
    d.angularVelocity = (Math.random() - 0.5) * 22
    d.active   = true
    d.grounded = false
  })
  startPhysicsLoop()
}

export function spawnTextLetters(text: string, originEl: HTMLElement): void {
  if (letters.length >= MAX_LETTERS) return
  const rect  = originEl.getBoundingClientRect()
  const chars = text.split('').filter((c) => c.trim())
  const origin = { left: rect.left + rect.width / 2, top: rect.top }
  const newLetters = measureAndPlace(chars, origin, 16)
  newLetters.forEach((d) => {
    d.x  = rect.left + rect.width / 2 + (Math.random() - 0.5) * 20
    d.y  = rect.top
    d.vx = (Math.random() - 0.5) * 10
    d.vy = -(1 + Math.random() * 3)
    d.angularVelocity = (Math.random() - 0.5) * 15
    d.active   = true
    d.grounded = false
    d.el.style.left = d.x + 'px'
    d.el.style.top  = d.y + 'px'
  })
  letters.push(...newLetters)
  if (!physicsRafId) startPhysicsLoop()
}

export function triggerExplosion(onDone: () => void): void {
  if (shakeRafId) { cancelAnimationFrame(shakeRafId); shakeRafId = null }
  letters.forEach((d) => {
    d.grounded        = false
    d.vx              = (Math.random() - 0.5) * 40
    d.vy              = -(8 + Math.random() * 25)
    d.angularVelocity = (Math.random() - 0.5) * 35
    d.active          = true
  })
  if (!physicsRafId) startPhysicsLoop()
  setTimeout(() => { cleanup(); onDone() }, 1200)
}

export function cleanup(): void {
  if (physicsRafId) { cancelAnimationFrame(physicsRafId); physicsRafId = null }
  if (shakeRafId)   { cancelAnimationFrame(shakeRafId);   shakeRafId   = null }
  letters.forEach((d) => d.el.remove())
  letters = []
}
