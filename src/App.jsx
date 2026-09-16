import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'

// Physics
const DANGER    = 400
const ACCEL     = 5000
const MAX_SPEED = 1800
const FRIC      = 0.975

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

function randomViewportPos(bw, bh) {
  const pad = 24
  const vw = window.innerWidth
  const vh = window.innerHeight
  const x = pad + Math.random() * Math.max(0, vw - bw - pad * 2)
  const y = pad + Math.random() * Math.max(0, vh - bh - pad * 2)
  return { x, y }
}

function RunawayButton({ onCatch, ghostRef }) {
  const btnRef = useRef(null)
  const isTouch = useRef(isTouchDevice())

  const S = useRef({
    x: 0, y: 0,
    vx: 0, vy: 0,
    mx: -9999, my: -9999,
    pmx: -9999, pmy: -9999,
    prevTime: 0,
    snapped: false,
    raf: null,
  })

  // Snap to ghost after card animation settles
  useEffect(() => {
    const ghost = ghostRef?.current
    const btn = btnRef.current
    if (!ghost || !btn) return

    btn.style.visibility = 'hidden'

    const snap = () => {
      const r = ghost.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) return false
      S.current.x = r.left
      S.current.y = r.top
      btn.style.position = 'absolute'
      btn.style.left = r.left + 'px'
      btn.style.top = r.top + 'px'
      btn.style.transform = 'none'
      S.current.snapped = true
      btn.style.visibility = 'visible'
      return true
    }

    const timer = setTimeout(() => {
      if (!snap()) {
        let tries = 0
        const retry = () => {
          tries++
          if (snap() || tries > 10) return
          requestAnimationFrame(retry)
        }
        requestAnimationFrame(retry)
      }
    }, 550)

    return () => clearTimeout(timer)
  }, [ghostRef])

  // Physics loop
  useEffect(() => {
    const btn = btnRef.current
    if (!btn) return
    const s = S.current
    const mobile = isTouch.current

    let last = null
    const tick = (now) => {
      if (last === null) { last = now; s.raf = requestAnimationFrame(tick); return }
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      if (!s.snapped) { s.raf = requestAnimationFrame(tick); return }
      if (s.mx < -9000) { s.raf = requestAnimationFrame(tick); return }

      if (mobile) { s.raf = requestAnimationFrame(tick); return }

      const bw = btn.offsetWidth
      const bh = btn.offsetHeight
      const vw = window.innerWidth
      const vh = window.innerHeight

      const cx = s.x + bw / 2
      const cy = s.y + bh / 2
      const dx = cx - s.mx
      const dy = cy - s.my
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < DANGER && dist > 0.1) {
        const nx = dx / dist
        const ny = dy / dist
        const urgency = 1 - dist / DANGER

        const cursorSpeed = Math.sqrt(
          (s.mx - s.pmx) ** 2 + (s.my - s.pmy) ** 2
        ) / Math.max((now - s.prevTime) / 1000, 0.001)
        const cursorFactor = Math.min(cursorSpeed / 1500, 1)

        const a = ACCEL * (0.2 + urgency * 0.4 + cursorFactor * 0.4)
        s.vx += nx * a * dt
        s.vy += ny * a * dt
      }

      s.vx *= FRIC
      s.vy *= FRIC
      const spd = Math.sqrt(s.vx * s.vx + s.vy * s.vy)
      if (spd > MAX_SPEED) {
        s.vx = (s.vx / spd) * MAX_SPEED
        s.vy = (s.vy / spd) * MAX_SPEED
      }

      s.x += s.vx * dt
      s.y += s.vy * dt

      if (s.x + bw < 0)  s.x = vw - 4
      else if (s.x > vw) s.x = -bw + 4
      if (s.y + bh < 0)  s.y = vh - 4
      else if (s.y > vh) s.y = -bh + 4

      btn.style.left = s.x + 'px'
      btn.style.top = s.y + 'px'

      s.raf = requestAnimationFrame(tick)
    }

    s.raf = requestAnimationFrame(tick)

    const onMouse = (e) => {
      s.pmx = s.mx; s.pmy = s.my
      s.mx = e.clientX; s.my = e.clientY
      s.prevTime = performance.now()
    }

    const onTouchStart = (e) => {
      if (!e.touches[0]) return
      const touch = e.touches[0]
      const bw = btn.offsetWidth
      const bh = btn.offsetHeight
      const dx = (s.x + bw / 2) - touch.clientX
      const dy = (s.y + bh / 2) - touch.clientY
      if (Math.sqrt(dx * dx + dy * dy) < 120) {
        const pos = randomViewportPos(bw, bh)
        s.x = pos.x; s.y = pos.y
        btn.style.left = pos.x + 'px'
        btn.style.top = pos.y + 'px'
      }
    }

    if (mobile) {
      window.addEventListener('touchstart', onTouchStart, { passive: true })
    } else {
      window.addEventListener('mousemove', onMouse, { passive: true })
    }

    return () => {
      cancelAnimationFrame(s.raf)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('touchstart', onTouchStart)
    }
  }, [])

  return (
    <button
      ref={btnRef}
      className="btn btn-answer btn-no"
      onClick={onCatch}
    >
      No ❌
    </button>
  )
}

function ThankYou() {
  return (
    <div className="thankyou">
      <div className="hearts">
        {Array.from({ length: 20 }, (_, i) => {
          const emojis = ['❤️','💕','💖','💗','💘','💝','🥰','💍']
          return <span key={i} className="heart" style={{
            left: Math.random() * 100 + '%',
            animationDelay: Math.random() * 3 + 's',
            animationDuration: (2 + Math.random() * 3) + 's',
          }}>{emojis[i % emojis.length]}</span>
        })}
      </div>
      <h1>YES! 💍</h1>
      <p className="thankyou-text">I love you too! 💕</p>
      <p className="thankyou-sub">This is the best day of my life! 🥰</p>
    </div>
  )
}

export default function App() {
  const [answered, setAnswered] = useState(false)
  const ghostRef = useRef(null)

  if (answered) return <ThankYou />

  return (
    <div className="app">
      <div className="runaway-overlay">
        <RunawayButton onCatch={() => setAnswered(true)} ghostRef={ghostRef} />
      </div>

      <div className="card">
        <h1 className="question">Will you marry me? 💍</h1>
        <div className="buttons-row">
          <button className="btn btn-answer btn-yes" onClick={() => setAnswered(true)}>
            Yes! 💕
          </button>
          <div ref={ghostRef} className="btn btn-answer btn-ghost">No ❌</div>
        </div>
      </div>

      <footer className="footer"><p>You only have one option here 😏</p></footer>
    </div>
  )
}