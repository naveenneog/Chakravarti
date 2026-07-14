import {
  ChevronUp,
  Footprints,
  Gamepad2,
  Heart,
  Shield,
  Sparkles,
  Swords,
  Target,
} from 'lucide-react'

type MissionTutorialProps = {
  onDismiss: () => void
  reducedMode: boolean
}

type TutorialStep = {
  icon: typeof Gamepad2
  title: string
  body: string
}

const touchSteps: TutorialStep[] = [
  {
    icon: Footprints,
    title: 'Move with the pad',
    body: 'Hold the left directional pad to walk through the timber district. Corners turn you toward the northern gate.',
  },
  {
    icon: ChevronUp,
    title: 'Jump the gaps',
    body: 'Tap Jump to vault crates and cross broken ground while a guard closes in.',
  },
  {
    icon: Swords,
    title: 'Strike when cornered',
    body: 'Tap Strike to fight a Nanda guard. Time it as they lunge; retreat to recover between clashes.',
  },
  {
    icon: Target,
    title: 'Open the dispatches',
    body: 'Stand on a glowing objective and tap Open to seize the guard dispatches you need to reach the wall.',
  },
  {
    icon: Heart,
    title: 'Heal sparingly',
    body: 'Tap Heal to spend a limited recovery charge when your health runs low.',
  },
]

const keyboardHint = 'WASD / arrows move · Space jumps · F strikes · E opens · H heals'

export default function MissionTutorial({
  onDismiss,
  reducedMode,
}: MissionTutorialProps) {
  return (
    <div
      className="nanda-tutorial-overlay"
      role="dialog"
      aria-label="How to play"
    >
      <section>
        <p className="eyebrow">
          <Gamepad2 size={14} />
          How to play &middot; The Timber Gate
        </p>
        <h2>Reach the northern wall</h2>
        <p className="nanda-tutorial-goal">
          <Sparkles size={15} />
          Secure the dispatches, survive the guards, and push toward
          Pataliputra&apos;s gate. You start with a balanced field plan; strategy
          is optional.
        </p>

        {reducedMode ? (
          <p className="nanda-tutorial-reduced">
            <Shield size={15} />
            You are in command mode. Choose stages with the on-screen buttons to
            advance the mission without 3D controls.
          </p>
        ) : (
          <ul className="nanda-tutorial-steps">
            {touchSteps.map((step) => {
              const Icon = step.icon
              return (
                <li key={step.title}>
                  <span className="nanda-tutorial-icon">
                    <Icon size={18} />
                  </span>
                  <div>
                    <strong>{step.title}</strong>
                    <span>{step.body}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {!reducedMode ? (
          <p className="nanda-tutorial-keyboard">{keyboardHint}</p>
        ) : null}

        <div className="nanda-overlay-actions">
          <button
            className="primary-button"
            type="button"
            onClick={onDismiss}
          >
            <Gamepad2 size={17} />
            Start playing
          </button>
        </div>
      </section>
    </div>
  )
}
