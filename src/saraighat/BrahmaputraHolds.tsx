import { useEffect, useMemo, useReducer, useState } from 'react'
import {
  BookOpen,
  Check,
  Flag,
  Home,
  Landmark,
  RotateCcw,
  Ship,
  Swords,
  Waves,
  X,
} from 'lucide-react'
import '../chapters/campaign.css'
import {
  endingCopy,
  groundCopy,
  resourceCopy,
  saraighatActionOrder,
  saraighatActions,
  saraighatSourceById,
  saraighatSources,
} from './content'
import {
  actionForecast,
  createSaraighatCampaign,
  decideGround,
  saraighatReducer,
} from './engine'
import type { Corroboration, ResourceKey, SaraighatState } from './types'

const RESOURCE_ORDER: readonly ResourceKey[] = [
  'manpower',
  'embankments',
  'riverCraft',
  'alliances',
  'cohesion',
]

const EVIDENCE_LABEL: Record<string, string> = {
  'recorded-evidence': 'Recorded evidence',
  'claim-in-source': 'Claim in a source',
  'scholarly-inference': 'Scholarly inference',
  'gameplay-reconstruction': 'Gameplay reconstruction',
  'literary-tradition': 'Literary tradition',
}

const SAVE_KEY = 'chakravarti.brahmaputra-holds.save'

const loadState = (): SaraighatState => {
  if (typeof window === 'undefined') {
    return createSaraighatCampaign()
  }
  try {
    const raw = window.localStorage.getItem(SAVE_KEY)
    if (!raw) {
      return createSaraighatCampaign()
    }
    const parsed = JSON.parse(raw) as Partial<SaraighatState>
    if (
      parsed.schemaVersion === 1 &&
      parsed.campaignId === 'brahmaputra-holds' &&
      parsed.contentVersion === '0.11.0' &&
      parsed.resources &&
      Array.isArray(parsed.record)
    ) {
      return parsed as SaraighatState
    }
  } catch {
    /* fall through to a fresh campaign */
  }
  return createSaraighatCampaign()
}

/**
 * The chapter's signature display: the same event as both traditions record it,
 * side by side, with agreement marked. Saraighat is the one chapter in the
 * anthology where two independent traditions corroborate each other.
 */
function AccountRow({ entry }: { entry: Corroboration }) {
  const source = saraighatSourceById(entry.sourceId)
  return (
    <li className="cc-account">
      <p className="cc-account-head">
        {entry.title}
        <span className={`cc-agree ${entry.agrees ? 'yes' : 'no'}`}>
          {entry.agrees ? <Check size={11} /> : <X size={11} />}
          {entry.agrees ? 'Both traditions agree' : 'Traditions diverge'}
        </span>
        <span className={`cc-label label-${entry.label}`}>
          {EVIDENCE_LABEL[entry.label] ?? entry.label}
        </span>
      </p>
      <div className="cc-columns">
        <div className="cc-column">
          <p className="cc-column-title">Assamese buranjis</p>
          <p>{entry.buranji}</p>
        </div>
        <div className="cc-column">
          <p className="cc-column-title">Mughal-side accounts</p>
          <p>{entry.mughal}</p>
        </div>
      </div>
      {source ? <p className="cc-account-source">{source.title}</p> : null}
    </li>
  )
}

