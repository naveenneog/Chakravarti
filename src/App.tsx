import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  ChevronRight,
  Clock3,
  Crown,
  Flag,
  Gamepad2,
  Heart,
  Home,
  Info,
  Map,
  Pause,
  RotateCcw,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Target,
  Volume2,
} from 'lucide-react'
import './App.css'
import { BattleBoard } from './components/BattleBoard'
import {
  attackWithSelectedUnit,
  createBattleState,
  endPlayerTurn,
  moveSelectedUnit,
  selectUnit,
} from './game/engine'
import { campaigns } from './game/scenario'
import type {
  BattleResult,
  BattleState,
  Campaign,
  EvidenceKind,
} from './game/types'

type View = 'home' | 'nanda' | 'maurya' | 'battle' | 'kalinga-debrief' | 'codex'

const MauryaCampaign = lazy(() => import('./maurya/MauryaCampaign'))
const NandaCampaign = lazy(() => import('./nanda/NandaCampaign'))
const KalingaIntro = lazy(() => import('./game/KalingaIntro'))

const evidenceLabels: Record<EvidenceKind, string> = {
  'recorded-evidence': 'Recorded evidence',
  'claim-in-source': 'Claim in primary source',
  'scholarly-inference': 'Scholarly inference',
  'gameplay-reconstruction': 'Gameplay reconstruction',
  'literary-tradition': 'Literary tradition',
}

const resultCopy: Record<
  BattleResult,
  { title: string; body: string }
> = {
  'maurya-victory': {
    title: 'The military objective is secured',
    body:
      'Your tactical outcome is a simulation. Historically, the Mauryan conquest occurred; the debrief now separates what Ashoka recorded from what the game reconstructed.',
  },
  'kalinga-victory': {
    title: 'The advance is halted',
    body:
      'You changed this tactical reconstruction, not the historical record. The codex preserves the documented Mauryan conquest and the limits of surviving evidence.',
  },
  stalemate: {
    title: 'The field remains contested',
    body:
      'The turn limit ends the scenario without a tactical decision. The historical debrief still explains the recorded conquest and its consequences.',
  },
}

function CampaignCard({
  campaign,
  onPlay,
}: {
  campaign: Campaign
  onPlay: () => void
}) {
  const statusLabel =
    campaign.status === 'playable'
      ? 'Playable now'
      : campaign.status === 'research'
        ? 'Historical research'
        : 'Planned chapter'

  return (
    <article
      className={`campaign-card ${
        campaign.status === 'playable' ? 'playable' : ''
      }`}
    >
      <div>
        <div className="campaign-meta">
          <span
            className={`chip ${
              campaign.status === 'playable'
                ? 'accent'
                : campaign.status === 'research'
                  ? 'warning'
                  : ''
            }`}
          >
            <Clock3 size={13} />
            {campaign.era}
          </span>
          <span className="chip">
            <Map size={13} />
            {campaign.region}
          </span>
        </div>
        <h3>
          <span>{campaign.figure}</span>
          {campaign.title}
        </h3>
        <p>{campaign.description}</p>
      </div>
      <div className="campaign-footer">
        <span>{campaign.evidence}</span>
        {campaign.status === 'playable' ? (
          <button type="button" onClick={onPlay}>
            Play
            <ChevronRight size={16} />
          </button>
        ) : (
          <span>{statusLabel}</span>
        )}
      </div>
    </article>
  )
}

function ShowcaseVideo({
  src,
  poster,
  label,
  className,
}: {
  src: string
  poster: string
  label: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <img
        className={className}
        src={poster}
        alt={label}
        loading="lazy"
      />
    )
  }

  return (
    <video
      className={className}
      controls
      playsInline
      preload="metadata"
      poster={poster}
      onError={() => setFailed(true)}
      aria-label={label}
    >
      <source src={src} type="video/mp4" />
    </video>
  )
}

