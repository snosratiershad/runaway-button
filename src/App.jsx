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

function getRandomPosition(buttonRect, containerRect) {
  const padding = 20
  const maxX = containerRect.width - buttonRect.width - padding
  const maxY = containerRect.height - buttonRect.height - padding
  const x = padding + Math.random() * Math.max(0, maxX - padding)
  const y = padding + Math.random() * Math.max(0, maxY - padding)
  return { x, y }
}

function RunawayButton({ children, onCatch }) {
  const btnRef = useRef(null)
  const containerRef = useRef(null)
  const moveCountRef = useRef(0)
  const [style, setStyle] = useState({})
  const [caught, setCaught] = useState(false)

  const runAway = useCallback((clientX, clientY) => {
    moveCountRef.current += 1
    // After enough tries, let them catch it (mercy!)
    if (moveCountRef.current >= 8) {
      setCaught(true)
      setStyle({})
      return
    }

    if (!btnRef.current || !containerRef.current) return
    const btnRect = btnRef.current.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()
    const pos = getRandomPosition(btnRect, containerRect)
    setStyle({
      position: 'absolute',
      left: `${pos.x}px`,
      top: `${pos.y}px`,
      transition: 'left 0.15s ease-out, top 0.15s ease-out',
    })
  }, [])

  const handleMouseEnter = useCallback((e) => {
    runAway(e.clientX, e.clientY)
  }, [runAway])

  const handleTouchStart = useCallback((e) => {
    e.preventDefault()
    const touch = e.touches[0]
    runAway(touch.clientX, touch.clientY)
  }, [runAway])

  const handleClick = useCallback((e) => {
    if (caught && onCatch) {
      onCatch()
    }
  }, [caught, onCatch])

  return (
    <div ref={containerRef} className="runaway-container">
      <button
        ref={btnRef}
        className={`btn btn-no ${caught ? 'btn-caught' : ''}`}
        style={style}
        onMouseEnter={handleMouseEnter}
        onTouchStart={handleTouchStart}
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