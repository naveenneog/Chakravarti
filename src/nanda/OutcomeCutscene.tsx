import { useCallback, useEffect, useRef, useState } from 'react'
import { Crown, Play, ShieldAlert, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { isCinematicMuted, setCinematicMuted } from './onboarding'

export type CutsceneOutcome = 'victory' | 'defeat'

type OutcomeCutsceneProps = {
  outcome: CutsceneOutcome
  onContinue: () => void
}

type CutsceneContent = {
  video: string
  poster: string
  narration: string
  eyebrow: string
  title: string
  lines: string[]
  alt: string
  cta: string
  Icon: typeof Crown
}

const CONTENT: Record<CutsceneOutcome, CutsceneContent> = {
  victory: {
    video: './media/story/timber-gate-victory.mp4',
    poster: './media/story/timber-gate-victory-poster.jpg',
    narration: './media/story/timber-gate-victory-en-IN.mp3',
    eyebrow: 'The gate opens',
    title: 'Into the waking city',
    lines: [
      'The timber gate gives way.',
      'Chandragupta walks through into the waking city —',
      'the first gate of many on the long road to an empire.',
    ],
    alt: 'At dawn the timber gate of Pataliputra swings open and a hooded figure walks through toward the city.',
    cta: 'Continue',
    Icon: Crown,
  },
  defeat: {
    video: './media/story/timber-gate-defeat.mp4',
    poster: './media/story/timber-gate-defeat-poster.jpg',
    narration: './media/story/timber-gate-defeat-en-IN.mp3',
    eyebrow: 'A disciplined withdrawal',
    title: 'Back into the dark',
    lines: [
      'The gate holds.',
      'Chandragupta slips back into the dark, the coalition intact,',
      'the reckoning only delayed. He will return.',
    ],
    alt: 'At night the barred timber gate holds while a hooded figure withdraws into the dark treeline.',
    cta: 'Continue',
    Icon: ShieldAlert,
  },
}

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

export default function OutcomeCutscene({
  outcome,
  onContinue,
}: OutcomeCutsceneProps) {
  const content = CONTENT[outcome]
  const narrationRef = useRef<HTMLAudioElement | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [videoFailed, setVideoFailed] = useState(false)
  const [muted, setMuted] = useState(isCinematicMuted)
  const [narrationBlocked, setNarrationBlocked] = useState(false)
  const reducedMotion = useRef(prefersReducedMotion()).current

  // Start (or re-attempt) narration playback, tracking autoplay blocks so the
  // UI can surface an explicit "Play narration" control on mobile.
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
    const narration = new Audio(content.narration)
    narration.preload = 'auto'
    narration.muted = isCinematicMuted()
    narrationRef.current = narration
    if (!narration.muted) {
      void narration.play().catch(() => setNarrationBlocked(true))
    }
    dialogRef.current?.focus()
    return () => {
      narration.pause()
      narration.currentTime = 0
      narrationRef.current = null
    }
  }, [content.narration])

  const toggleMuted = () => {
    setMuted((value) => {
      const next = !value
      setCinematicMuted(next)
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
        onContinue()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onContinue])

  const showVideo = !reducedMotion && !videoFailed
  const { Icon } = content

  return (
    <div
      ref={dialogRef}
      className={`nanda-story-intro nanda-outcome-${outcome}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${content.title} — chapter outcome`}
      tabIndex={-1}
    >
      {showVideo ? (
        <video
          className="nanda-story-video"
          src={content.video}
          poster={content.poster}
          autoPlay
          muted
          playsInline
          onError={() => setVideoFailed(true)}
          aria-hidden="true"
        />
      ) : (
        <img
          className="nanda-story-video"
          src={content.poster}
          alt={content.alt}
        />
      )}

      <div className="nanda-story-scrim" aria-hidden="true" />

      <button type="button" className="nanda-story-skip" onClick={onContinue}>
        <SkipForward size={16} />
        Skip
      </button>

      <button
        type="button"
        className="nanda-story-mute"
        onClick={toggleMuted}
        aria-label={muted ? 'Unmute narration' : 'Mute narration'}
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>

      <div className="nanda-story-copy">
        <p className="eyebrow">
          <Icon size={14} />
          {content.eyebrow}
        </p>
        <h1>{content.title}</h1>
        <div className="nanda-story-lines">
          {content.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        {narrationBlocked && !muted ? (
          <button
            type="button"
            className="secondary-button nanda-story-narration"
            onClick={startNarration}
          >
            <Volume2 size={16} />
            Play narration
          </button>
        ) : null}
        <button
          type="button"
          className="primary-button nanda-story-begin"
          onClick={onContinue}
        >
          <Play size={18} />
          {content.cta}
        </button>
        <p className="nanda-story-note">
          Cinematic reconstruction. No surviving source records this mission; the
          scene is archaeologically informed, not documented history.
        </p>
      </div>
    </div>
  )
}
