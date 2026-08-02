import { useEffect, useMemo, useReducer, useState } from 'react'
import {
  BookOpen,
  Coins,
  Crown,
  Flag,
  Home,
  Info,
  Landmark,
  RotateCcw,
  ScrollText,
  Sparkles,
} from 'lucide-react'
import './WesternHorizon.css'
import {
  endingCopy,
  resourceCopy,
  vikramaActionOrder,
  vikramaActions,
  vikramaSourceById,
  vikramaSources,
} from './content'
import {
  actionForecast,
  durableArtifacts,
  guptaYearToCe,
  vikramaCampaignReducer,
} from './engine'
import {
  clearVikramaCampaign,
  loadVikramaCampaign,
  saveVikramaCampaign,
} from './persistence'
import type {
  ArtifactKind,
  CoinageSample,
  EvidenceArtifact,
  ResourceKey,
} from './types'

const RESOURCE_ORDER: readonly ResourceKey[] = [
  'reach',
  'acceptance',
  'treasury',
  'legitimacy',
  'alliance',
]

const ARTIFACT_ICON: Record<ArtifactKind, typeof Coins> = {
  coin: Coins,
  inscription: Landmark,
  'dynastic-record': ScrollText,
  absence: Info,
}

const ARTIFACT_LABEL: Record<ArtifactKind, string> = {
  coin: 'Coin',
  inscription: 'Inscription',
  'dynastic-record': 'Dynastic record',
  absence: 'No trace',
}

const EVIDENCE_LABEL: Record<string, string> = {
  'recorded-evidence': 'Recorded evidence',
  'claim-in-source': 'Claim in a source',
  'scholarly-inference': 'Scholarly inference',
  'gameplay-reconstruction': 'Gameplay reconstruction',
  'literary-tradition': 'Literary tradition',
}

/**
 * The coinage handover, drawn from the player's own campaign.
 *
 * This is the chapter's argument in one picture: the moment Kshatrapa silver
 * falls and Gupta silver rises is the moment a historian can actually date. Two
 * plain lines, directly labelled, no legend, no gridline decoration.
 */
