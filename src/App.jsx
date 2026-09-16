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

// Physics
const DANGER    = 300      // flee trigger radius (px)
const ACCEL     = 2800     // base flee acceleration (px/s²)
const MAX_SPEED = 1200     // max button speed (px/s)
const FRIC      = 0.965    // per-frame friction — high = long coasting
const MERCY     = 300      // frames before surrender

function RunawayButton({ onCatch, ghostRef }) {
  const btnRef = useRef(null)
  const [caught, setCaught] = useState(false)

  const S = useRef({
    x: 0, y: 0,
    vx: 0, vy: 0,           // button velocity
    mx: -9999, my: -9999,   // current mouse pos
    pmx: -9999, pmy: -9999, // previous mouse pos (for velocity)
    prevTime: 0,            // last mouse event time
    mercy: 0,
    started: false,
  })

  // Snap button to ghost placeholder on mount
  useEffect(() => {
    const ghost = ghostRef?.current
    const btn = btnRef.current
    if (!ghost || !btn) return
    requestAnimationFrame(() => {
      const r = ghost.getBoundingClientRect()
      S.current.x = r.left
      S.current.y = r.top
      btn.style.left = r.left + 'px'
      btn.style.top = r.top + 'px'
      S.current.started = true
    })
  }, [ghostRef])

  // Physics loop
  useEffect(() => {
    const btn = btnRef.current
    if (!btn || caught) return
    const s = S.current

    let last = null
    const tick = (now) => {
      if (last === null) { last = now; s.raf = requestAnimationFrame(tick); return }
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      if (!s.started) { s.raf = requestAnimationFrame(tick); return }

      const vw = window.innerWidth
      const vh = window.innerHeight
      const bw = btn.offsetWidth
      const bh = btn.offsetHeight

      const cx = s.x + bw / 2
      const cy = s.y + bh / 2
      const dx = cx - s.mx
      const dy = cy - s.my
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < DANGER && dist > 0.1) {
        const nx = dx / dist
        const ny = dy / dist
        const urgency = 1 - dist / DANGER

        // Cursor speed — how fast the user is approaching
        const cursorSpeed = Math.sqrt(
          (s.mx - s.pmx) ** 2 + (s.my - s.pmy) ** 2
        ) / Math.max((now - s.prevTime) / 1000, 0.001)
        // Normalize cursor speed: 0 at rest, ~1 at fast flick (2000+ px/s)
        const cursorFactor = Math.min(cursorSpeed / 2000, 1)

        // Acceleration scales with proximity AND cursor approach speed
        const a = ACCEL * (0.3 + urgency * 0.4 + cursorFactor * 0.3)
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

      // Wrap: as soon as trailing edge passes boundary, reappear on other side
      if (s.x + bw < 0)
        s.x = vw - 4
      else if (s.x > vw)
        s.x = -bw + 4
      if (s.y + bh < 0)
        s.y = vh - 4
      else if (s.y > vh)
        s.y = -bh + 4

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
    const onTouch = (e) => {
      const touch = e.touches[0]
      if (touch) {
        s.pmx = s.mx; s.pmy = s.my
        s.mx = touch.clientX; s.my = touch.clientY
        s.prevTime = performance.now()
      }
    }

    window.addEventListener('mousemove', onMouse, { passive: true })
    window.addEventListener('touchstart', onTouch, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })

    return () => {
      cancelAnimationFrame(s.raf)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('touchstart', onTouch)
      window.removeEventListener('touchmove', onTouch)
    }
  }, [caught])

  const onClick = useCallback(() => { if (caught && onCatch) onCatch() }, [caught, onCatch])

  return (
    <button
      ref={btnRef}
      className={`btn btn-answer btn-no ${caught ? 'btn-caught' : ''}`}
      style={{ position: 'absolute' }}
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
      {/* Fixed overlay — button roams the whole viewport from here */}
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