import { useEffect, useRef, useState } from 'react'
import { Play, ScrollText, SkipForward, Volume2, VolumeX } from 'lucide-react'

type StoryIntroProps = {
  onContinue: () => void
}

const VIDEO_SRC = './media/story/timber-gate-intro.mp4'
const POSTER_SRC = './media/story/timber-gate-intro-poster.jpg'
const NARRATION_SRC = './media/story/timber-gate-intro-en-IN.mp3'

const NARRATION_LINES = [
  'Magadha is ruled by the Nandas, and their grip is heavy.',
  'Tonight, a young Maurya walks toward the timber gate of Pataliputra.',
  'Move unseen, strike only when you must, and carry the dispatches to the northern wall.',
  'This is where an empire begins.',
]

export default function StoryIntro({ onContinue }: StoryIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const narrationRef = useRef<HTMLAudioElement | null>(null)
  const [videoFailed, setVideoFailed] = useState(false)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const narration = new Audio(NARRATION_SRC)
    narration.preload = 'auto'
    narrationRef.current = narration
    narration.muted = false
    void narration.play().catch(() => {
      // Autoplay with sound can be blocked; the video still tells the story and
      // the player can unmute or continue at any time.
    })
    return () => {
      narration.pause()
      narration.currentTime = 0
      narrationRef.current = null
    }
  }, [])

  useEffect(() => {
    const narration = narrationRef.current
    if (narration) {
      narration.muted = muted
    }
    const video = videoRef.current
    if (video) {
      video.muted = true
    }
  }, [muted])

  const toggleMuted = () => {
    setMuted((value) => {
      const next = !value
      const narration = narrationRef.current
      if (narration && !next) {
        void narration.play().catch(() => undefined)
      }
      return next
    })
  }

  return (
    <div className="nanda-story-intro" role="dialog" aria-label="Story introduction">
      {!videoFailed ? (
        <video
          ref={videoRef}
          className="nanda-story-video"
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          autoPlay
          muted
          loop
          playsInline
          onError={() => setVideoFailed(true)}
          aria-hidden="true"
        />
      ) : (
        <img
          className="nanda-story-video"
          src={POSTER_SRC}
          alt="A hooded figure approaches the torch-lit timber gate of Pataliputra."
        />
      )}

      <div className="nanda-story-scrim" aria-hidden="true" />

      <button
        type="button"
        className="nanda-story-skip"
        onClick={onContinue}
      >
        <SkipForward size={16} />
        Skip intro
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
          <ScrollText size={14} />
          Chapter One &middot; Magadha, late 4th century BCE
        </p>
        <h1>The Timber Gate</h1>
        <div className="nanda-story-lines">
          {NARRATION_LINES.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <button
          type="button"
          className="primary-button nanda-story-begin"
          onClick={onContinue}
        >
          <Play size={18} />
          Enter the district
        </button>
        <p className="nanda-story-note">
          Cinematic reconstruction. No surviving source records this night; the
          scene is archaeologically informed, not documented history.
        </p>
      </div>
    </div>
  )
}
