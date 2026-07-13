import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  BookOpen,
  ChevronUp,
  Coins,
  Crown,
  Eye,
  Flag,
  Gamepad2,
  Heart,
  Home,
  Info,
  Map,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Target,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './NandaCampaign.css'
import {
  nandaPlans,
  nandaSourceById,
  planCategoryCopy,
  plansByCategory,
} from './content'
import {
  combinedPlanDelta,
  createActionFirstCampaign,
  createNandaCampaign,
  missionLaunchForecast,
  nandaCampaignReducer,
  planForecast,
} from './engine'
import {
  clearNandaCampaign,
  loadNandaCampaign,
  saveNandaCampaign,
} from './persistence'
import {
  createMissionControls,
  type NandaMissionControls,
  type NandaMissionHud,
} from './missionTypes'
import { useNandaAudio } from './audio'
import type {
  EvidenceRef,
  MissionModifiers,
  MissionOutcome,
  MissionResult,
  NandaCampaignState,
  NandaCommand,
  PlanCategory,
  StrategyDelta,
} from './types'

const NandaMission = lazy(() => import('./NandaMission'))

type NandaCampaignProps = {
  onExit: () => void
}

type MissionErrorBoundaryProps = {
  children: ReactNode
  onFallback: () => void
}

type MissionErrorBoundaryState = {
  failed: boolean
}

class MissionErrorBoundary extends Component<
  MissionErrorBoundaryProps,
  MissionErrorBoundaryState
> {
  state: MissionErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): MissionErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    console.error('The 3D mission could not load its assets.', error)
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="nanda-mission-loading" role="alert">
          <AlertTriangle size={30} />
          <h2>3D assets could not be loaded</h2>
          <p>The complete campaign remains available without WebGL.</p>
          <button
            className="primary-button"
            type="button"
            onClick={this.props.onFallback}
          >
            Continue in command mode
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const evidenceLabels: Record<EvidenceRef['kind'], string> = {
  'recorded-evidence': 'Recorded evidence',
  'claim-in-source': 'Claim in a source',
  'scholarly-inference': 'Scholarly inference',
  'gameplay-reconstruction': 'Gameplay reconstruction',
  'literary-tradition': 'Literary tradition',
}

const categoryIcons: Record<PlanCategory, LucideIcon> = {
  intelligence: Eye,
  alliance: Users,
  logistics: Shield,
}

const categoryOrder: readonly PlanCategory[] = [
  'intelligence',
  'alliance',
  'logistics',
]

const outcomeCopy: Record<
  MissionOutcome,
  { title: string; summary: string }
> = {
  'coalition-entry': {
    title: 'The coalition enters intact',
    summary:
      'The gate opens with enough health, intelligence, and local support to turn a tactical opening into political momentum.',
  },
  'costly-entry': {
    title: 'The gate opens at a cost',
    summary:
      'The objective is secured, but the operation consumes strength the wider campaign still needs.',
  },
  withdrawal: {
    title: 'A disciplined withdrawal',
    summary:
      'Chandragupta preserves the coalition instead of gambling it on a failed entry, but unrest and doubt increase.',
  },
}

const supportsWebGL = () => {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      canvas.getContext('webgl2') || canvas.getContext('webgl'),
    )
  } catch {
    return false
  }
}

const initialHud = (modifiers: MissionModifiers): NandaMissionHud => ({
  health: modifiers.maxHealth,
  maxHealth: modifiers.maxHealth,
  guardsDefeated: 0,
  enemyCount: modifiers.enemyCount,
  objectivesSecured: modifiers.securedObjectives,
  requiredObjectives: modifiers.requiredObjectives,
  healingCharges: modifiers.healingCharges,
  healingUsed: 0,
  elapsedSeconds: 0,
  prompt: 'Reach the marked dispatches, then the northern gate',
})

function EvidenceBadge({ evidence }: { evidence: EvidenceRef }) {
  const source = nandaSourceById(evidence.sourceId)
  return (
    <div className="nanda-evidence">
      <span>{evidenceLabels[evidence.kind]}</span>
      <strong>{source?.title ?? evidence.sourceId}</strong>
      <p>{evidence.note}</p>
      {source?.url ? (
        <a href={source.url} target="_blank" rel="noreferrer">
          Read source
        </a>
      ) : null}
    </div>
  )
}