export default function BrahmaputraHolds({ onExit }: { onExit: () => void }) {
  const [state, dispatch] = useReducer(saraighatReducer, undefined, loadState)
  const [sourcesOpen, setSourcesOpen] = useState(false)

  useEffect(() => {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  }, [state])

  const restart = () => {
    window.localStorage.removeItem(SAVE_KEY)
    window.location.reload()
  }

  const ground = useMemo(() => decideGround(state), [state])

  if (state.phase === 'briefing') {
    return (
      <main className="page cc-page">
        <section className="panel-card cc-card">
          <p className="eyebrow">
            <Waves size={14} />
            Chapter III &middot; Lachit Borphukan
          </p>
          <h1>The Brahmaputra Holds</h1>
          <p className="cc-lede">
            The treaty left the kingdom stripped and the road to Guwahati in
            imperial hands. An imperial army is coming east again, and it is
            better than yours in every arm that matters on open ground.
          </p>
          <p>
            So do not fight it on open ground. This chapter has one real
            decision, made slowly across four years:{' '}
            <strong>where the battle happens.</strong> You never choose it from a
            menu &mdash; you earn it, by making every other approach impossible.
          </p>
          <ul className="cc-rules">
            <li>
              <Landmark size={15} />
              <span>
                Earthworks close the land approach. If they cannot come by land,
                they must come by river.
              </span>
            </li>
            <li>
              <Ship size={15} />
              <span>
                The river at Saraighat narrows to about a kilometre. A heavy
                fleet cannot deploy there; a light one can.
              </span>
            </li>
            <li>
              <Swords size={15} />
              <span>
                Accept battle in the open field and none of it counts. That is
                what happened at Alaboi.
              </span>
            </li>
            <li>
              <BookOpen size={15} />
              <span>
                Unusually for this anthology, two independent traditions describe
                this war. Each season shows you both.
              </span>
            </li>
          </ul>
          <div className="cc-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => dispatch({ type: 'BEGIN_CAMPAIGN' })}
            >
              <Flag size={17} />
              Move downstream to Guwahati
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

  if (state.phase === 'debrief') {
    const ending = state.ending ?? 'guwahati-falls'
    const copy = endingCopy[ending]
    const agreed = state.record.filter((entry) => entry.agrees).length
    return (
      <main className="page cc-page">
        <section className="panel-card cc-card">
          <p className="eyebrow">
            <Waves size={14} />
            Debrief &middot; {state.year}
          </p>
          <h1>{copy.title}</h1>
          <p className="cc-verdict">{copy.verdict}</p>
          <p>{copy.summary}</p>

          {state.battle ? (
            <>
              <h2>The ground that decided it</h2>
              <div className="cc-gauge">
                <p className="cc-gauge-title">
                  <Landmark size={15} />
                  {groundCopy[state.battle.ground].title}
                </p>
                <p style={{ margin: 0, fontSize: 13 }}>
                  {groundCopy[state.battle.ground].detail}
                </p>
              </div>
              <div className="cc-stats">
                <span>
                  Strength you could use
                  <strong>{Math.round(state.battle.ahomStrength)}</strong>
                </span>
                <span>
                  Strength they could use
                  <strong>{Math.round(state.battle.mughalStrength)}</strong>
                </span>
                <span>
                  Seasons held<strong>{state.turn}</strong>
                </span>
                <span>
                  Corroborated entries<strong>{agreed}</strong>
                </span>
              </div>
              <ul className="cc-lines">
                {state.battle.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          ) : null}

          <h2>
            The record
            <span className="cc-count">
              {agreed} of {state.record.length} corroborated
            </span>
          </h2>
          <ul className="cc-accounts">
            {state.record.map((entry, index) => (
              <AccountRow key={`${entry.id}-${index}`} entry={entry} />
            ))}
          </ul>

          <div className="cc-actions">
            <button className="primary-button" type="button" onClick={restart}>
              <RotateCcw size={17} />
              Fight the campaign again
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

  return (
    <main className="page cc-page">
      <section className="panel-card cc-card">
        <header className="cc-header">
          <div>
            <p className="eyebrow">
              <Waves size={14} />
              Season {state.turn} of {state.maxTurns}
            </p>
            <h1>
              {state.year}
              <span className="cc-sub"> &middot; the Brahmaputra</span>
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

        <section className="cc-gauge" aria-label="Imperial pressure">
          <p className="cc-gauge-title">
            <Swords size={15} />
            Imperial pressure
          </p>
          <div className="cc-track">
            <div
              className="cc-fill tone-danger"
              style={{ width: `${state.mughalPressure}%` }}
            />
          </div>
          <p className="cc-gauge-note">
            {Math.round(state.mughalPressure)}% &mdash; at full pressure they
            force the decision, ready or not.
          </p>
        </section>

        <section className="cc-gauge" aria-label="Where the battle will fall">
          <p className="cc-gauge-title">
            <Landmark size={15} />
            If they force it now: {groundCopy[ground].title}
          </p>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45 }}>
            {groundCopy[ground].detail}
          </p>
        </section>

        <section className="cc-resources" aria-label="Preparation">
          {RESOURCE_ORDER.map((key) => (
            <span key={key} title={resourceCopy[key].description}>
              {resourceCopy[key].title}
              <strong>{Math.round(state.resources[key])}</strong>
            </span>
          ))}
        </section>

        {state.report.length ? (
          <p className="cc-report">{state.report.join(' ')}</p>
        ) : null}

        <h2>Choose the season</h2>
        <ul className="cc-choices">
          {saraighatActionOrder.map((actionId) => {
            const action = saraighatActions[actionId]
            const forecast = actionForecast(state, actionId)
            const grave = actionId === 'accept-open-battle'
            return (
              <li key={actionId}>
                <button
                  type="button"
                  className={`cc-choice${grave ? ' is-grave' : ''}`}
                  disabled={!forecast.allowed}
                  onClick={() => dispatch({ type: 'TAKE_ACTION', actionId })}
                >
                  <span className="cc-choice-title">{action.title}</span>
                  <span className="cc-choice-summary">{action.summary}</span>
                  <span className="cc-choice-rationale">{action.rationale}</span>
                  <span className="cc-choice-meta">
                    {Object.entries(action.delta).map(([key, value]) => (
                      <span key={key} className={value >= 0 ? 'cc-up' : 'cc-down'}>
                        {resourceCopy[key as ResourceKey].title}{' '}
                        {value >= 0 ? '+' : ''}
                        {value}
                      </span>
                    ))}
                    {action.pressureDelta ? (
                      <span
                        className={action.pressureDelta < 0 ? 'cc-up' : 'cc-down'}
                      >
                        Pressure {action.pressureDelta > 0 ? '+' : ''}
                        {action.pressureDelta}
                      </span>
                    ) : null}
                  </span>
                  {!forecast.allowed && forecast.reason ? (
                    <span className="cc-blocked">{forecast.reason}</span>
                  ) : null}
                </button>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              className="cc-choice is-grave"
              onClick={() => dispatch({ type: 'ACCEPT_TERMS' })}
            >
              <span className="cc-choice-title">Accept the imperial terms</span>
              <span className="cc-choice-summary">
                Give up Guwahati by agreement and end the war now.
              </span>
              <span className="cc-choice-rationale">
                The offer is real and the council genuinely debated it. The
                argument against: no field commander&apos;s assurance binds Delhi.
              </span>
              <span className="cc-blocked">Ends the campaign immediately.</span>
            </button>
          </li>
        </ul>

        <h2>
          The record so far
          <span className="cc-count">{state.record.length} entries</span>
        </h2>
        {state.record.length ? (
          <ul className="cc-accounts">
            {[...state.record].reverse().map((entry, index) => (
              <AccountRow key={`${entry.id}-${index}`} entry={entry} />
            ))}
          </ul>
        ) : (
          <p className="cc-empty">Nothing has been recorded yet.</p>
        )}

        {sourcesOpen ? (
          <div className="cc-sources">
            <h2>Sources</h2>
            <ul>
              {saraighatSources.map((source) => (
                <li key={source.id}>
                  <strong>{source.title}</strong>
                  <span>{source.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="cc-actions">
          <button className="secondary-button" type="button" onClick={onExit}>
            <Home size={17} />
            Chronicles
          </button>
          <button className="danger-button" type="button" onClick={restart}>
            <RotateCcw size={17} />
            Restart
          </button>
        </div>
      </section>
    </main>
  )
}
