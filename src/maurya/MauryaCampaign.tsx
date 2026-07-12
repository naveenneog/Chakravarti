import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  Castle,
  Coins,
  Crown,
  Eye,
  FastForward,
  Flag,
  Hammer,
  Info,
  Map,
  Pause,
  Play,
  RotateCcw,
  ScrollText,
  Shield,
  Swords,
  Users,
  Volume2,
  VolumeX,
  Wheat,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './MauryaCampaign.css'
import {
  buildings,
  councilDebates,
  debateForSeason,
  formationNames,
  sourceById,
  units,
} from './content'
import {
  buildingForecast,
  createMauryaCampaign,
  formationForecast,
  mauryaCampaignReducer,
  recruitmentForecast,
  resolveWarResult,
  seasonForecast,
} from './engine'
import { useAdaptiveMusic, type MusicMode } from './music'
import {
  clearMauryaCampaign,
  loadMauryaCampaign,
  saveMauryaCampaign,
} from './persistence'
import { MauryaWorld, type WorldFocus } from './MauryaWorld'
import type {
  BuildingType,
  CampaignCommand,
  CampaignEnding,
  CampaignState,
  EvidenceRef,
  Formation,
  StrategicDelta,
  UnitType,
  WarResult,
} from './types'

type MauryaCampaignProps = {
  onExit: () => void
}

const evidenceLabels: Record<EvidenceRef['kind'], string> = {
  'recorded-evidence': 'Recorded evidence',
  'claim-in-source': 'Claim in a source',
  'scholarly-inference': 'Scholarly inference',
  'gameplay-reconstruction': 'Gameplay reconstruction',
  'literary-tradition': 'Literary tradition',
}

const buildingIcons: Record<BuildingType, LucideIcon> = {
  farm: Wheat,
  market: Coins,
  barracks: Users,
  fort: Castle,
}

const unitIcons: Record<UnitType, LucideIcon> = {
  infantry: Shield,
  archers: Eye,
  cavalry: Flag,
  elephants: Castle,
}

const focusCopy: Record<WorldFocus, { title: string; text: string }> = {
  capital: {
    title: 'Pataliputra reconstruction',
    text:
      'A timber-walled riverside capital informed by archaeology and fragmentary foreign descriptions, not a recovered city plan.',
  },
  farm: {
    title: 'Agrarian heartland',
    text:
      'Farms convert treasury into reliable food. Their exact form and production values are gameplay reconstruction.',
  },
  market: {
    title: 'River market',
    text:
      'Road and river exchange support the treasury. The district layout and income are reconstructed.',
  },
  barracks: {
    title: 'Army cantonment',
    text:
      'Training unlocks advanced units. The Arthashastra inspires the categories, not a verified Mauryan barracks plan.',
  },
  fort: {
    title: 'Timber border fort',
    text:
      'Timber fortification is plausible and archaeologically informed; this frontier location is invented.',
  },
  army: {
    title: 'The field army',
    text:
      'Infantry, archers, cavalry, and elephants have distinct logistics and formation roles.',
  },
  council: {
    title: 'Chandragupta and Kautilya',
    text:
      'Their exact dialogue is reconstructed. Kautilya is traditionally associated with Chandragupta, while the extant Arthashastra has a debated textual history.',
  },
}

const endingCopy: Record<
  CampaignEnding,
  { title: string; body: string }
> = {
  'steward-of-magadh': {
    title: 'Steward of Magadha',
    body:
      'Stores, legitimacy, and controlled frontiers reinforce one another. The province can expand without consuming its own foundation.',
  },
  'sword-without-granary': {
    title: 'A sword without a granary',
    body:
      'The army is formidable, but food or legitimacy cannot carry its weight indefinitely. Expansion now risks hollowing the kingdom.',
  },
  'fragile-mandala': {
    title: 'A fragile mandala',
    body:
      'The province survives through compromise, but threat, stores, and authority remain too uneven for secure expansion.',
  },
}

