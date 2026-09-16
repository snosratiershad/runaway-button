import { useState, useRef, useCallback, useEffect } from 'react'
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

// Physics constants
const DANGER_RADIUS = 220
const FLEE_ACCELERATION = 2800
const MAX_SPEED = 900
const FRICTION = 0.92
const MERCY_AFTER = 250

function RunawayButton({ children, onCatch, placeholderRef }) {
  const btnRef = useRef(null)
  const containerRef = useRef(null)
  const [caught, setCaught] = useState(false)

  const physics = useRef({
    x: 0, y: 0,
    vx: 0, vy: 0,
    cx: -1000, cy: -1000,
    animId: null,
    mercyCount: 0,
    frameCount: 0,
  })

  // Place button on the empty placeholder slot on mount
  useEffect(() => {
    const btn = btnRef.current
    if (!btn || !placeholderRef?.current) return

    const pRect = placeholderRef.current.getBoundingClientRect()
    physics.current.x = pRect.left
    physics.current.y = pRect.top
    btn.style.left = `${pRect.left}px`
    btn.style.top = `${pRect.top}px`
  }, [placeholderRef])

  // Main physics loop
  useEffect(() => {
    const btn = btnRef.current
    if (!btn || caught) return
    const p = physics.current

    let lastTime = null

    const tick = (now) => {
      if (!lastTime) lastTime = now
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      const vw = window.innerWidth
      const vh = window.innerHeight
      const bw = btn.offsetWidth
      const bh = btn.offsetHeight

      const bcx = p.x + bw / 2
      const bcy = p.y + bh / 2

      const dx = bcx - p.cx
      const dy = bcy - p.cy
      const dist = Math.hypot(dx, dy)

      if (dist < DANGER_RADIUS && dist > 0) {
        const nx = dx / dist
        const ny = dy / dist
        const urgency = 1 - (dist / DANGER_RADIUS)
        const accel = FLEE_ACCELERATION * (0.6 + urgency * 0.4)
        p.vx += nx * accel * dt
        p.vy += ny * accel * dt

        p.frameCount++
        if (p.frameCount % 5 === 0) {
          p.mercyCount++
          if (p.mercyCount >= MERCY_AFTER) {
            setCaught(true)
            return
          }
        }
      }

      p.vx *= FRICTION
      p.vy *= FRICTION

      const speed = Math.hypot(p.vx, p.vy)
      if (speed > MAX_SPEED) {
        p.vx = (p.vx / speed) * MAX_SPEED
        p.vy = (p.vy / speed) * MAX_SPEED
      }

      p.x += p.vx * dt
      p.y += p.vy * dt

      // Wrap around immediately — modular arithmetic, no stuck edges
      p.x = ((p.x + bw) % vw + vw) % vw - bw
      p.y = ((p.y + bh) % vh + vh) % vh - bh

      btn.style.left = `${p.x}px`
      btn.style.top = `${p.y}px`

      p.animId = requestAnimationFrame(tick)
    }

    p.animId = requestAnimationFrame(tick)

    const onMouse = (e) => {
      p.cx = e.clientX
      p.cy = e.clientY
    }

    const onTouch = (e) => {
      const touch = e.touches[0]
      if (!touch) return
      p.cx = touch.clientX
      p.cy = touch.clientY
    }

    window.addEventListener('mousemove', onMouse, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchstart', onTouch, { passive: true })

    return () => {
      cancelAnimationFrame(p.animId)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchstart', onTouch)
    }
  }, [caught])

  const handleClick = useCallback(() => {
    if (caught && onCatch) onCatch()
  }, [caught, onCatch])

  return (
    <button
      ref={btnRef}
      className={`btn btn-answer btn-no ${caught ? 'btn-caught' : ''}`}
      style={{ position: 'fixed' }}
      onClick={handleClick}
    >
      {children}
    </button>
  )
}

function CelebrationScreen({ onRestart }) {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    const emojis = ['🎉', '✨', '💖', '🎊', '🌟', '💫', '🎈', '🥳']
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      emoji: emojis[i % emojis.length],
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 3,
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="celebration">
      <div className="particles">
        {particles.map(p => (
          <span
            key={p.id}
            className="particle"
            style={{
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          >
            {p.emoji}
          </span>
        ))}
      </div>
      <h1>🎉 YAY! 🎉</h1>
      <p className="celebration-text">You finally caught it!</p>
      <p className="celebration-sub">Knew you'd say yes eventually 😏</p>
      <button className="btn btn-restart" onClick={onRestart}>
        Ask me again!
      </button>
    </div>
  )
}

function App() {
  const [questionIndex, setQuestionIndex] = useState(() =>
    Math.floor(Math.random() * QUESTIONS.length)
  )
  const [answered, setAnswered] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [yesClicks, setYesClicks] = useState(0)
  const placeholderRef = useRef(null)

  const handleYes = () => {
    setAnswered(true)
    setYesClicks(c => c + 1)
    setTimeout(() => {
      setAnswered(false)
      setQuestionIndex(prev => (prev + 1) % QUESTIONS.length)
    }, 2000)
  }

  const handleNoCatch = () => {
    setShowCelebration(true)
  }

  const handleRestart = () => {
    setShowCelebration(false)
    setAnswered(false)
    setQuestionIndex(prev => (prev + 1) % QUESTIONS.length)
  }

  if (showCelebration) {
    return <CelebrationScreen onRestart={handleRestart} />
  }

  return (
    <div className="app">
      <div className="card">
        <h1 className="question">{QUESTIONS[questionIndex]}</h1>

        {answered ? (
          <div className="answer-response">
            <span className="answer-emoji">🥰</span>
            <p className="answer-text">Yay! Great choice!</p>
          </div>
        ) : (
          <div className="buttons-row">
            <button className="btn btn-answer btn-yes" onClick={handleYes}>
              Yes! ✅
            </button>
            {/* Invisible placeholder that reserves space for No */}
            <div ref={placeholderRef} className="btn btn-answer btn-placeholder">
              No ❌
            </div>
          </div>
        )}

        {/* No button lives here — renders as fixed over the placeholder */}
        {!answered && (
          <RunawayButton onCatch={handleNoCatch} placeholderRef={placeholderRef}>
            No ❌
          </RunawayButton>
        )}

        {yesClicks > 0 && (
          <p className="score">Yes answers: {yesClicks} 🏆</p>
        )}
      </div>

      <footer className="footer">
        <p>Try clicking "No" if you dare 😈</p>
      </footer>
    </div>
  )
}

export default App