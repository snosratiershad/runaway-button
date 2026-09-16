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

const DANGER_RADIUS = 180   // px – flee when cursor is this close
const MERCY_AFTER = 15      // moves before the button surrenders
const FLEE_SPEED = 0        // ms transition – 0 = instant teleport

function fleePosition(btnRect, containerRect, cursorX, cursorY) {
  const pad = 16
  const bw = btnRect.width
  const bh = btnRect.height
  const cw = containerRect.width
  const ch = containerRect.height

  // Compute vector FROM cursor TO button center, then run further along it
  const btnCX = btnRect.left + bw / 2 - containerRect.left
  const btnCY = btnRect.top + bh / 2 - containerRect.top
  let dx = btnCX - cursorX
  let dy = btnCY - cursorY
  const dist = Math.hypot(dx, dy) || 1
  dx /= dist
  dy /= dist

  // Flee distance: at least 60% of container dimension, randomised
  const magnitude = Math.max(cw, ch) * (0.5 + Math.random() * 0.4)
  let newX = btnCX + dx * magnitude
  let newY = btnCY + dy * magnitude

  // Clamp inside the container
  newX = Math.max(pad, Math.min(cw - bw - pad, newX))
  newY = Math.max(pad, Math.min(ch - bh - pad, newY))

  // If barely moved, just pick a random opposite corner
  const moved = Math.hypot(newX - (btnRect.left - containerRect.left), newY - (btnRect.top - containerRect.top))
  if (moved < 60) {
    newX = cursorX - containerRect.left < cw / 2
      ? cw * 0.55 + Math.random() * cw * 0.3
      : pad + Math.random() * cw * 0.3
    newY = cursorY - containerRect.top < ch / 2
      ? ch * 0.55 + Math.random() * ch * 0.3
      : pad + Math.random() * ch * 0.3
    newX = Math.max(pad, Math.min(cw - bw - pad, newX))
    newY = Math.max(pad, Math.min(ch - bh - pad, newY))
  }

  return { x: newX, y: newY }
}

function RunawayButton({ children, onCatch }) {
  const btnRef = useRef(null)
  const containerRef = useRef(null)
  const moveCountRef = useRef(0)
  const posRef = useRef({ x: 0, y: 0 })          // track current pos without re-renders
  const [style, setStyle] = useState({})
  const [caught, setCaught] = useState(false)

  // Hovering over the container area triggers proximity tracking
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMove = (e) => {
      if (caught) return
      const btn = btnRef.current
      if (!btn) return

      const bRect = btn.getBoundingClientRect()
      const cRect = container.getBoundingClientRect()

      // cursor pos relative to container
      const cx = e.clientX - cRect.left
      const cy = e.clientY - cRect.top

      // button center relative to container
      const bx = bRect.left - cRect.left + bRect.width / 2
      const by = bRect.top - cRect.top + bRect.height / 2

      const dist = Math.hypot(cx - bx, cy - by)
      if (dist > DANGER_RADIUS) return           // too far, don't move

      moveCountRef.current += 1
      if (moveCountRef.current >= MERCY_AFTER) {
        setCaught(true)
        setStyle({})
        return
      }

      const pos = fleePosition(bRect, cRect, e.clientX, e.clientY)
      posRef.current = pos
      setStyle({
        position: 'absolute',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        transition: `left ${FLEE_SPEED}ms linear, top ${FLEE_SPEED}ms linear`,
      })
    }

    // Touch: flee from the finger before the tap registers
    const handleTouch = (e) => {
      if (caught) return
      const touch = e.touches[0]
      if (!touch) return
      const btn = btnRef.current
      if (!btn) return

      e.preventDefault()

      const bRect = btn.getBoundingClientRect()
      const cRect = container.getBoundingClientRect()

      moveCountRef.current += 1
      if (moveCountRef.current >= MERCY_AFTER) {
        setCaught(true)
        setStyle({})
        return
      }

      const pos = fleePosition(bRect, cRect, touch.clientX, touch.clientY)
      posRef.current = pos
      setStyle({
        position: 'absolute',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        transition: `left ${FLEE_SPEED}ms linear, top ${FLEE_SPEED}ms linear`,
      })
    }

    container.addEventListener('mousemove', handleMove, { passive: true })
    container.addEventListener('touchmove', handleTouch, { passive: false })
    container.addEventListener('touchstart', handleTouch, { passive: false })
    return () => {
      container.removeEventListener('mousemove', handleMove)
      container.removeEventListener('touchmove', handleTouch)
      container.removeEventListener('touchstart', handleTouch)
    }
  }, [caught])

  const handleClick = useCallback(() => {
    if (caught && onCatch) onCatch()
  }, [caught, onCatch])

  return (
    <div ref={containerRef} className="runaway-container">
      <button
        ref={btnRef}
        className={`btn btn-no ${caught ? 'btn-caught' : ''}`}
        style={style}
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
            <button className="btn btn-yes" onClick={handleYes}>
              Yes! ✅
            </button>
            <RunawayButton onCatch={handleNoCatch}>
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