const warCopy: Record<WarResult, string> = {
  'decisive-victory':
    'The army breaks the frontier concentration while preserving enough cohesion to consolidate.',
  'costly-victory':
    'The field is secured, but losses and expenditure limit the political value of the result.',
  setback:
    'The army withdraws in order. The province survives, but authority and readiness suffer.',
}

const worldFocusOrder: readonly WorldFocus[] = [
  'capital',
  'farm',
  'market',
  'barracks',
  'fort',
  'army',
  'council',
]

const formationOrder: readonly Formation[] = [
  'archer-screen',
  'cavalry-flank',
  'elephant-center',
]

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

const campaignMusicMode = (state: CampaignState): MusicMode => {
  if (state.phase === 'council') {
    return 'council'
  }
  if (state.phase === 'war' || state.phase === 'war-planning') {
    return 'battle'
  }
  if (state.phase === 'complete') {
    return 'aftermath'
  }
  return 'world'
}

function EvidenceBadge({ evidence }: { evidence: EvidenceRef }) {
  const source = sourceById(evidence.sourceId)
  return (
    <div className="maurya-evidence">
      <span>{evidenceLabels[evidence.kind]}</span>
      <strong>{source?.title ?? evidence.sourceId}</strong>
      <p>{evidence.note}</p>
    </div>
  )
}

function DeltaChips({ delta }: { delta?: StrategicDelta }) {
  if (!delta) {
    return null
  }
  const labels: Record<keyof StrategicDelta, string> = {
    food: 'Food',
    treasury: 'Treasury',
    legitimacy: 'Legitimacy',
    threat: 'Threat',
    readiness: 'Readiness',
  }
  return (
    <div className="maurya-deltas">
      {Object.entries(delta).map(([key, value]) => (
        <span
          className={(value ?? 0) >= 0 ? 'positive' : 'negative'}
          key={key}
        >
          {labels[key as keyof StrategicDelta]} {(value ?? 0) > 0 ? '+' : ''}
          {value}
        </span>
      ))}
    </div>
  )
}

function ResourceRibbon({ state }: { state: CampaignState }) {
  return (
    <div className="maurya-resource-ribbon" aria-label="Campaign resources">
      <span>
        <Wheat size={16} />
        <strong>{state.resources.food}</strong>
        Food
      </span>
      <span>
        <Coins size={16} />
        <strong>{state.resources.treasury}</strong>
        Treasury
      </span>
      <span>
        <Crown size={16} />
        <strong>{state.resources.legitimacy}</strong>
        Legitimacy
      </span>
      <span>
        <Swords size={16} />
        <strong>{state.readiness}</strong>
        Readiness
      </span>
      <span>
        <AlertTriangle size={16} />
        <strong>{state.threat}</strong>
        Threat
      </span>
    </div>
  )
}

function HtmlWorldFallback({
  state,
  focus,
  onFocus,
}: {
  state: CampaignState
  focus: WorldFocus
  onFocus: (focus: WorldFocus) => void
}) {
  return (
    <div className="maurya-fallback-map" aria-label="Accessible province map">
      <div className="fallback-river">Ganges corridor</div>
      {worldFocusOrder.map((target) => (
        <button
          className={focus === target ? 'selected' : ''}
          key={target}
          type="button"
          onClick={() => onFocus(target)}
        >
          {focusCopy[target].title}
          {target in state.buildings
            ? ` · level ${state.buildings[target as BuildingType]}`
            : ''}
        </button>
      ))}
    </div>
  )
}