function StrategyDeltaChips({ delta }: { delta?: StrategyDelta }) {
  if (!delta) {
    return null
  }
  const labels: Record<keyof StrategyDelta, string> = {
    treasury: 'Treasury',
    legitimacy: 'Legitimacy',
    popularSupport: 'Support',
    unrest: 'Unrest',
    intelligence: 'Intelligence',
  }
  return (
    <div className="nanda-deltas">
      {Object.entries(delta)
        .filter(([, value]) => value !== 0)
        .map(([key, value]) => (
          <span
            className={(value ?? 0) >= 0 ? 'positive' : 'negative'}
            key={key}
          >
            {labels[key as keyof StrategyDelta]}{' '}
            {(value ?? 0) > 0 ? '+' : ''}
            {value}
          </span>
        ))}
    </div>
  )
}

function StrategyRibbon({ state }: { state: NandaCampaignState }) {
  return (
    <div className="nanda-strategy-ribbon" aria-label="Political resources">
      <span>
        <Coins size={16} />
        <strong>{state.strategy.treasury}</strong>
        Treasury
      </span>
      <span>
        <Crown size={16} />
        <strong>{state.strategy.legitimacy}</strong>
        Legitimacy
      </span>
      <span>
        <Users size={16} />
        <strong>{state.strategy.popularSupport}</strong>
        Support
      </span>
      <span>
        <AlertTriangle size={16} />
        <strong>{state.strategy.unrest}</strong>
        Unrest
      </span>
      <span>
        <Eye size={16} />
        <strong>{state.strategy.intelligence}</strong>
        Intelligence
      </span>
    </div>
  )
}