function CoinageChart({ samples }: { samples: readonly CoinageSample[] }) {
  const width = 320
  const height = 132
  const padX = 8
  const padY = 10

  const points = (key: 'kshatrapa' | 'gupta') =>
    samples
      .map((sample, index) => {
        const x =
          padX +
          (index / Math.max(1, samples.length - 1)) * (width - padX * 2)
        const y = padY + (1 - sample[key] / 100) * (height - padY * 2)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')

  const last = samples.at(-1)
  const crossing = samples.findIndex(
    (sample) => sample.gupta >= sample.kshatrapa,
  )

  return (
    <figure className="wh-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Silver in circulation from ${guptaYearToCe(
          samples[0]?.guptaYear ?? 0,
        )} to ${guptaYearToCe(last?.guptaYear ?? 0)} CE. Kshatrapa silver ends at ${Math.round(
          last?.kshatrapa ?? 0,
        )} percent, Gupta silver at ${Math.round(last?.gupta ?? 0)} percent.`}
      >
        {crossing > 0 ? (
          <line
            className="wh-chart-crossing"
            x1={
              padX +
              (crossing / Math.max(1, samples.length - 1)) * (width - padX * 2)
            }
            y1={padY}
            x2={
              padX +
              (crossing / Math.max(1, samples.length - 1)) * (width - padX * 2)
            }
            y2={height - padY}
          />
        ) : null}
        <polyline className="wh-line wh-line-kshatrapa" points={points('kshatrapa')} />
        <polyline className="wh-line wh-line-gupta" points={points('gupta')} />
      </svg>
      <figcaption>
        <span className="wh-key wh-key-kshatrapa">
          Kshatrapa silver — {Math.round(last?.kshatrapa ?? 0)}%
        </span>
        <span className="wh-key wh-key-gupta">
          Gupta silver, their standard — {Math.round(last?.gupta ?? 0)}%
        </span>
      </figcaption>
    </figure>
  )
}

function EvidenceRow({ artifact }: { artifact: EvidenceArtifact }) {
  const Icon = ARTIFACT_ICON[artifact.kind]
  const source = vikramaSourceById(artifact.sourceId)
  return (
    <li className={`wh-artifact kind-${artifact.kind}`}>
      <span className="wh-artifact-icon">
        <Icon size={16} />
      </span>
      <div>
        <p className="wh-artifact-head">
          <strong>{artifact.title}</strong>
          <span className="wh-artifact-year">
            {guptaYearToCe(artifact.guptaYear)} CE
          </span>
        </p>
        <p className="wh-artifact-detail">{artifact.detail}</p>
        <p className="wh-artifact-meta">
          <span className={`wh-label label-${artifact.label}`}>
            {EVIDENCE_LABEL[artifact.label] ?? artifact.label}
          </span>
          <span>{ARTIFACT_LABEL[artifact.kind]}</span>
          {source ? <span>{source.title}</span> : null}
        </p>
      </div>
    </li>
  )
}

export default function WesternHorizon({ onExit }: { onExit: () => void }) {
  const initial = useMemo(() => loadVikramaCampaign(), [])
  const [state, dispatch] = useReducer(
    vikramaCampaignReducer,
    initial.state,
  )
  const [warning, setWarning] = useState(initial.warning)
  const [sourcesOpen, setSourcesOpen] = useState(false)

  useEffect(() => {
    saveVikramaCampaign(state)
  }, [state])

  const restart = () => {
    clearVikramaCampaign()
    setWarning(undefined)
    window.location.reload()
  }

  if (state.phase === 'briefing') {
    return (
      <main className="page wh-page">
        <section className="panel-card wh-briefing">
          <p className="eyebrow">
            <Crown size={14} />
            Chapter II &middot; Chandragupta II
          </p>
          <h1>The Western Horizon</h1>
          <p className="wh-lede">
            No surviving account tells how the Guptas took the west. There is no
            battle name, no casualty figure, no campaign diary. What there is:
            Western Kshatrapa silver stops being struck, and Chandragupta II&apos;s
            silver &mdash; cut to their weight so their markets would take it &mdash;
            appears in its place.
          </p>
          <p>
            So this chapter does not give you a battle to win. It gives you a
            reign to conduct, and then asks a harder question: after sixteen
            centuries, what can anyone still prove you did?
          </p>
          <ul className="wh-rules">
            <li>
              <Coins size={15} />
              <span>
                Displace their coinage and you leave the firmest evidence a reign
                can make.
              </span>
            </li>
            <li>
              <Landmark size={15} />
              <span>
                Endowments and officers&apos; inscriptions fix your rule to a
                datable year.
              </span>
            </li>
            <li>
              <Info size={15} />
              <span>
                Marches, garrisons and quiet seasons leave nothing at all. Win
                that way and the record will forget you.
              </span>
            </li>
          </ul>
          {warning ? <p className="wh-warning">{warning}</p> : null}
          <div className="wh-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => dispatch({ type: 'BEGIN_CAMPAIGN' })}
            >
              <Flag size={17} />
              Open the western campaign
            </button>
            <button className="secondary-button" type="button" onClick={onExit}>
              <Home size={17} />
              Chronicles
            </button>
          </div>
        </section>
      </main>
    )
  }

  if (state.phase === 'dossier') {
    const ending = state.ending ?? 'hollow-conquest'
    const copy = endingCopy[ending]
    const durable = durableArtifacts(state.evidence)
    const absences = state.evidence.filter((a) => a.kind === 'absence')
    return (
      <main className="page wh-page">
        <section className="panel-card wh-dossier">
          <p className="eyebrow">
            <BookOpen size={14} />
            The historian&apos;s dossier &middot; compiled c. 2026 CE
          </p>
          <h1>{copy.title}</h1>
          <p className="wh-verdict">{copy.verdict}</p>
          <p>{copy.summary}</p>

          <h2>Silver in circulation</h2>
          <CoinageChart samples={state.coinageHistory} />

          <div className="wh-dossier-grid">
            <span>
              Durable artifacts<strong>{durable.length}</strong>
            </span>
            <span>
              Seasons that left no trace<strong>{absences.length}</strong>
            </span>
            <span>
              Final reach<strong>{Math.round(state.resources.reach)}</strong>
            </span>
            <span>
              Final acceptance
              <strong>{Math.round(state.resources.acceptance)}</strong>
            </span>
          </div>

          <h2>What survives</h2>
          {durable.length ? (
            <ul className="wh-artifacts">
              {durable.map((artifact) => (
                <EvidenceRow key={artifact.id + artifact.guptaYear} artifact={artifact} />
              ))}
            </ul>
          ) : (
            <p className="wh-empty">
              Nothing. Every season of this reign passed without producing a
              coin, an inscription or a charter that a later historian could
              date or attribute.
            </p>
          )}

          <h2>What did not</h2>
          <ul className="wh-artifacts">
            {absences.map((artifact, index) => (
              <EvidenceRow key={`${artifact.id}-${index}`} artifact={artifact} />
            ))}
          </ul>

          <div className="wh-actions">
            <button className="primary-button" type="button" onClick={restart}>
              <RotateCcw size={17} />
              Conduct the reign again
            </button>
            <button className="secondary-button" type="button" onClick={onExit}>
              <Home size={17} />
              Chronicles
            </button>
          </div>
        </section>
      </main>
    )
  }

  const durable = durableArtifacts(state.evidence)

  return (
    <main className="page wh-page">
      <section className="panel-card wh-campaign">
        <header className="wh-header">
          <div>
            <p className="eyebrow">
              <Crown size={14} />
              Season {state.turn} of {state.maxTurns}
            </p>
            <h1>
              Gupta era {state.guptaYear}
              <span> &middot; c. {guptaYearToCe(state.guptaYear)} CE</span>
            </h1>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setSourcesOpen((open) => !open)}
          >
            <BookOpen size={16} />
            Sources
          </button>
        </header>

        <section className="wh-coinage" aria-label="Silver in circulation">
          <p className="wh-coinage-title">
            <Coins size={15} />
            Silver in the western markets
          </p>
          <div className="wh-bar">
            <div
              className="wh-bar-kshatrapa"
              style={{ width: `${state.coinage.kshatrapa}%` }}
            />
            <div
              className="wh-bar-gupta"
              style={{ width: `${state.coinage.gupta}%` }}
            />
          </div>
          <p className="wh-bar-keys">
            <span className="wh-key wh-key-kshatrapa">
              Kshatrapa {Math.round(state.coinage.kshatrapa)}%
            </span>
            <span className="wh-key wh-key-gupta">
              Gupta {Math.round(state.coinage.gupta)}%
            </span>
          </p>
        </section>

        <section className="wh-resources" aria-label="Standing">
          {RESOURCE_ORDER.map((key) => (
            <span key={key} title={resourceCopy[key].description}>
              {resourceCopy[key].title}
              <strong>{Math.round(state.resources[key])}</strong>
            </span>
          ))}
        </section>

        {state.report.length ? (
          <p className="wh-report">{state.report.join(' ')}</p>
        ) : null}

        <h2>Choose the season</h2>
        <ul className="wh-choices">
          {vikramaActionOrder.map((actionId) => {
            const action = vikramaActions[actionId]
            const forecast = actionForecast(state, actionId)
            const leavesNothing = action.artifact?.kind === 'absence'
            return (
              <li key={actionId}>
                <button
                  type="button"
                  className={`wh-choice${leavesNothing ? ' leaves-nothing' : ''}`}
                  disabled={!forecast.allowed}
                  onClick={() =>
                    dispatch({ type: 'TAKE_ACTION', actionId })
                  }
                >
                  <span className="wh-choice-title">{action.title}</span>
                  <span className="wh-choice-summary">{action.summary}</span>
                  <span className="wh-choice-rationale">{action.rationale}</span>
                  <span className="wh-choice-meta">
                    {Object.entries(action.delta).map(([key, value]) => (
                      <span
                        key={key}
                        className={value >= 0 ? 'delta-up' : 'delta-down'}
                      >
                        {resourceCopy[key as ResourceKey].title}{' '}
                        {value >= 0 ? '+' : ''}
                        {value}
                      </span>
                    ))}
                  </span>
                  <span
                    className={`wh-choice-record${leavesNothing ? ' none' : ''}`}
                  >
                    {leavesNothing ? <Info size={13} /> : <Sparkles size={13} />}
                    {forecast.recordNote}
                  </span>
                  {!forecast.allowed && forecast.reason ? (
                    <span className="wh-choice-blocked">{forecast.reason}</span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>

        <h2>
          The record so far
          <span className="wh-count">
            {durable.length} durable / {state.evidence.length} seasons
          </span>
        </h2>
        {state.evidence.length ? (
          <ul className="wh-artifacts">
            {[...state.evidence]
              .reverse()
              .map((artifact, index) => (
                <EvidenceRow
                  key={`${artifact.id}-${index}`}
                  artifact={artifact}
                />
              ))}
          </ul>
        ) : (
          <p className="wh-empty">Nothing has been recorded yet.</p>
        )}

        {sourcesOpen ? (
          <div className="wh-sources">
            <h2>Sources</h2>
            <ul>
              {vikramaSources.map((source) => (
                <li key={source.id}>
                  <strong>{source.title}</strong>
                  <span>{source.detail}</span>
                  {source.url ? (
                    <a href={source.url} target="_blank" rel="noreferrer">
                      Open source
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="wh-actions">
          <button className="secondary-button" type="button" onClick={onExit}>
            <Home size={17} />
            Chronicles
          </button>
          <button className="danger-button" type="button" onClick={restart}>
            <RotateCcw size={17} />
            Restart the reign
          </button>
        </div>
      </section>
    </main>
  )
}