function PlanningPanel({
  state,
  dispatch,
}: {
  state: CampaignState
  dispatch: (command: CampaignCommand) => void
}) {
  const forecast = seasonForecast(state)
  return (
    <div className="maurya-phase-panel">
      <div className="maurya-panel-heading">
        <p>Planning phase</p>
        <h2>Shape season {state.season}</h2>
        <span>
          Choose at most one construction project and one formation to recruit,
          then convene the council.
        </span>
      </div>

      <section>
        <h3>
          <Hammer size={17} />
          Build the province
        </h3>
        <div className="maurya-action-grid">
          {Object.values(buildings).map((building) => {
            const Icon = buildingIcons[building.id]
            const action = buildingForecast(state, building.id)
            return (
              <article className="maurya-action-card" key={building.id}>
                <div className="maurya-action-title">
                  <Icon size={20} />
                  <div>
                    <strong>{building.name}</strong>
                    <span>Level {state.buildings[building.id]}/2</span>
                  </div>
                </div>
                <p>{building.description}</p>
                <strong className="maurya-role">{building.role}</strong>
                <DeltaChips delta={action.delta} />
                {!action.allowed ? (
                  <small>{action.reason}</small>
                ) : null}
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!action.allowed}
                  onClick={() =>
                    dispatch({ type: 'BUILD', building: building.id })
                  }
                >
                  Build
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <section>
        <h3>
          <Users size={17} />
          Build the army
        </h3>
        <div className="maurya-action-grid">
          {Object.values(units).map((unit) => {
            const Icon = unitIcons[unit.id]
            const action = recruitmentForecast(state, unit.id)
            return (
              <article className="maurya-action-card" key={unit.id}>
                <div className="maurya-action-title">
                  <Icon size={20} />
                  <div>
                    <strong>{unit.name}</strong>
                    <span>{state.army[unit.id]} cohorts</span>
                  </div>
                </div>
                <p>{unit.role}</p>
                <strong className="maurya-role">{unit.counter}</strong>
                <DeltaChips delta={action.delta} />
                {!action.allowed ? (
                  <small>{action.reason}</small>
                ) : null}
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!action.allowed}
                  onClick={() => dispatch({ type: 'RECRUIT', unit: unit.id })}
                >
                  Recruit
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <div className="maurya-season-forecast">
        <strong>Season forecast</strong>
        <span>
          Food {forecast.net.food >= 0 ? '+' : ''}
          {forecast.net.food}
        </span>
        <span>
          Treasury {forecast.net.treasury >= 0 ? '+' : ''}
          {forecast.net.treasury}
        </span>
        <span>Threat +{forecast.threatGrowth}</span>
      </div>

      <button
        className="primary-button maurya-wide-button"
        type="button"
        onClick={() => dispatch({ type: 'OPEN_COUNCIL' })}
      >
        <ScrollText size={18} />
        Convene the council
      </button>
    </div>
  )
}

function CouncilPanel({
  state,
  dispatch,
  playVoice,
}: {
  state: CampaignState
  dispatch: (command: CampaignCommand) => void
  playVoice: (character: 'chandragupta' | 'kautilya') => void
}) {
  const debate = debateForSeason(state.season)
  if (!debate) {
    return null
  }
  return (
    <div className="maurya-phase-panel">
      <div className="maurya-panel-heading">
        <p>Council debate</p>
        <h2>{debate.title}</h2>
        <span>{debate.problem}</span>
      </div>

      <div className="maurya-character-grid">
        <article>
          <div className="maurya-character-name">
            <Crown size={20} />
            <div>
              <strong>Chandragupta Maurya</strong>
              <span>Command, alliance, legitimacy</span>
            </div>
          </div>
          <blockquote>{debate.chandraguptaLine}</blockquote>
          <button
            className="text-button"
            type="button"
            onClick={() => playVoice('chandragupta')}
          >
            <Volume2 size={16} />
            Hear Chandragupta
          </button>
        </article>
        <article>
          <div className="maurya-character-name">
            <ScrollText size={20} />
            <div>
              <strong>Kautilya</strong>
              <span>Statecraft tradition and counsel</span>
            </div>
          </div>
          <blockquote>{debate.kautilyaLine}</blockquote>
          <button
            className="text-button"
            type="button"
            onClick={() => playVoice('kautilya')}
          >
            <Volume2 size={16} />
            Hear Kautilya
          </button>
        </article>
      </div>

      <EvidenceBadge evidence={debate.context} />

      <div className="maurya-decision-options">
        {debate.options.map((option) => (
          <article key={option.id}>
            <h3>{option.title}</h3>
            <p>{option.argument}</p>
            <DeltaChips delta={option.effects} />
            <EvidenceBadge evidence={option.evidence} />
            <button
              className="primary-button"
              type="button"
              onClick={() =>
                dispatch({
                  type: 'CHOOSE_COUNCIL',
                  debateId: debate.id,
                  optionId: option.id,
                })
              }
            >
              Choose this policy
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}

function ResolutionPanel({
  state,
  dispatch,
}: {
  state: CampaignState
  dispatch: (command: CampaignCommand) => void
}) {
  const forecast = seasonForecast(state)
  return (
    <div className="maurya-phase-panel">
      <div className="maurya-panel-heading">
        <p>Season report</p>
        <h2>Consequences before commitment</h2>
        <span>
          The next step applies income, upkeep, threat, and shortages exactly as
          forecast.
        </span>
      </div>
      <ul className="maurya-report-list">
        {state.lastReport.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="maurya-season-forecast detailed">
        <span>Income: +{forecast.income.food} food</span>
        <span>Income: +{forecast.income.treasury} treasury</span>
        <span>Upkeep: -{forecast.upkeep.food} food</span>
        <span>Upkeep: -{forecast.upkeep.treasury} treasury</span>
        <span>Threat: +{forecast.threatGrowth}</span>
      </div>
      <button
        className="primary-button maurya-wide-button"
        type="button"
        onClick={() => dispatch({ type: 'ADVANCE_SEASON' })}
      >
        <Flag size={18} />
        Resolve season {state.season}
      </button>
    </div>
  )
}

function WarPlanningPanel({
  state,
  dispatch,
}: {
  state: CampaignState
  dispatch: (command: CampaignCommand) => void
}) {
  return (
    <div className="maurya-phase-panel">
      <div className="maurya-panel-heading">
        <p>Border-war planning</p>
        <h2>Choose the formation</h2>
        <span>
          The result is calculated from army composition, readiness, legitimacy,
          fortification, threat, and formation before animation begins.
        </span>
      </div>
      <div className="maurya-formation-grid">
        {formationOrder.map((formation) => {
          const action = formationForecast(state, formation)
          const projected = action.allowed
            ? resolveWarResult(state, formation)
            : null
          return (
            <button
              className={
                state.selectedFormation === formation ? 'selected' : ''
              }
              type="button"
              key={formation}
              disabled={!action.allowed}
              onClick={() =>
                dispatch({ type: 'SET_FORMATION', formation })
              }
            >
              <strong>{formationNames[formation]}</strong>
              <span>{action.summary}</span>
              {projected ? (
                <small>
                  Forecast: {projected.replaceAll('-', ' ')}
                </small>
              ) : (
                <small>{action.reason}</small>
              )}
            </button>
          )
        })}
      </div>
      <EvidenceBadge
        evidence={{
          kind: 'gameplay-reconstruction',
          sourceId: 'arthashastra-statecraft',
          note:
            'The exact battle, formations, and unit balance are reconstructed. The animation does not claim to reproduce a documented engagement.',
        }}
      />
      <button
        className="primary-button maurya-wide-button"
        type="button"
        disabled={
          !formationForecast(state, state.selectedFormation).allowed
        }
        onClick={() => dispatch({ type: 'BEGIN_WAR' })}
      >
        <Swords size={18} />
        Begin the 3D war vignette
      </button>
    </div>
  )
}

function WarPanel({
  state,
  paused,
  setPaused,
  dispatch,
}: {
  state: CampaignState
  paused: boolean
  setPaused: (paused: boolean) => void
  dispatch: (command: CampaignCommand) => void
}) {
  return (
    <div className="maurya-phase-panel">
      <div className="maurya-panel-heading">
        <p>3D border-war vignette</p>
        <h2>{state.warResult?.replaceAll('-', ' ')}</h2>
        <span>
          The outcome is already fixed. Pause, skip, or replay cannot change the
          domain result.
        </span>
      </div>
      {state.warResult ? <p>{warCopy[state.warResult]}</p> : null}
      <div className="maurya-war-controls">
        <button
          className="secondary-button"
          type="button"
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play size={18} /> : <Pause size={18} />}
          {paused ? 'Resume vignette' : 'Pause vignette'}
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={() => dispatch({ type: 'COMPLETE_WAR' })}
        >
          <FastForward size={18} />
          Resolve instantly
        </button>
      </div>
    </div>
  )
}

function EndingPanel({
  state,
  onRestart,
}: {
  state: CampaignState
  onRestart: () => void
}) {
  const ending = state.ending ? endingCopy[state.ending] : null
  return (
    <div className="maurya-phase-panel">
      <div className="maurya-panel-heading">
        <p>Campaign debrief</p>
        <h2>{ending?.title}</h2>
        <span>{ending?.body}</span>
      </div>
      <ResourceRibbon state={state} />
      <ul className="maurya-report-list">
        {state.lastReport.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <EvidenceBadge
        evidence={{
          kind: 'gameplay-reconstruction',
          sourceId: 'classical-rise',
          note:
            'This six-season province and ending are a strategic teaching scenario, not a claim about a documented sequence of Chandragupta decisions.',
        }}
      />
      <button
        className="primary-button maurya-wide-button"
        type="button"
        onClick={onRestart}
      >
        <RotateCcw size={18} />
        Begin a new campaign
      </button>
    </div>
  )
}

export default function MauryaCampaign({ onExit }: MauryaCampaignProps) {
  const [loaded] = useState(() => loadMauryaCampaign())
  const [state, setState] = useState<CampaignState>(loaded.state)
  const [focus, setFocus] = useState<WorldFocus>('capital')
  const [battlePaused, setBattlePaused] = useState(false)
  const [forceFallback, setForceFallback] = useState(false)
  const voiceRef = useRef<HTMLAudioElement | null>(null)
  const webglAvailable = supportsWebGL()
  const deviceMemory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  const lowTier =
    deviceMemory <= 4 ||
    navigator.hardwareConcurrency <= 4 ||
    window.innerWidth < 430
  const music = useAdaptiveMusic(campaignMusicMode(state))

  const dispatch = (command: CampaignCommand) => {
    setState((current) => mauryaCampaignReducer(current, command))
  }

  useEffect(() => {
    saveMauryaCampaign(state)
  }, [state])

  useEffect(() => {
    if (state.phase === 'war') {
      setBattlePaused(false)
    }
  }, [state.phase])

  useEffect(
    () => () => {
      voiceRef.current?.pause()
    },
    [],
  )

  const playVoice = (character: 'chandragupta' | 'kautilya') => {
    voiceRef.current?.pause()
    const audio = new Audio(`./media/maurya/${character}.mp3`)
    voiceRef.current = audio
    void audio.play().catch(() => undefined)
  }

  const restart = () => {
    clearMauryaCampaign()
    setState(createMauryaCampaign(Date.now() % 100000))
    setFocus('capital')
    setBattlePaused(false)
  }

  const renderPanel = () => {
    if (state.phase === 'planning') {
      return <PlanningPanel state={state} dispatch={dispatch} />
    }
    if (state.phase === 'council') {
      return (
        <CouncilPanel
          state={state}
          dispatch={dispatch}
          playVoice={playVoice}
        />
      )
    }
    if (state.phase === 'resolution') {
      return <ResolutionPanel state={state} dispatch={dispatch} />
    }
    if (state.phase === 'war-planning') {
      return <WarPlanningPanel state={state} dispatch={dispatch} />
    }
    if (state.phase === 'war') {
      return (
        <WarPanel
          state={state}
          paused={battlePaused}
          setPaused={setBattlePaused}
          dispatch={dispatch}
        />
      )
    }
    return <EndingPanel state={state} onRestart={restart} />
  }

  const show3D = webglAvailable && !forceFallback
  const battleMode = state.phase === 'war'

  return (
    <main className="page maurya-page">
      <header className="maurya-titlebar">
        <div>
          <p className="eyebrow">
            <Map size={14} />
            Mauryan Rise · season {state.season} of {state.maxSeasons}
          </p>
          <h1>A Season in Magadha</h1>
          <p>
            Build one province, debate statecraft, sustain an army, and face one
            reconstructed frontier war in a living 3D world.
          </p>
        </div>
        <button className="text-button" type="button" onClick={onExit}>
          Return to chronicles
        </button>
      </header>

      {loaded.warning ? (
        <div className="maurya-warning">
          <AlertTriangle size={18} />
          {loaded.warning}
        </div>
      ) : null}

      <ResourceRibbon state={state} />

      <div className="maurya-layout">
        <section className="maurya-world-card">
          <div className="maurya-world-toolbar">
            <div>
              <strong>{battleMode ? 'Border war' : focusCopy[focus].title}</strong>
              <span>
                {show3D
                  ? lowTier
                    ? 'Reduced-quality 3D'
                    : 'Full 3D'
                  : 'Accessible map mode'}
              </span>
            </div>
            <div>
              <button
                className="icon-button"
                type="button"
                onClick={() => void music.toggle()}
                aria-label={music.enabled ? 'Mute game music' : 'Play game music'}
              >
                {music.enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={() => setForceFallback(!forceFallback)}
                aria-label={
                  forceFallback ? 'Enable 3D world' : 'Use accessible map mode'
                }
                disabled={!webglAvailable}
              >
                {forceFallback ? <Eye size={18} /> : <Map size={18} />}
              </button>
            </div>
          </div>

          <div className="maurya-world-viewport">
            {show3D ? (
              <MauryaWorld
                state={state}
                focus={focus}
                onFocus={setFocus}
                lowTier={lowTier}
                mode={battleMode ? 'battle' : 'world'}
                battlePaused={battlePaused}
                onBattleFinished={() => dispatch({ type: 'COMPLETE_WAR' })}
              />
            ) : (
              <HtmlWorldFallback
                state={state}
                focus={focus}
                onFocus={setFocus}
              />
            )}
          </div>

          {!battleMode ? (
            <>
              <div className="maurya-focus-nav">
                {worldFocusOrder.map((target) => (
                  <button
                    className={focus === target ? 'selected' : ''}
                    type="button"
                    key={target}
                    onClick={() => setFocus(target)}
                  >
                    {target}
                  </button>
                ))}
              </div>
              <div className="maurya-world-caption">
                <Info size={18} />
                <div>
                  <strong>{focusCopy[focus].title}</strong>
                  <p>{focusCopy[focus].text}</p>
                </div>
              </div>
            </>
          ) : null}
        </section>

        <aside className="maurya-command-deck">{renderPanel()}</aside>
      </div>

      <section className="maurya-history-strip">
        <article>
          <BookOpen size={20} />
          <div>
            <strong>Evidence at the point of choice</strong>
            <p>
              Every council option names its evidence type, source, and
              reconstruction boundary before you choose it.
            </p>
          </div>
        </article>
        <article>
          <Shield size={20} />
          <div>
            <strong>Deterministic campaign</strong>
            <p>
              The save contains the seed and ordered command log. Animation,
              music, and frame rate cannot change the result.
            </p>
          </div>
        </article>
        <article>
          <Swords size={20} />
          <div>
            <strong>War without false precision</strong>
            <p>
              The 3D confrontation is an openly labeled vignette, not a claim to
              reproduce a surviving battle narrative.
            </p>
          </div>
        </article>
      </section>

      <section className="panel-card maurya-event-log">
        <p className="source-label">Campaign record</p>
        <h2>Latest commands</h2>
        <ol>
          {state.events
            .slice(-8)
            .reverse()
            .map((event) => (
              <li key={event.index}>
                <span>Season {event.season}</span>
                {event.summary}
              </li>
            ))}
        </ol>
      </section>

      <section className="panel-card maurya-source-list">
        <p className="source-label">Campaign evidence brief</p>
        <h2>Six debates, six reconstruction boundaries</h2>
        <div>
          {councilDebates.map((debate) => (
            <article key={debate.id}>
              <strong>
                Season {debate.season}: {debate.title}
              </strong>
              <span>{evidenceLabels[debate.context.kind]}</span>
              <p>{debate.context.note}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