function GameplayShowcase() {
  return (
    <section className="section gameplay-showcase" aria-labelledby="gameplay-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <Gamepad2 size={14} />
            Native Unity gameplay
          </p>
          <h2 id="gameplay-heading">Watch The Timber Gate in action</h2>
          <p>
            Real footage from the mobile-first Unity 6 vertical slice: traversal,
            combat, guard pursuit, touch controls, lighting, and adaptive audio.
          </p>
        </div>
      </div>

      <article className="gameplay-feature-card">
        <ShowcaseVideo
          src="./media/gameplay/unity-action-gameplay.mp4"
          poster="./media/gameplay/unity-action-gameplay-poster.jpg"
          label="Gameplay trailer: Chandragupta enters the timber district"
        />
        <div>
          <p className="eyebrow">
            <Swords size={14} />
            Gameplay trailer
          </p>
          <h3>Chandragupta enters the timber district</h3>
          <p>
            Move, jump, fight Nanda guards, secure dispatches, and push toward
            Pataliputra&apos;s northern gate.
          </p>
        </div>
      </article>

      <div className="shorts-heading">
        <p className="eyebrow">
          <Sparkles size={14} />
          Gameplay shorts
        </p>
        <h3>Built for a phone held sideways. Cut for a phone held upright.</h3>
      </div>
      <div className="gameplay-shorts-grid">
        <article className="gameplay-short-card">
          <ShowcaseVideo
            src="./media/gameplay/unity-action-short-combat.mp4"
            poster="./media/gameplay/unity-action-short-combat-poster.jpg"
            label="Gameplay short: sword clash"
          />
          <h4>Sword clash</h4>
          <p>Close-range combat, hit reactions, pursuit, and recovery.</p>
        </article>
        <article className="gameplay-short-card">
          <ShowcaseVideo
            src="./media/gameplay/unity-action-short-traversal.mp4"
            poster="./media/gameplay/unity-action-short-traversal-poster.jpg"
            label="Gameplay short: road to the gate"
          />
          <h4>Road to the gate</h4>
          <p>Third-person movement through the reconstructed timber district.</p>
        </article>
      </div>
    </section>
  )
}

