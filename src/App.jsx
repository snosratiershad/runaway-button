import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'

const QUESTIONS = [
  "Do you want to go out for dinner tonight?",
  "Are you happy?",
  "Do you like pizza?",
  "Should we watch a movie?",
  "Is today a good day?",
  "Do you believe in love?",
  "Want some ice cream?",
  "Are you having fun?",
  "Can you help me move this weekend?",
  "Do you think cats are cute?",
]

// Physics — cranked up for difficulty
const DANGER    = 400
const ACCEL     = 5000
const MAX_SPEED = 1800
const FRIC      = 0.975
const MERCY     = 500

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
  const [caught, setCaught] = useState(false)
  const isTouch = useRef(isTouchDevice())

  const S = useRef({
    x: 0, y: 0,
    vx: 0, vy: 0,
    mx: -9999, my: -9999,
    pmx: -9999, pmy: -9999,
    prevTime: 0,
    mercy: 0,
    snapped: false,
    mv: 0, // move count for touch mode
  })

  // Snap button to ghost after the card's slideUp animation (500ms)
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

    // Wait 550ms for the slideUp animation to fully settle (it's 0.5s)
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
    if (!btn || caught) return
    const s = S.current
    const mobile = isTouch.current

    let last = null
    const tick = (now) => {
      if (last === null) { last = now; s.raf = requestAnimationFrame(tick); return }
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      if (!s.snapped) { s.raf = requestAnimationFrame(tick); return }
      if (s.mx < -9000) { s.raf = requestAnimationFrame(tick); return }

      const vw = window.innerWidth
      const vh = window.innerHeight
      const bw = btn.offsetWidth
      const bh = btn.offsetHeight

      if (mobile) {
        // Mobile: touch mode — physics still runs but uses softer flee
        // On mobile, the touch event itself triggers the respawn separately
        s.raf = requestAnimationFrame(tick)
        return
      }

      // Desktop: full physics
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

        s.mercy++
        if (s.mercy >= MERCY) {
          setCaught(true)
          return
        }
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

      // Wrap
      if (s.x + bw < 0)        s.x = vw - 4
      else if (s.x > vw)       s.x = -bw + 4
      if (s.y + bh < 0)        s.y = vh - 4
      else if (s.y > vh)       s.y = -bh + 4

      btn.style.left = s.x + 'px'
      btn.style.top = s.y + 'px'
      btn.style.transform = 'none'

      s.raf = requestAnimationFrame(tick)
    }

    s.raf = requestAnimationFrame(tick)

    // Desktop: mouse tracking
    const onMouse = (e) => {
      s.pmx = s.mx; s.pmy = s.my
      s.mx = e.clientX; s.my = e.clientY
      s.prevTime = performance.now()
    }

    // Mobile: touch events trigger instant respawn
    const onTouchStart = (e) => {
      if (!e.touches[0]) return
      const touch = e.touches[0]
      const bw = btn.offsetWidth
      const bh = btn.offsetHeight

      // Check if touch is on or near the button
      const dx = (s.x + bw / 2) - touch.clientX
      const dy = (s.y + bh / 2) - touch.clientY
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 120) {  // finger close to button
        s.mv++
        if (s.mv >= MERCY) {
          setCaught(true)
          return
        }
        // Respawn at a random safe position
        const pos = randomViewportPos(bw, bh)
        s.x = pos.x
        s.y = pos.y
        btn.style.left = pos.x + 'px'
        btn.style.top = pos.y + 'px'
      } else {
        // Update tracked position even if not near
        s.mx = touch.clientX
        s.my = touch.clientY
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
  }, [caught])

  const onClick = useCallback(() => { if (caught && onCatch) onCatch() }, [caught, onCatch])

  return (
    <button
      ref={btnRef}
      className={`btn btn-answer btn-no ${caught ? 'btn-caught' : ''}`}
      onClick={onClick}
    >
      No ❌
    </button>
  )
}

function Celebration({ onRestart }) {
  const [particles] = useState(() => {
    const e = ['🎉','✨','💖','🎊','🌟','💫','🎈','🥳']
    return Array.from({ length: 30 }, (_, i) => ({
      id: i, emoji: e[i % e.length], left: Math.random()*100,
      delay: Math.random()*2, dur: 2+Math.random()*3,
    }))
  })

  return (
    <div className="celebration">
      <div className="particles">
        {particles.map(p => <span key={p.id} className="particle" style={{
          left: p.left+'%', animationDelay: p.delay+'s', animationDuration: p.dur+'s',
        }}>{p.emoji}</span>)}
      </div>
      <h1>🎉 YAY! 🎉</h1>
      <p className="celebration-text">You finally caught it!</p>
      <p className="celebration-sub">Knew you'd say yes eventually 😏</p>
      <button className="btn btn-restart" onClick={onRestart}>Ask me again!</button>
    </div>
  )
}

export default function App() {
  const [qIdx, setQIdx] = useState(() => Math.floor(Math.random() * QUESTIONS.length))
  const [answered, setAnswered] = useState(false)
  const [done, setDone] = useState(false)
  const [yesCount, setYesCount] = useState(0)
  const ghostRef = useRef(null)

  const next = () => { setAnswered(false); setQIdx(i => (i+1) % QUESTIONS.length) }
  const onYes = () => { setAnswered(true); setYesCount(c => c+1); setTimeout(next, 2000) }

  if (done) return <Celebration onRestart={() => { setDone(false); next() }} />

  return (
    <div className="app">
      <div className="runaway-overlay">
        {!answered && <RunawayButton onCatch={() => setDone(true)} ghostRef={ghostRef} />}
      </div>

      <div className="card">
        <h1 className="question">{QUESTIONS[qIdx]}</h1>
        {answered ? (
          <div className="answer-response">
            <span className="answer-emoji">🥰</span>
            <p className="answer-text">Yay! Great choice!</p>
          </div>
        ) : (
          <div className="buttons-row">
            <button className="btn btn-answer btn-yes" onClick={onYes}>Yes! ✅</button>
            <div ref={ghostRef} className="btn btn-answer btn-ghost">No ❌</div>
          </div>
        )}
        {yesCount > 0 && <p className="score">Yes answers: {yesCount} 🏆</p>}
      </div>

      <footer className="footer"><p>Try clicking "No" if you dare 😈</p></footer>
    </div>
  )
}