function BriefingPanel({
  onBegin,
}: {
  onBegin: () => void
}) {
  return (
    <main className="nanda-page">
      <section className="nanda-hero">
        <div className="nanda-hero-art" aria-hidden="true">
          <div className="nanda-wall-silhouette">
            {Array.from({ length: 13 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
          <div className="nanda-hero-figure">
            <Crown size={64} strokeWidth={1.1} />
          </div>
        </div>
        <div className="nanda-hero-copy">
          <p className="eyebrow">
            <Sparkles size={14} />
            Action-strategy prototype
          </p>
          <h1>
            The Fall of the Nandas
            <span>The Timber Gate</span>
          </h1>
          <p>
            Plan with Kautilya, then control Chandragupta inside a reconstructed
            Pataliputra district. Intelligence, alliance, and logistics choices
            directly alter guards, routes, health, mobility, and objectives.
          </p>
          <div className="nanda-hero-actions">
            <button className="primary-button" type="button" onClick={onBegin}>
              <Map size={18} />
              Plan the operation
            </button>
          </div>
        </div>
      </section>

      <section className="nanda-history-grid">
        <article>
          <Info size={21} />
          <h2>What is secure</h2>
          <p>
            The Nanda dynasty preceded Mauryan rule in Magadha. Independent
            later traditions agree on the transition to Chandragupta, although
            no contemporary campaign narrative survives.
          </p>
          <EvidenceBadge
            evidence={{
              kind: 'scholarly-inference',
              sourceId: 'nanda-transition',
              note:
                'The broad dynastic transition is accepted; exact dates and events remain reconstructed from later evidence.',
            }}
          />
        </article>
        <article>
          <Shield size={21} />
          <h2>What archaeology shows</h2>
          <p>
            Excavation at Pataliputra confirms major timber defenses and a moat.
            It does not preserve the route, assault, palace, or commanders used
            in this mission.
          </p>
          <EvidenceBadge
            evidence={{
              kind: 'recorded-evidence',
              sourceId: 'pataliputra-archaeology',
              note:
                'The material form of the fortification is evidenced; the playable district plan is not.',
            }}
          />
        </article>
        <article>
          <BookOpen size={21} />
          <h2>What is reconstructed</h2>
          <p>
            No source names a battle or describes a siege of Pataliputra. Every
            guard, dispatch, roof route, gate mechanism, and spoken line is an
            explicit gameplay reconstruction.
          </p>
          <EvidenceBadge
            evidence={{
              kind: 'gameplay-reconstruction',
              sourceId: 'mudrarakshasa-play',
              note:
                'The mission borrows political-intrigue motifs from a much later drama without presenting its scenes as documentary history.',
            }}
          />
        </article>
      </section>
    </main>
  )
}

function PlanningPanel({
  state,
  dispatch,
}: {
  state: NandaCampaignState
  dispatch: (command: NandaCommand) => void
}) {
  const launch = missionLaunchForecast(state)
  const combinedDelta = combinedPlanDelta(state)

  return (
    <main className="nanda-page">
      <header className="nanda-toolbar">
        <div>
          <p className="eyebrow">
            <Crown size={14} />
            Chandragupta and Kautilya
          </p>
          <h1>Plan before entering the city</h1>
          <p>
            Choose one preparation from each category. Costs are charged only
            when the mission begins, and every choice changes the action layer.
          </p>
        </div>
      </header>

      <StrategyRibbon state={state} />

      <section className="nanda-council">
        <div className="nanda-dialogue">
          <blockquote>
            “If we enter without knowing who will move, who will help, and what
            we can carry, courage becomes another name for uncertainty.”
          </blockquote>
          <span>Kautilya — reconstructed dialogue</span>
        </div>

        {categoryOrder.map((category) => {
          const copy = planCategoryCopy[category]
          const Icon = categoryIcons[category]
          return (
            <section className="nanda-plan-section" key={category}>
              <header>
                <span className="nanda-plan-icon">
                  <Icon size={20} />
                </span>
                <div>
                  <h2>{copy.title}</h2>
                  <p>{copy.description}</p>
                </div>
              </header>
              <div className="nanda-plan-grid">
                {plansByCategory(category).map((plan) => {
                  const forecast = planForecast(state, plan.id)
                  const selected =
                    state.selectedPlans[category] === plan.id
                  return (
                    <article
                      className={`nanda-plan-card ${selected ? 'selected' : ''}`}
                      key={plan.id}
                    >
                      <div>
                        <h3>{plan.title}</h3>
                        <p>{plan.summary}</p>
                        <strong>{plan.consequence}</strong>
                      </div>
                      <StrategyDeltaChips delta={plan.strategicDelta} />
                      <EvidenceBadge evidence={plan.evidence} />
                      <button
                        className={
                          selected ? 'secondary-button' : 'primary-button'
                        }
                        type="button"
                        disabled={!forecast.allowed}
                        onClick={() =>
                          dispatch({
                            type: 'SELECT_PLAN',
                            category,
                            planId: plan.id,
                          })
                        }
                      >
                        {selected ? 'Selected' : 'Choose preparation'}
                      </button>
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}
      </section>

      <section className="nanda-launch-card">
        <div>
          <p className="eyebrow">
            <Target size={14} />
            Mission forecast
          </p>
          <h2>Enter the timber-gate district</h2>
          <p>{launch.reason ?? launch.summary}</p>
          <StrategyDeltaChips delta={combinedDelta} />
        </div>
        <button
          className="primary-button"
          type="button"
          disabled={!launch.allowed}
          onClick={() => dispatch({ type: 'BEGIN_MISSION' })}
        >
          <Swords size={18} />
          Begin action mission
        </button>
      </section>
    </main>
  )
}

function AccessibleMission({
  modifiers,
  onComplete,
}: {
  modifiers: MissionModifiers
  onComplete: (result: MissionResult) => void
}) {
  const [stage, setStage] = useState(0)
  const [health, setHealth] = useState(modifiers.maxHealth)
  const [objectives, setObjectives] = useState(modifiers.securedObjectives)
  const [guards, setGuards] = useState(0)
  const [healing, setHealing] = useState(modifiers.healingCharges)
  const [healingUsed, setHealingUsed] = useState(0)

  const finish = (success: boolean) =>
    onComplete({
      success,
      healthRemaining: health,
      maxHealth: modifiers.maxHealth,
      guardsDefeated: guards,
      objectivesSecured: objectives,
      requiredObjectives: modifiers.requiredObjectives,
      elapsedSeconds: 75 + stage * 45,
      healingUsed,
      routeLabel: modifiers.routeLabel,
    })

  const resolveStep = (
    damage: number,
    objectiveGain: number,
    guardGain: number,
  ) => {
    const nextHealth = Math.max(0, health - damage)
    setHealth(nextHealth)
    setObjectives((value) =>
      Math.min(modifiers.requiredObjectives, value + objectiveGain),
    )
    setGuards((value) => Math.min(modifiers.enemyCount, value + guardGain))
    if (nextHealth === 0) {
      onComplete({
        success: false,
        healthRemaining: 0,
        maxHealth: modifiers.maxHealth,
        guardsDefeated: Math.min(modifiers.enemyCount, guards + guardGain),
        objectivesSecured: Math.min(
          modifiers.requiredObjectives,
          objectives + objectiveGain,
        ),
        requiredObjectives: modifiers.requiredObjectives,
        elapsedSeconds: 75 + stage * 45,
        healingUsed,
        routeLabel: modifiers.routeLabel,
      })
      return
    }
    setStage((value) => value + 1)
  }

  return (
    <section className="nanda-fallback" aria-label="Accessible mission mode">
      <header>
        <p className="eyebrow">
          <BookOpen size={14} />
          Accessible command mode
        </p>
        <h2>
          {stage === 0
            ? 'Approach the inner wall'
            : stage === 1
              ? 'Secure the district dispatches'
              : 'Open the timber gate'}
        </h2>
        <p>
          This mode completes the same campaign contract without WebGL. Each
          choice resolves a readable action beat and returns the result to the
          strategic layer.
        </p>
      </header>

      <div className="nanda-fallback-stats">
        <span>
          Health <strong>{health}</strong> / {modifiers.maxHealth}
        </span>
        <span>
          Dispatches <strong>{objectives}</strong> /{' '}
          {modifiers.requiredObjectives}
        </span>
        <span>
          Guards passed <strong>{guards}</strong>
        </span>
      </div>

      <div className="nanda-fallback-actions">
        {stage === 0 ? (
          <>
            <button
              type="button"
              onClick={() =>
                resolveStep(
                  modifiers.sideGateOpen ? 0 : 8,
                  modifiers.sideGateOpen ? 1 : 0,
                  0,
                )
              }
            >
              Use the prepared route
              <span>
                {modifiers.sideGateOpen
                  ? 'The guild gate avoids the first patrol.'
                  : 'The approach is slower without an open side gate.'}
              </span>
            </button>
            <button
              type="button"
              onClick={() =>
                resolveStep(modifiers.moveSpeed >= 6 ? 4 : 12, 1, 1)
              }
            >
              Cross the roofline
              <span>Mobility reduces the risk of the reconstructed climb.</span>
            </button>
          </>
        ) : null}
        {stage === 1 ? (
          <>
            <button
              type="button"
              onClick={() =>
                resolveStep(modifiers.revealObjectives ? 3 : 11, 1, 0)
              }
            >
              Follow the intelligence marks
              <span>
                Revealed objectives make the search faster and safer.
              </span>
            </button>
            <button
              type="button"
              onClick={() =>
                resolveStep(modifiers.attackDamage >= 40 ? 8 : 18, 1, 2)
              }
            >
              Break through the patrol
              <span>Veteran support improves close combat.</span>
            </button>
          </>
        ) : null}
        {stage >= 2 ? (
          <>
            {objectives >= modifiers.requiredObjectives ? (
              <button type="button" onClick={() => finish(true)}>
                Open the northern gate
                <span>Return the action result to the campaign.</span>
              </button>
            ) : (
              <button type="button" onClick={() => resolveStep(10, 1, 1)}>
                Search for the final dispatch
                <span>The gate cannot open until the operation is documented.</span>
              </button>
            )}
          </>
        ) : null}
      </div>

      <div className="nanda-fallback-footer">
        <button
          className="secondary-button"
          type="button"
          disabled={healing <= 0 || health >= modifiers.maxHealth}
          onClick={() => {
            setHealth((value) => Math.min(modifiers.maxHealth, value + 42))
            setHealing((value) => value - 1)
            setHealingUsed((value) => value + 1)
          }}
        >
          <Heart size={17} />
          Recover ({healing})
        </button>
        <button
          className="danger-button"
          type="button"
          onClick={() => finish(false)}
        >
          Withdraw
        </button>
      </div>
    </section>
  )
}

function MissionPanel({
  state,
  dispatch,
  onExit,
  onPlan,
}: {
  state: NandaCampaignState
  dispatch: (command: NandaCommand) => void
  onExit: () => void
  onPlan: () => void
}) {
  const modifiers = state.missionModifiers
  const webglAvailable = useMemo(supportsWebGL, [])
  const [reducedMode, setReducedMode] = useState(!webglAvailable)
  const [paused, setPaused] = useState(false)
  const [councilOpen, setCouncilOpen] = useState(false)
  const [resetToken, setResetToken] = useState(0)
  const audio = useNandaAudio()
  const controlsRef = useRef<NandaMissionControls>(createMissionControls())
  const [hud, setHud] = useState<NandaMissionHud | null>(() =>
    modifiers ? initialHud(modifiers) : null,
  )

  if (!modifiers || !hud) {
    return null
  }

  const setControl = (
    control: keyof NandaMissionControls,
    pressed: boolean,
  ) => {
    controlsRef.current[control] = pressed
  }

  const holdHandlers = (control: keyof NandaMissionControls) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId)
      void audio.ensureStarted()
      setControl(control, true)
    },
    onPointerUp: () => setControl(control, false),
    onPointerCancel: () => setControl(control, false),
    onPointerLeave: () => setControl(control, false),
  })

  const complete = (result: MissionResult) => {
    dispatch({ type: 'COMPLETE_MISSION', result })
  }

  const restartMission = () => {
    controlsRef.current = createMissionControls()
    setHud(initialHud(modifiers))
    setPaused(false)
    setResetToken((value) => value + 1)
  }

  const activePlans = categoryOrder.flatMap((category) => {
    const planId = state.selectedPlans[category]
    return planId ? [nandaPlans[planId]] : []
  })

  return (
    <main className="nanda-mission-page action-first">
      <section className="nanda-mission-frame">
        {reducedMode ? (
          <AccessibleMission
            key={resetToken}
            modifiers={modifiers}
            onComplete={complete}
          />
        ) : (
          <MissionErrorBoundary onFallback={() => setReducedMode(true)}>
            <Suspense
              fallback={
                <div className="nanda-mission-loading">
                  <Crown size={28} />
                  <p>Building the playable district...</p>
                </div>
              }
            >
              <NandaMission
                controlsRef={controlsRef}
                modifiers={modifiers}
                paused={paused || councilOpen}
                resetToken={resetToken}
                onHudChange={setHud}
                onComplete={complete}
                onAudioStart={audio.ensureStarted}
                onSound={audio.playEffect}
              />
            </Suspense>
          </MissionErrorBoundary>
        )}

        <div className="nanda-action-title">
          <p className="eyebrow">
            <Gamepad2 size={14} />
            Single-player action
          </p>
          <h1>The Timber Gate</h1>
          <p>{hud.prompt}</p>
        </div>

        <div className="nanda-action-menu">
          {!reducedMode ? (
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? 'Resume game' : 'Pause game'}
            >
              {paused ? <Play size={17} /> : <Pause size={17} />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void audio.toggleMuted()}
            aria-label={audio.muted ? 'Enable sound' : 'Mute sound'}
          >
            {audio.muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <button
            type="button"
            onClick={() => setCouncilOpen(true)}
            aria-label="Open War Council"
          >
            <Crown size={17} />
          </button>
        </div>

        <section className="nanda-mission-hud" aria-live="polite">
          <span>
            <Heart size={16} />
            <strong>{Math.ceil(hud.health)}</strong>
          </span>
          <span>
            <Target size={16} />
            <strong>{hud.objectivesSecured}</strong> /{' '}
            {hud.requiredObjectives}
          </span>
          <span>
            <Swords size={16} />
            <strong>{hud.guardsDefeated}</strong>
          </span>
          <span>
            <Shield size={16} />
            <strong>{hud.healingCharges}</strong>
          </span>
        </section>

        {!reducedMode ? (
          <>
            <div className="nanda-touch-controls" aria-label="Touch controls">
              <div className="nanda-direction-pad">
                <button
                  type="button"
                  aria-label="Move forward"
                  {...holdHandlers('forward')}
                >
                  <ChevronUp size={23} />
                </button>
                <button
                  type="button"
                  aria-label="Move left"
                  {...holdHandlers('left')}
                >
                  <ChevronUp className="turn-left" size={23} />
                </button>
                <button
                  type="button"
                  aria-label="Move backward"
                  {...holdHandlers('backward')}
                >
                  <ChevronUp className="turn-back" size={23} />
                </button>
                <button
                  type="button"
                  aria-label="Move right"
                  {...holdHandlers('right')}
                >
                  <ChevronUp className="turn-right" size={23} />
                </button>
              </div>
              <div className="nanda-action-pad">
                <button type="button" {...holdHandlers('jump')}>
                  Jump
                </button>
                <button type="button" {...holdHandlers('attack')}>
                  Strike
                </button>
                <button type="button" {...holdHandlers('interact')}>
                  Open
                </button>
                <button
                  type="button"
                  disabled={hud.healingCharges <= 0}
                  {...holdHandlers('heal')}
                >
                  Heal
                </button>
              </div>
            </div>
          </>
        ) : null}

        {paused && !reducedMode ? (
          <div className="nanda-pause-overlay">
            <Pause size={30} />
            <h2>Mission paused</h2>
            <p>Resume immediately or restart the action.</p>
            <div className="nanda-overlay-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => setPaused(false)}
              >
                <Play size={17} />
                Resume
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={restartMission}
              >
                <RotateCcw size={17} />
                Restart
              </button>
            </div>
          </div>
        ) : null}

        {councilOpen ? (
          <div className="nanda-war-council-overlay">
            <section>
              <p className="eyebrow">
                <Crown size={14} />
                Optional strategy
              </p>
              <h2>War Council</h2>
              <p>
                The game starts with a balanced field plan. Strategy can tune a
                later run, but it never blocks play.
              </p>
              <div className="nanda-active-plans">
                {activePlans.map((plan) => (
                  <article key={plan.id}>
                    <strong>{plan.title}</strong>
                    <span>{plan.consequence}</span>
                  </article>
                ))}
              </div>
              <div className="nanda-overlay-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setCouncilOpen(false)}
                >
                  <Play size={17} />
                  Continue mission
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={onPlan}
                >
                  <Map size={17} />
                  Plan a different run
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setReducedMode((value) => !value)
                    setCouncilOpen(false)
                  }}
                >
                  <BookOpen size={17} />
                  {reducedMode ? 'Return to 3D mode' : 'Use command mode'}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={onExit}
                >
                  <Home size={17} />
                  Open chronicles
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </section>

      <aside className="nanda-control-help">
        <strong>Keyboard</strong>
        <span>WASD / arrows move</span>
        <span>Space jumps</span>
        <span>F strikes</span>
        <span>E opens the gate</span>
        <span>H uses recovery</span>
      </aside>
    </main>
  )
}

function DebriefPanel({
  state,
  dispatch,
}: {
  state: NandaCampaignState
  dispatch: (command: NandaCommand) => void
}) {
  if (!state.outcome || !state.missionResult) {
    return null
  }
  const copy = outcomeCopy[state.outcome]
  const result = state.missionResult
  return (
    <main className="nanda-page">
      <section className="nanda-debrief">
        <p className="eyebrow">
          <Flag size={14} />
          Strategic debrief
        </p>
        <h1>{copy.title}</h1>
        <p>{copy.summary}</p>
        <div className="nanda-result-grid">
          <span>
            Health
            <strong>
              {Math.ceil(result.healthRemaining)} / {result.maxHealth}
            </strong>
          </span>
          <span>
            Dispatches
            <strong>
              {result.objectivesSecured} / {result.requiredObjectives}
            </strong>
          </span>
          <span>
            Guards defeated
            <strong>{result.guardsDefeated}</strong>
          </span>
          <span>
            Route
            <strong>{result.routeLabel}</strong>
          </span>
          <span>
            Mission time
            <strong>{result.elapsedSeconds}s</strong>
          </span>
        </div>
        <StrategyRibbon state={state} />
        <ul className="nanda-report">
          {state.lastReport.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
        <EvidenceBadge
          evidence={{
            kind: 'gameplay-reconstruction',
            sourceId: 'nanda-transition',
            note:
              'The result changes this campaign simulation only. No source records a timber-gate mission, its route, or its combat outcome.',
          }}
        />
        <button
          className="primary-button"
          type="button"
          onClick={() => dispatch({ type: 'FINISH_DEBRIEF' })}
        >
          <BookOpen size={18} />
          Record the chronicle
        </button>
      </section>
    </main>
  )
}

function CompletePanel({
  state,
  onReplay,
  onPlan,
  onExit,
}: {
  state: NandaCampaignState
  onReplay: () => void
  onPlan: () => void
  onExit: () => void
}) {
  const copy = state.outcome ? outcomeCopy[state.outcome] : null
  return (
    <main className="nanda-page">
      <section className="nanda-complete">
        <Crown size={54} strokeWidth={1.2} />
        <p className="eyebrow">Chronicle recorded</p>
        <h1>{copy?.title ?? 'The operation is complete'}</h1>
        <p>
          Play again immediately, or open the optional War Council to tune the
          next run.
        </p>
        <div className="nanda-complete-actions">
          <button className="primary-button" type="button" onClick={onReplay}>
            <RotateCcw size={18} />
            Play again
          </button>
          <button className="secondary-button" type="button" onClick={onPlan}>
            <Crown size={18} />
            Open War Council
          </button>
          <button className="secondary-button" type="button" onClick={onExit}>
            <Home size={18} />
            Return to chronicles
          </button>
        </div>
      </section>
    </main>
  )
}

export default function NandaCampaign({ onExit }: NandaCampaignProps) {
  const loaded = useMemo(loadNandaCampaign, [])
  const [state, setState] = useState(() =>
    loaded.state.phase === 'mission'
      ? loaded.state
      : createActionFirstCampaign(loaded.state.seed + 1),
  )
  const [warning, setWarning] = useState(loaded.warning)

  useEffect(() => {
    saveNandaCampaign(state)
  }, [state])

  const dispatch = (command: NandaCommand) => {
    setState((current) => nandaCampaignReducer(current, command))
  }

  const replay = () => {
    clearNandaCampaign()
    setState(createActionFirstCampaign(state.seed + 1))
    setWarning(undefined)
  }

  const planNewOperation = () => {
    clearNandaCampaign()
    const planning = nandaCampaignReducer(createNandaCampaign(state.seed + 1), {
      type: 'OPEN_PLANNING',
    })
    setState(planning)
    setWarning(undefined)
  }

  return (
    <div
      className={`nanda-shell ${
        state.phase === 'mission' ? 'action-live' : ''
      }`}
    >
      {state.phase !== 'mission' ? (
      <header className="nanda-chapter-header">
        <button className="text-button" type="button" onClick={onExit}>
          <Home size={17} />
          Chronicles
        </button>
        <div>
          <strong>The Fall of the Nandas</strong>
          <span>Action-strategy vertical slice</span>
        </div>
        <button className="text-button" type="button" onClick={replay}>
          <RotateCcw size={17} />
          New operation
        </button>
      </header>
      ) : null}

      {warning ? (
        <div className="nanda-save-warning" role="status">
          <AlertTriangle size={18} />
          <span>{warning}</span>
          <button type="button" onClick={() => setWarning(undefined)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {state.phase === 'briefing' ? (
        <BriefingPanel
          onBegin={() => dispatch({ type: 'OPEN_PLANNING' })}
        />
      ) : null}
      {state.phase === 'planning' ? (
        <PlanningPanel state={state} dispatch={dispatch} />
      ) : null}
      {state.phase === 'mission' ? (
        <MissionPanel
          state={state}
          dispatch={dispatch}
          onExit={onExit}
          onPlan={planNewOperation}
        />
      ) : null}
      {state.phase === 'debrief' ? (
        <DebriefPanel state={state} dispatch={dispatch} />
      ) : null}
      {state.phase === 'complete' ? (
        <CompletePanel
          state={state}
          onReplay={replay}
          onPlan={planNewOperation}
          onExit={onExit}
        />
      ) : null}

      {state.phase !== 'mission' ? (
      <footer className="nanda-disclosure">
        <Info size={16} />
        <span>
          No surviving source records this mission. Architecture is
          archaeologically informed; route, combat, dialogue, and outcomes are
          gameplay reconstruction.
        </span>
      </footer>
      ) : null}
    </div>
  )
}