function HomeView({
  onNanda,
  onMaurya,
  onKalinga,
  onCodex,
  videoFailed,
  setVideoFailed,
}: {
  onNanda: () => void
  onMaurya: () => void
  onKalinga: () => void
  onCodex: () => void
  videoFailed: boolean
  setVideoFailed: (failed: boolean) => void
}) {
  return (
    <main className="page">
      <section className="hero-card">
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-seal">
            <Crown size={92} strokeWidth={1.2} />
          </div>
        </div>
        {!videoFailed ? (
          <video
            className="hero-video"
            src="./media/gameplay/unity-action-gameplay.mp4"
            poster="./media/gameplay/unity-action-gameplay-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            onError={() => setVideoFailed(true)}
            aria-hidden="true"
          />
        ) : null}
        <div className="hero-copy">
          <p className="eyebrow">
            <Sparkles size={14} />
            A historical strategy anthology
          </p>
          <h1>
            Chakravarti
            <span>Chronicles of Bharat</span>
          </h1>
          <p>
            Command real campaigns across Indian history. Every chapter marks
            the boundary between recorded evidence, a source&apos;s own claims,
            and the tactical reconstruction needed to make history playable.
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={onNanda}>
              <Gamepad2 size={19} />
              Play The Timber Gate
            </button>
            <button className="secondary-button" type="button" onClick={onMaurya}>
              <Swords size={19} />
              Enter the 3D Mauryan kingdom
            </button>
            <button className="secondary-button" type="button" onClick={onKalinga}>
              <Shield size={19} />
              Play the Kalinga battle
            </button>
            <button className="secondary-button" type="button" onClick={onCodex}>
              <BookOpen size={19} />
              Read the historical method
            </button>
          </div>
        </div>
      </section>

      <GameplayShowcase />

      <section className="section" aria-labelledby="chronicles-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The Hall of Samrats</p>
            <h2 id="chronicles-heading">Campaign chronicles</h2>
            <p>
              Heroes share one anthology, never one invented timeline. Each
              ruler remains in their own period, region, and historical conflict.
            </p>
          </div>
        </div>
        <div className="campaign-grid">
          {campaigns.map((campaign) => (
            <CampaignCard
              campaign={campaign}
              key={campaign.id}
              onPlay={
                campaign.id === 'fall-of-nandas'
                  ? onNanda
                  : campaign.id === 'mauryan-rise'
                    ? onMaurya
                    : onKalinga
              }
            />
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="pillars-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Design doctrine</p>
            <h2 id="pillars-heading">Built for history and play</h2>
          </div>
        </div>
        <div className="pillar-grid">
          <article className="pillar-card">
            <div className="pillar-icon">
              <ScrollText size={22} />
            </div>
            <h3>Evidence first</h3>
            <p>
              Facts, claims, legends, and reconstruction receive visibly
              different labels.
            </p>
          </article>
          <article className="pillar-card">
            <div className="pillar-icon">
              <Target size={22} />
            </div>
            <h3>One-thumb command</h3>
            <p>
              Select, move, attack, and end turn with large touch targets and
              short mobile sessions.
            </p>
          </article>
          <article className="pillar-card">
            <div className="pillar-icon">
              <Heart size={22} />
            </div>
            <h3>Consequences matter</h3>
            <p>
              Victory is measured beside casualties, displacement, morale, and
              political cost.
            </p>
          </article>
          <article className="pillar-card">
            <div className="pillar-icon">
              <Shield size={22} />
            </div>
            <h3>Many perspectives</h3>
            <p>
              Future missions include defenders, commanders, civilians, and
              rival courts rather than a single imperial viewpoint.
            </p>
          </article>
        </div>
      </section>
    </main>
  )
}

function CodexView() {
  return (
    <main className="page">
      <header className="page-title">
        <p className="eyebrow">
          <BookOpen size={14} />
          Kalinga historical codex
        </p>
        <h1>What the game knows</h1>
        <p>
          The first chapter teaches the historical record and its limits instead
          of disguising uncertainty as spectacle.
        </p>
      </header>

      <div className="history-grid">
        <article className="history-card">
          <div className="history-icon">
            <ScrollText size={22} />
          </div>
          <h3>Recorded</h3>
          <p>
            Ashoka&apos;s Major Rock Edict XIII records the conquest of Kalinga,
            suffering caused by it, his remorse, and his preference for conquest
            through dhamma.
          </p>
        </article>
        <article className="history-card">
          <div className="history-icon">
            <Info size={22} />
          </div>
          <h3>Claimed in the source</h3>
          <p>
            The edict states that 150,000 were deported, 100,000 killed, and many
            more died. The game presents these as Ashoka&apos;s figures, not
            independently confirmed statistics.
          </p>
        </article>
        <article className="history-card">
          <div className="history-icon">
            <Swords size={22} />
          </div>
          <h3>Reconstructed for play</h3>
          <p>
            The grid, river line, command standards, unit roster, formations,
            damage values, and eight-turn objective are game systems. They are
            not surviving details of the battle.
          </p>
        </article>
      </div>

      <aside className="codex-note">
        <strong>Why not make Ashoka fight Vikramaditya?</strong> A shared mythic
        menu can celebrate both figures, but placing rulers from different
        centuries in one battle would weaken the educational goal. Each campaign
        therefore remains in its own historical era. A future Itihasa collection
        can explore epic literature with equally clear literary-source labels.
      </aside>

      <section className="panel-card">
        <p className="source-label">Research foundation</p>
        <h2>Sources for the Kalinga chapter</h2>
        <ul className="source-list">
          <li>
            <strong>Ashoka, Major Rock Edict XIII</strong> - the primary
            inscription for conquest, stated human toll, remorse, and dhamma.
          </li>
          <li>
            <strong>E. Hultzsch, Inscriptions of Asoka</strong> - a foundational
            scholarly edition and translation of the inscriptions.
          </li>
          <li>
            <strong>Romila Thapar, Ashoka and the Decline of the Mauryas</strong>{' '}
            - historical analysis of Ashoka, empire, and evidence.
          </li>
          <li>
            <strong>
              Upinder Singh, A History of Ancient and Early Medieval India
            </strong>{' '}
            - modern synthesis of political, archaeological, and inscriptional
            evidence.
          </li>
        </ul>
      </section>
    </main>
  )
}

function BattleView({
  state,
  setState,
  onExit,
  onDebrief,
}: {
  state: BattleState
  setState: (updater: (current: BattleState) => BattleState) => void
  onExit: () => void
  onDebrief: () => void
}) {
  const selected = state.selectedUnitId
    ? state.units.find((unit) => unit.id === state.selectedUnitId)
    : null
  const historyMoment =
    state.scenario.historyMoments[
      (Math.max(1, state.turn) - 1) % state.scenario.historyMoments.length
    ]
  const costPercent = Math.min(
    100,
    Math.round((state.humanCost / 40) * 100),
  )
  const result = state.result ? resultCopy[state.result] : null

  return (
    <main className="page battle-page">
      <header className="battle-toolbar">
        <div>
          <p className="eyebrow">
            <Flag size={14} />
            Turn {state.turn} of {state.scenario.maxTurns}
          </p>
          <h1>{state.scenario.title}</h1>
        </div>
        <button className="text-button" type="button" onClick={onExit}>
          <Home size={17} />
          Leave battle
        </button>
      </header>

      <div className="battle-layout">
        <section className="battle-board-card" aria-label="Battle controls">
          <div className="objective-strip">
            <div>
              <strong>Objective</strong>
              <span>{state.scenario.objective}</span>
            </div>
            <div className="cost-meter">
              <div className="cost-meter-label">
                <span>Cost of war</span>
                <span>{state.humanCost} impact</span>
              </div>
              <div className="cost-track" aria-hidden="true">
                <div
                  className="cost-fill"
                  style={{ width: `${costPercent}%` }}
                />
              </div>
            </div>
          </div>

          <BattleBoard
            state={state}
            onSelect={(unitId) =>
              setState((current) => selectUnit(current, unitId))
            }
            onMove={(position) =>
              setState((current) => moveSelectedUnit(current, position))
            }
            onAttack={(unitId) =>
              setState((current) =>
                attackWithSelectedUnit(current, unitId),
              )
            }
          />

          <div className="battle-controls">
            <div className="unit-panel">
              {selected ? (
                <>
                  <h3>{selected.name}</h3>
                  <p>
                    Tap a green tile to move. Tap a red-ringed enemy to attack.
                    Rough terrain costs more movement.
                  </p>
                  <div className="unit-stats">
                    <span className="stat">
                      <Heart size={14} />
                      {selected.hp}/{selected.maxHp}
                    </span>
                    <span className="stat">
                      <Swords size={14} />
                      {selected.attack}
                    </span>
                    <span className="stat">
                      <Shield size={14} />
                      {selected.armor}
                    </span>
                    <span className="stat">
                      <Target size={14} />
                      Range {selected.range}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <h3>Select a Mauryan unit</h3>
                  <p>
                    Units can move once and attack once. You may attack before
                    moving when an enemy is already in range.
                  </p>
                </>
              )}
            </div>
            <button
              className="primary-button end-turn-button"
              type="button"
              disabled={state.phase !== 'player'}
              onClick={() => setState(endPlayerTurn)}
            >
              <Flag size={18} />
              End Mauryan turn
            </button>
          </div>

          {result ? (
            <section className="result-panel" aria-live="polite">
              <h2>{result.title}</h2>
              <p>{result.body}</p>
              <div className="chip-row">
                <span
                  className={`chip ${
                    state.humanCost <= state.scenario.restraintTarget
                      ? 'success'
                      : 'warning'
                  }`}
                >
                  <Heart size={13} />
                  {state.humanCost <= state.scenario.restraintTarget
                    ? 'Restraint objective met'
                    : 'Heavy human cost'}
                </span>
              </div>
              <div className="result-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={onDebrief}
                >
                  <BookOpen size={18} />
                  Historical debrief
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setState(() => createBattleState())}
                >
                  <RotateCcw size={18} />
                  Replay
                </button>
              </div>
            </section>
          ) : null}
        </section>

        <aside className="side-stack">
          <section className="panel-card">
            <p className="source-label">
              <ScrollText size={14} />
              {evidenceLabels[historyMoment.kind]}
            </p>
            <h2>{historyMoment.title}</h2>
            <p>{historyMoment.text}</p>
          </section>

          <section className="panel-card">
            <p className="source-label">
              <Heart size={14} />
              Strategic consequence
            </p>
            <h2>Victory is not the only score</h2>
            <p>
              Keep the cost of war at or below{' '}
              {state.scenario.restraintTarget} impact to earn the restraint
              objective. Every point of damage on either side increases the
              total.
            </p>
          </section>

          <section className="panel-card">
            <p className="source-label">
              <Swords size={14} />
              Field dispatches
            </p>
            <ul className="battle-log" aria-live="polite">
              {state.log
                .slice(-5)
                .reverse()
                .map((entry, index) => (
                  <li key={`${entry}-${index}`}>{entry}</li>
                ))}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  )
}

function KalingaDebrief({
  state,
  onReplay,
  onCodex,
  onHome,
}: {
  state: BattleState
  onReplay: () => void
  onCodex: () => void
  onHome: () => void
}) {
  const result = state.result ? resultCopy[state.result] : null
  const restraintMet = state.humanCost <= state.scenario.restraintTarget
  return (
    <main className="page">
      <section className="kalinga-debrief-panel">
        <p className="eyebrow">
          <Flag size={14} />
          Historical debrief &middot; The Cost of Kalinga
        </p>
        <h1>{result ? result.title : 'The reconstruction ends'}</h1>
        <p>
          {result
            ? result.body
            : 'The scenario closed without a tactical decision. The historical record below stands regardless of the reconstruction.'}
        </p>

        <div className="kalinga-debrief-grid">
          <span>
            Outcome
            <strong>
              {state.result === 'maurya-victory'
                ? 'Mauryan advance'
                : state.result === 'kalinga-victory'
                  ? 'Advance halted'
                  : 'Contested field'}
            </strong>
          </span>
          <span>
            Restraint
            <strong>{restraintMet ? 'Objective met' : 'Heavy cost'}</strong>
          </span>
          <span>
            Cost of war
            <strong>
              {state.humanCost} / {state.scenario.restraintTarget} target
            </strong>
          </span>
          <span>
            Turns
            <strong>
              {state.turn} / {state.scenario.maxTurns}
            </strong>
          </span>
        </div>

        <div className="kalinga-debrief-evidence">
          <article>
            <p className="source-label">
              <ScrollText size={14} />
              Recorded evidence
            </p>
            <p>
              Ashoka&apos;s Major Rock Edict XIII records the conquest of Kalinga,
              the suffering it caused, his remorse, and his turn toward conquest
              through dhamma. Your tactical result changes this reconstruction
              only — never the historical record.
            </p>
          </article>
          <article>
            <p className="source-label">
              <Heart size={14} />
              What restraint means here
            </p>
            <p>
              {restraintMet
                ? 'You kept the modelled cost of war at or below the restraint target. The edict itself frames the human toll of Kalinga as the reason Ashoka renounced war of conquest.'
                : 'The modelled cost of war exceeded the restraint target. The edict states figures of 150,000 deported and 100,000 killed as Ashoka\u2019s own account of that toll.'}
            </p>
          </article>
        </div>

        <div className="result-actions">
          <button className="primary-button" type="button" onClick={onCodex}>
            <BookOpen size={18} />
            Read the full codex
          </button>
          <button className="secondary-button" type="button" onClick={onReplay}>
            <RotateCcw size={18} />
            Replay the battle
          </button>
          <button className="secondary-button" type="button" onClick={onHome}>
            <Home size={18} />
            Return to chronicles
          </button>
        </div>
      </section>
    </main>
  )
}

function App() {
  const [view, setView] = useState<View>('nanda')
  const [battle, setBattle] = useState<BattleState>(() => createBattleState())
  const [showKalingaIntro, setShowKalingaIntro] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [audioUnavailable, setAudioUnavailable] = useState(false)
  const [narrating, setNarrating] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [view])

  const startBattle = () => {
    setBattle(createBattleState())
    setShowKalingaIntro(true)
    setView('battle')
  }

  const startMaurya = () => {
    setView('maurya')
  }

  const startNanda = () => {
    setView('nanda')
  }

  const toggleNarration = async () => {
    const audio = audioRef.current
    if (!audio || audioUnavailable) {
      return
    }

    if (audio.paused) {
      try {
        await audio.play()
      } catch {
        setAudioUnavailable(true)
      }
    } else {
      audio.pause()
    }
  }

  return (
    <div className={`app-shell ${view === 'nanda' ? 'action-mode' : ''}`}>
      <audio
        ref={audioRef}
        src="./media/maurya/intro-narration.mp3"
        preload="metadata"
        onPlay={() => setNarrating(true)}
        onPause={() => setNarrating(false)}
        onEnded={() => setNarrating(false)}
        onError={() => setAudioUnavailable(true)}
      />

      {view !== 'nanda' ? (
      <header className="app-header">
        <button
          className="brand-button"
          type="button"
          onClick={() => setView('home')}
        >
          <span className="brand-mark">
            <Crown size={22} />
          </span>
          <span className="brand-copy">
            <strong>Chakravarti</strong>
            <span>Chronicles of Bharat</span>
          </span>
        </button>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <button
            className={`nav-button ${view === 'home' ? 'active' : ''}`}
            type="button"
            onClick={() => setView('home')}
          >
            Chronicles
          </button>
          <button
            className="nav-button"
            type="button"
            onClick={startNanda}
          >
            Action
          </button>
          <button
            className={`nav-button ${view === 'maurya' ? 'active' : ''}`}
            type="button"
            onClick={startMaurya}
          >
            Kingdom
          </button>
          <button
            className={`nav-button ${view === 'battle' ? 'active' : ''}`}
            type="button"
            onClick={startBattle}
          >
            Battle
          </button>
          <button
            className={`nav-button ${view === 'codex' ? 'active' : ''}`}
            type="button"
            onClick={() => setView('codex')}
          >
            Codex
          </button>
        </nav>

        <div className="header-actions">
          {view !== 'maurya' ? (
            <button
              className="icon-button"
              type="button"
              onClick={toggleNarration}
              disabled={audioUnavailable}
              aria-label={
                audioUnavailable
                  ? 'Narration unavailable'
                  : narrating
                    ? 'Pause chapter narration'
                    : 'Play chapter narration'
              }
              title={
                audioUnavailable
                  ? 'Narration unavailable'
                  : 'Play chapter narration'
              }
            >
              {narrating ? <Pause size={19} /> : <Volume2 size={19} />}
            </button>
          ) : null}
        </div>
      </header>
      ) : null}

      {view === 'home' ? (
        <HomeView
          onNanda={startNanda}
          onMaurya={startMaurya}
          onKalinga={startBattle}
          onCodex={() => setView('codex')}
          videoFailed={videoFailed}
          setVideoFailed={setVideoFailed}
        />
      ) : null}
      {view === 'nanda' ? (
        <Suspense
          fallback={
            <main className="action-loading">
              <Gamepad2 size={34} />
              <h2>Entering The Timber Gate...</h2>
            </main>
          }
        >
          <NandaCampaign onExit={() => setView('home')} />
        </Suspense>
      ) : null}
      {view === 'maurya' ? (
        <Suspense
          fallback={
            <main className="page">
              <section className="panel-card app-loading">
                <Crown size={28} />
                <h2>Preparing the 3D kingdom...</h2>
              </section>
            </main>
          }
        >
          <MauryaCampaign onExit={() => setView('home')} />
        </Suspense>
      ) : null}
      {view === 'battle' ? (
        showKalingaIntro ? (
          <Suspense fallback={null}>
            <KalingaIntro onBegin={() => setShowKalingaIntro(false)} />
          </Suspense>
        ) : (
          <BattleView
            state={battle}
            setState={(updater) => setBattle((current) => updater(current))}
            onExit={() => setView('home')}
            onDebrief={() => setView('kalinga-debrief')}
          />
        )
      ) : null}
      {view === 'kalinga-debrief' ? (
        <KalingaDebrief
          state={battle}
          onReplay={startBattle}
          onCodex={() => setView('codex')}
          onHome={() => setView('home')}
        />
      ) : null}
      {view === 'codex' ? <CodexView /> : null}

      {view !== 'nanda' ? (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <button
            className={view === 'home' ? 'active' : ''}
            type="button"
            onClick={() => setView('home')}
          >
            <Home size={19} />
            Chronicles
          </button>
          <button type="button" onClick={startNanda}>
            <Gamepad2 size={19} />
            Action
          </button>
          <button
            className={view === 'maurya' ? 'active' : ''}
            type="button"
            onClick={startMaurya}
          >
            <Crown size={19} />
            Kingdom
          </button>
          <button
            className={view === 'battle' ? 'active' : ''}
            type="button"
            onClick={startBattle}
          >
            <Swords size={19} />
            Battle
          </button>
          <button
            className={view === 'codex' ? 'active' : ''}
            type="button"
            onClick={() => setView('codex')}
          >
            <BookOpen size={19} />
            Codex
          </button>
        </nav>
      ) : null}
    </div>
  )
}

export default App
