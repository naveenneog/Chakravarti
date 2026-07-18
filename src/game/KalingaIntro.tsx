import { useCallback, useEffect, useRef, useState } from 'react'
import { Flag, Play, ScrollText, SkipForward, Volume2, VolumeX } from 'lucide-react'

type KalingaIntroProps = {
  onBegin: () => void
}

const VIDEO_SRC = './media/kalinga-intro.mp4'
const POSTER_SRC = './media/kalinga-intro-poster.jpg'
const NARRATION_SRC = './media/kalinga-intro-en-IN.mp3'

const LINES = [
  'Before empire became remorse, Kalinga stood beyond Mauryan rule.',
  'Command the advance, and weigh every loss.',
  "Discover what Ashoka's own edict records — and what history leaves unknown.",
]

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export default function KalingaIntro({ onBegin }: KalingaIntroProps) {
  const narrationRef = useRef<HTMLAudioElement | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [videoFailed, setVideoFailed] = useState(false)
  const [muted, setMuted] = useState(false)
  const [narrationBlocked, setNarrationBlocked] = useState(false)
  const reducedMotion = useRef(prefersReducedMotion()).current

  const startNarration = useCallback(() => {
    const narration = narrationRef.current
    if (!narration || narration.muted) {
      return
    }
    void narration
      .play()
      .then(() => setNarrationBlocked(false))
      .catch(() => setNarrationBlocked(true))
  }, [])

  useEffect(() => {
    const narration = new Audio(NARRATION_SRC)
    narration.preload = 'auto'
    narrationRef.current = narration
    void narration.play().catch(() => setNarrationBlocked(true))
    dialogRef.current?.focus()
    return () => {
      narration.pause()
      narration.currentTime = 0
      narrationRef.current = null
    }
  }, [])

  const toggleMuted = () => {
    setMuted((value) => {
      const next = !value
      const narration = narrationRef.current
      if (narration) {
        narration.muted = next
        if (!next) {
          setNarrationBlocked(false)
          void narration.play().catch(() => setNarrationBlocked(true))
        }
      }
      return next
    })
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        onBegin()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBegin])

  const showVideo = !reducedMotion && !videoFailed

  return (
    <div
      ref={dialogRef}
      className="kalinga-intro"
      role="dialog"
      aria-modal="true"
      aria-label="The Cost of Kalinga — chapter introduction"
      tabIndex={-1}
    >
      {showVideo ? (
        <video
          className="kalinga-intro-video"
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          autoPlay
          muted
          playsInline
          onError={() => setVideoFailed(true)}
          aria-hidden="true"
        />
      ) : (
        <img
          className="kalinga-intro-video"
          src={POSTER_SRC}
          alt="Dawn over the forested Kalinga frontier as two distant armies form up."
        />
      )}

      <div className="kalinga-intro-scrim" aria-hidden="true" />

      <button type="button" className="kalinga-intro-skip" onClick={onBegin}>
        <SkipForward size={16} />
        Skip
      </button>

      <button
        type="button"
        className="kalinga-intro-mute"
        onClick={toggleMuted}
        aria-label={muted ? 'Unmute narration' : 'Mute narration'}
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>

      <div className="kalinga-intro-copy">
        <p className="eyebrow">
          <ScrollText size={14} />
          Chapter &middot; Kalinga, c. 261 BCE
        </p>
        <h1>The Cost of Kalinga</h1>
        <div className="kalinga-intro-lines">
          {LINES.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        {narrationBlocked && !muted ? (
          <button
            type="button"
            className="secondary-button kalinga-intro-narration"
            onClick={startNarration}
          >
            <Volume2 size={16} />
            Play narration
          </button>
        ) : null}
        <button
          type="button"
          className="primary-button kalinga-intro-begin"
          onClick={onBegin}
        >
          <Flag size={18} />
          Begin the battle
        </button>
        <p className="kalinga-intro-note">
          <Play size={13} />
          Tactical reconstruction. Ashoka&apos;s Major Rock Edict XIII records the
          conquest and its human toll; formations and units are gameplay
          reconstruction, not preserved history.
        </p>
      </div>
    </div>
  )
}
