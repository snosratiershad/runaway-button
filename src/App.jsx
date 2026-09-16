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
const FLEE_ACCELERATION = 2800    // px/s² — how hard the button pushes away
const MAX_SPEED = 900             // px/s — terminal velocity
const FRICTION = 0.92             // per frame velocity multiplier — smooth deceleration
const MERCY_AFTER = 250           // frames of evasion before surrender (~4s)

function RunawayButton({ children, onCatch, yesButtonRef }) {
  const btnRef = useRef(null)
  const containerRef = useRef(null)
  const [caught, setCaught] = useState(false)

  // Physics state — mutated in rAF, never triggers re-render
  const physics = useRef({
    x: 0, y: 0,          // position (top-left of button, relative to container)
    vx: 0, vy: 0,        // velocity
    cx: 0, cy: 0,        // last known cursor position (relative to container)
    active: false,        // is rAF running
    frameCount: 0,
    animId: null,
  })

  // Place button right next to the Yes button on mount
  useEffect(() => {
    const container = containerRef.current
    const btn = btnRef.current
    if (!container || !btn) return

    let x, y
    if (yesButtonRef?.current) {
      const yesRect = yesButtonRef.current.getBoundingClientRect()
      const cRect = container.getBoundingClientRect()
      x = yesRect.right - cRect.left + 16
      y = yesRect.top - cRect.top
    } else {
      // fallback: center of viewport
      const cRect = container.getBoundingClientRect()
      x = (cRect.width - btn.offsetWidth) / 2
      y = (cRect.height - btn.offsetHeight) / 2
    }
    physics.current.x = x
    physics.current.y = y
    btn.style.left = `${x}px`
    btn.style.top = `${y}px`
  }, [yesButtonRef])

  // Main physics loop
  useEffect(() => {
    const container = containerRef.current
    const btn = btnRef.current
    if (!container || !btn || caught) return
    const p = physics.current

    let lastTime = null

    const tick = (now) => {
      if (!lastTime) lastTime = now
      const dt = Math.min((now - lastTime) / 1000, 0.05) // cap dt to avoid huge jumps
      lastTime = now

      const cRect = container.getBoundingClientRect()
      const bw = btn.offsetWidth
      const bh = btn.offsetHeight

      // Button center
      const bcx = p.x + bw / 2
      const bcy = p.y + bh / 2

      // Distance to cursor
      const dx = bcx - p.cx
      const dy = bcy - p.cy
      const dist = Math.hypot(dx, dy)

      if (dist < DANGER_RADIUS && dist > 0) {
        // Accelerate away from cursor (normalized direction * acceleration)
        const nx = dx / dist
        const ny = dy / dist
        // Intensity scales with closeness — closer = more panic
        const urgency = 1 - (dist / DANGER_RADIUS) // 0..1
        const accel = FLEE_ACCELERATION * (0.6 + urgency * 0.4)
        p.vx += nx * accel * dt
        p.vy += ny * accel * dt

        p.frameCount++
        if (p.frameCount % 5 === 0) { // count every 5th frame for mercy
          p.mercyCount = (p.mercyCount || 0) + 1
          if (p.mercyCount >= MERCY_AFTER) {
            setCaught(true)
            return
          }
        }
      }

      // Apply friction
      p.vx *= FRICTION
      p.vy *= FRICTION

      // Clamp speed
      const speed = Math.hypot(p.vx, p.vy)
      if (speed > MAX_SPEED) {
        p.vx = (p.vx / speed) * MAX_SPEED
        p.vy = (p.vy / speed) * MAX_SPEED
      }

      // Integrate position
      p.x += p.vx * dt
      p.y += p.vy * dt

      // Wrap around viewport edges (pac-man style)
      if (p.x + bw < 0) p.x = cRect.width
      else if (p.x > cRect.width) p.x = -bw
      if (p.y + bh < 0) p.y = cRect.height
      else if (p.y > cRect.height) p.y = -bh

      // Apply to DOM directly — no React re-render
      btn.style.left = `${p.x}px`
      btn.style.top = `${p.y}px`

      p.animId = requestAnimationFrame(tick)
    }

    p.animId = requestAnimationFrame(tick)

    // Track cursor
    const onMouse = (e) => {
      const cRect = container.getBoundingClientRect()
      p.cx = e.clientX - cRect.left
      p.cy = e.clientY - cRect.top
    }

    const onTouch = (e) => {
      const touch = e.touches[0]
      if (!touch) return
      const cRect = container.getBoundingClientRect()
      p.cx = touch.clientX - cRect.left
      p.cy = touch.clientY - cRect.top
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
    <div ref={containerRef} className="runaway-container">
      <button
        ref={btnRef}
        className={`btn btn-answer btn-no ${caught ? 'btn-caught' : ''}`}
        style={{ position: 'absolute' }}
        onClick={handleClick}
      >
        {children}
      </button>
    </div>
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
  const yesButtonRef = useRef(null)

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
            <button ref={yesButtonRef} className="btn btn-answer btn-yes" onClick={handleYes}>
              Yes! ✅
            </button>
            <RunawayButton onCatch={handleNoCatch} yesButtonRef={yesButtonRef}>
              No ❌
            </RunawayButton>
          </div>
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