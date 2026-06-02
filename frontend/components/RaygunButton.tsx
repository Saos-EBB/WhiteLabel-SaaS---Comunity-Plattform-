'use client'

import { useEffect, useRef } from 'react'

const SOCIAL_ITEMS = [
  { href: 'https://www.instagram.com/saos43/',            img: '/images/social-instagram.png', alt: 'Instagram' },
  { href: 'https://wa.me/436764718807?text=FORM WEBSITE', img: '/images/social-whatsapp.png',  alt: 'WhatsApp'  },
  { href: 'mailto:kevin.schaberl.work@gmail.com',         img: '/images/social-mail.png',      alt: 'Mail'      },
  { href: 'tel:+436764718807',                            img: '/images/social-phone.png',     alt: 'Telefon'   },
]

const LOAD_START = 1.0, LOAD_END = 3.0
const SHOT_START = 5.5, SHOT_END = 6.0
const SHOT_DELAY = 500
const BARREL_OFFSET_X = 8, BARREL_OFFSET_Y = 0
const BARREL_LENGTH = 20, ROTATION_OFFSET_DEG = 10

export function RaygunButton() {
  const btnRef       = useRef<HTMLButtonElement>(null)
  const iconRefs     = useRef<(HTMLAnchorElement | null)[]>([])
  const canvasRef    = useRef<HTMLCanvasElement | null>(null)
  const ctxRef       = useRef<CanvasRenderingContext2D | null>(null)
  const audioCtxRef  = useRef<AudioContext | null>(null)
  const bufferRef    = useRef<AudioBuffer | null>(null)
  const loadingRef   = useRef(false)
  const openRef      = useRef(false)
  const animRef      = useRef(false)
  const tokenRef     = useRef<object | null>(null)
  const barrelIdxRef = useRef(-1)

  useEffect(() => {
    // Inject CSS
    const style = document.createElement('style')
    style.textContent =
      '@keyframes raygun-pulse{0%,100%{filter:none;}50%{filter:drop-shadow(0 0 16px mediumpurple) brightness(1.5);}}' +
      '.raygun-charging{animation:raygun-pulse 0.38s ease-in-out infinite;}'
    document.head.appendChild(style)

    // Canvas
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:400;pointer-events:none;'
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    document.body.appendChild(canvas)
    canvasRef.current = canvas
    ctxRef.current    = canvas.getContext('2d')

    function handleResize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      if (!openRef.current || animRef.current) return
      const positions = getSocialCirclePositions(SOCIAL_ITEMS.length)
      iconRefs.current.forEach((icon, i) => {
        if (!icon) return
        icon.style.left = positions[i].left + 'px'
        icon.style.top  = positions[i].top  + 'px'
      })
      if (barrelIdxRef.current >= 0) {
        const p = positions[barrelIdxRef.current]
        drawBarrel(p.left + 20, p.top + 20)
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      tokenRef.current = {}
      canvas.remove()
      style.remove()
      window.removeEventListener('resize', handleResize)
      audioCtxRef.current?.close().catch(() => {})
    }
  }, [])

  // ── Helpers ──────────────────────────────────────────────────────────

  function getSocialCirclePositions(count: number) {
    const rect   = btnRef.current?.getBoundingClientRect()
    const btnX   = rect ? rect.left + rect.width  / 2 : 42
    const btnY   = rect ? rect.top  + rect.height / 2 : window.innerHeight - 42
    const radius = Math.min(window.innerWidth, window.innerHeight) * 0.25
    const positions: { left: number; top: number }[] = []
    const startAngle = -Math.PI / 2   // straight up
    const endAngle   = 0              // straight right
    for (let i = 0; i < count; i++) {
      const angle = startAngle + (i / (count - 1)) * (endAngle - startAngle)
      positions.push({
        left: btnX + radius * Math.cos(angle) - 20,
        top:  btnY + radius * Math.sin(angle) - 20,
      })
    }
    return positions
  }

  function btnCenter() {
    const r = btnRef.current!.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }

  function barrelTip(btnCX: number, btnCY: number, targetX: number, targetY: number) {
    const originX = btnCX + BARREL_OFFSET_X
    const originY = btnCY + BARREL_OFFSET_Y
    const angle   = Math.atan2(targetY - originY, targetX - originX)
    return {
      originX, originY,
      tipX: originX + Math.cos(angle) * BARREL_LENGTH,
      tipY: originY + Math.sin(angle) * BARREL_LENGTH,
    }
  }

  function paintBarrel(btnCX: number, btnCY: number, targetX: number, targetY: number) {
    const ctx = ctxRef.current!
    const tip = barrelTip(btnCX, btnCY, targetX, targetY)
    ctx.beginPath(); ctx.moveTo(tip.originX, tip.originY); ctx.lineTo(tip.tipX, tip.tipY)
    ctx.strokeStyle = 'transparent'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke()
    ctx.beginPath(); ctx.arc(tip.tipX, tip.tipY, 3, 0, Math.PI * 2)
    ctx.fillStyle = 'transparent'; ctx.fill()
    return tip
  }

  function drawBarrel(targetX: number, targetY: number) {
    const canvas = canvasRef.current!
    ctxRef.current!.clearRect(0, 0, canvas.width, canvas.height)
    const bc = btnCenter()
    paintBarrel(bc.x, bc.y, targetX, targetY)
  }

  function rotateGun(targetX: number, targetY: number) {
    const img = btnRef.current?.querySelector('img') as HTMLImageElement | null
    if (!img) return
    const bc      = btnCenter()
    const originX = bc.x + BARREL_OFFSET_X
    const originY = bc.y + BARREL_OFFSET_Y
    const angleDeg = Math.atan2(targetY - originY, targetX - originX) * (180 / Math.PI) + ROTATION_OFFSET_DEG
    img.style.transition      = 'none'
    img.style.transformOrigin = 'center center'
    img.style.transform       = `rotate(${angleDeg}deg)`
  }

  function clearCanvas() {
    const canvas = canvasRef.current!
    ctxRef.current!.clearRect(0, 0, canvas.width, canvas.height)
  }

  function fireBeam(targetX: number, targetY: number, token: object) {
    const bc    = btnCenter()
    const beamX = bc.x + BARREL_OFFSET_X
    const beamY = bc.y + BARREL_OFFSET_Y
    const t0    = performance.now()
    const FADE  = 120
    const cv    = canvasRef.current!
    const ctx   = ctxRef.current!
    function frame(now: number) {
      if (tokenRef.current !== token) return
      const t     = Math.min((now - t0) / FADE, 1)
      const alpha = 1 - t
      ctx.clearRect(0, 0, cv.width, cv.height)
      const fbc = btnCenter()
      paintBarrel(fbc.x, fbc.y, targetX, targetY)
      ctx.beginPath(); ctx.moveTo(beamX, beamY); ctx.lineTo(targetX, targetY)
      ctx.strokeStyle = `rgba(190,70,255,${alpha * 0.65})`; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke()
      ctx.beginPath(); ctx.moveTo(beamX, beamY); ctx.lineTo(targetX, targetY)
      ctx.strokeStyle = `rgba(235,185,255,${alpha})`; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke()
      if (t < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }

  function snapIconsToBtn() {
    const rect     = btnRef.current?.getBoundingClientRect()
    const snapTop  = rect ? rect.top  + 'px' : '1.2rem'
    const snapLeft = rect ? rect.left + 'px' : '1.2rem'
    iconRefs.current.forEach(icon => {
      if (!icon) return
      icon.style.transition = 'none'
      icon.style.left       = snapLeft
      icon.style.top        = snapTop
      icon.style.opacity    = '0'
      icon.style.transform  = 'scale(0)'
    })
  }

  async function initAudio() {
    if (!audioCtxRef.current) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch { return }
    }
    try { await audioCtxRef.current.resume() } catch { return }
    if (audioCtxRef.current.state !== 'running') return
    if (bufferRef.current || loadingRef.current) return
    loadingRef.current = true
    try {
      const r = await fetch('/sounds/railgun.mp3')
      if (!r.ok) throw new Error()
      const ab      = await r.arrayBuffer()
      bufferRef.current = await audioCtxRef.current.decodeAudioData(ab)
    } catch { loadingRef.current = false }
  }

  function playSegment(startOffset: number, duration: number) {
    if (!audioCtxRef.current || !bufferRef.current) return
    const src = audioCtxRef.current.createBufferSource()
    src.buffer = bufferRef.current
    src.connect(audioCtxRef.current.destination)
    src.start(audioCtxRef.current.currentTime + 0.05, startOffset, duration)
  }

  function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

  function openSocial() {
    if (animRef.current) return
    openRef.current = true; animRef.current = true
    const token = {}; tokenRef.current = token
    btnRef.current?.classList.add('open')
    snapIconsToBtn()
    const positions = getSocialCirclePositions(SOCIAL_ITEMS.length)
    barrelIdxRef.current = 0
    drawBarrel(positions[0].left + 20, positions[0].top + 20)
    playSegment(LOAD_START, LOAD_END - LOAD_START)
    btnRef.current?.classList.add('raygun-charging')

    sleep((LOAD_END - LOAD_START) * 1000).then(() => {
      if (tokenRef.current !== token) return
      btnRef.current?.classList.remove('raygun-charging')
      fireNext(0)
    })

    function fireNext(i: number) {
      if (tokenRef.current !== token) { clearCanvas(); return }
      if (i >= SOCIAL_ITEMS.length)  { animRef.current = false; return }
      const pos     = positions[i]
      const targetX = pos.left + 20
      const targetY = pos.top  + 20
      barrelIdxRef.current = i
      drawBarrel(targetX, targetY)
      rotateGun(targetX, targetY)
      setTimeout(() => playSegment(SHOT_START, SHOT_END - SHOT_START), 75)
      fireBeam(targetX, targetY, token)
      const bc   = btnCenter()
      const icon = iconRefs.current[i]
      if (icon) {
        icon.style.transition = 'none'
        icon.style.left       = `${bc.x - 20}px`
        icon.style.top        = `${bc.y - 20}px`
        icon.style.opacity    = '1'
        icon.style.transform  = 'scale(1)'
        icon.getBoundingClientRect()  // force reflow
        icon.style.transition = 'left 150ms ease-out, top 150ms ease-out'
        icon.style.left       = pos.left + 'px'
        icon.style.top        = pos.top  + 'px'
      }
      sleep(SHOT_DELAY).then(() => fireNext(i + 1))
    }
  }

  function closeSocial() {
    openRef.current  = false; animRef.current = false; barrelIdxRef.current = -1
    tokenRef.current = {}
    btnRef.current?.classList.remove('open', 'raygun-charging')
    const img = btnRef.current?.querySelector('img') as HTMLImageElement | null
    if (img) { img.style.transition = 'none'; img.style.transform = 'rotate(0deg)' }
    snapIconsToBtn()
    clearCanvas()
  }

  async function handleClick() {
    try { await initAudio() } catch { /* optional */ }
    openRef.current ? closeSocial() : openSocial()
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleClick}
        style={{
          position:      'fixed',
          bottom:        '1.2rem',
          left:          '1.2rem',
          background:    'none',
          border:        'none',
          cursor:        'pointer',
          zIndex:        500,
          pointerEvents: 'auto',
        }}
      >
        <img src="/images/laser_gun.png" alt="Contact" width={60} height={60} />
      </button>

      {SOCIAL_ITEMS.map((item, i) => (
        <a
          key={item.alt}
          ref={el => { iconRefs.current[i] = el }}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position:       'fixed',
            top:            '1.2rem',
            left:           '1.2rem',
            width:          '40px',
            height:         '40px',
            borderRadius:   '50%',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            opacity:        0,
            transform:      'scale(0)',
            zIndex:         290,
          }}
        >
          <img
            src={item.img}
            alt={item.alt}
            style={{ width: '32px', height: '32px' }}
          />
        </a>
      ))}
    </>
  )
}
