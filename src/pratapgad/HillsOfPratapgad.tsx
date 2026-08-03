import { useEffect, useMemo, useReducer, useState } from 'react'
import {
  BookOpen,
  Eye,
  Flag,
  HelpCircle,
  Home,
  Mountain,
  RotateCcw,
  Route,
} from 'lucide-react'
import '../chapters/campaign.css'
import {
  disputedPoints,
  endingCopy,
  pratapgadActionOrder,
  pratapgadActions,
  pratapgadSourceById,
  pratapgadSources,
  resourceCopy,
} from './content'
import {
  READINESS_KEYS,
  actionForecast,
  assessReadiness,
  createPratapgadCampaign,
  pratapgadReducer,
} from './engine'
import type { PratapgadState, ResourceKey } from './types'

const EVIDENCE_LABEL: Record<string, string> = {
  'recorded-evidence': 'Recorded evidence',
  'claim-in-source': 'Claim in a source',
  'scholarly-inference': 'Scholarly inference',
  'gameplay-reconstruction': 'Gameplay reconstruction',
  'literary-tradition': 'Literary tradition',
}

const SAVE_KEY = 'chakravarti.hills-of-pratapgad.save'

const loadState = (): PratapgadState => {
  if (typeof window === 'undefined') {
    return createPratapgadCampaign()
  }
  try {
    const raw = window.localStorage.getItem(SAVE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PratapgadState>
      if (
        parsed.schemaVersion === 1 &&
        parsed.campaignId === 'hills-of-pratapgad' &&
        parsed.contentVersion === '0.11.0' &&
        parsed.resources &&
        Array.isArray(parsed.preparations)
      ) {
        return parsed as PratapgadState
      }
    }
  } catch {
    /* fall through */
  }
  return createPratapgadCampaign()
}

export default function HillsOfPratapgad({ onExit }: { onExit: () => void }) {
  const [state, dispatch] = useReducer(pratapgadReducer, undefined, loadState)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const readiness = useMemo(() => assessReadiness(state), [state])

  useEffect(() => {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  }, [state])

  const restart = () => {
    window.localStorage.removeItem(SAVE_KEY)
    window.location.reload()
  }

  if (state.phase === 'briefing') {
    return (
      <main className="page cc-page">
        <section className="panel-card cc-card">
          <p className="eyebrow">
            <Mountain size={14} />
            Chapter V &middot; Pratapgad, 1659
          </p>
          <h1>The Hills of Pratapgad</h1>
          <p className="cc-lede">
            A meeting has been agreed beneath the fort, and both sides are
            arranging how it will happen. You command the hills around it.
          </p>
          <p>
            You will not fight in this chapter. There is no strike, no duel and
            no target. What happens at the pavilion is the most disputed few
            minutes in this anthology, and the surviving accounts contradict each
            other on the central question. This game does not settle it.
          </p>
          <p>
            What you control is the ground: what is known, what is watched, what
            is hidden, what can be signalled, and whether there is a road home.
          </p>
          <ul className="cc-rules">
            <li>
              <Eye size={15} />
              <span>
                Steep, wooded country. A party can pass within a hundred paces
                and never be seen &mdash; by them or by you.
              </span>
            </li>
            <li>
              <Route size={15} />
              <span>
                Five things matter, and the arrangement fails at its weakest one,
                not its average.
              </span>
            </li>
            <li>
              <HelpCircle size={15} />
              <span>
                Afterwards you will be shown the disputed questions, and the
                reasons they remain open.
              </span>
            </li>
          </ul>
          <div className="cc-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => dispatch({ type: 'BEGIN_PREPARATION' })}
            >
              <Flag size={17} />
              Begin arranging the ground
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

  if (state.phase === 'aftermath') {
    const ending = state.ending ?? 'exposed'
    const copy = endingCopy[ending]
    return (
      <main className="page cc-page">
        <section className="panel-card cc-card">
          <p className="eyebrow">
            <Mountain size={14} />
            Aftermath &middot; 10 November 1659
          </p>
          <h1>{copy.title}</h1>
          <p className="cc-verdict">{copy.verdict}</p>
          <p>{copy.summary}</p>

          <div className="cc-account">
            <p className="cc-account-head">
              What happened at the pavilion
              <span className="cc-label label-claim-in-source">
                Disputed &middot; not depicted
              </span>
            </p>
            <div className="cc-column">
              <p>
                The two principals met beneath the fort, and the meeting ended in
                violence in which the Adilshahi commander was killed. The
                surrounding forces then engaged. Beyond that, the accounts do not
                agree, and this chapter does not depict the encounter or assign
                responsibility for it.
              </p>
            </div>
          </div>

          <h2>The ground as you left it</h2>
          <div className="cc-stats">
            <span>
              Readiness<strong>{Math.round(readiness.percent)}%</strong>
            </span>
            <span>
              Weakest element
              <strong style={{ fontSize: 13 }}>
                {resourceCopy[readiness.weakest].title}
              </strong>
            </span>
            <span>
              Preparations made<strong>{state.preparations.length}</strong>
            </span>
          </div>
          <ul className="cc-lines">
            {readiness.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          <h2>What the accounts disagree about</h2>
          <ul className="cc-accounts">
            {disputedPoints.map((point) => (
              <li className="cc-account" key={point.id}>
                <p className="cc-account-head">
                  {point.question}
                  <span className="cc-agree no">Unresolved</span>
                </p>
                <div className="cc-columns">
                  {point.accounts.map((account) => (
                    <div className="cc-column" key={account.tradition}>
                      <p className="cc-column-title">{account.tradition}</p>
                      <p>{account.claim}</p>
                    </div>
                  ))}
                </div>
                <p className="cc-account-source">{point.unresolved}</p>
              </li>
            ))}
          </ul>

          <div className="cc-actions">
            <button className="primary-button" type="button" onClick={restart}>
              <RotateCcw size={17} />
              Arrange the ground again
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
              <Mountain size={14} />
              Preparation {state.turn} of {state.maxTurns}
            </p>
            <h1>
              Pratapgad<span className="cc-sub"> &middot; November 1659</span>
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

        <section className="cc-gauge" aria-label="Readiness">
          <p className="cc-gauge-title">
            <Route size={15} />
            The arrangement holds only as well as its weakest part
          </p>
          <div className="cc-track">
            <div
              className="cc-fill tone-link"
              style={{ width: `${Math.min(100, readiness.percent)}%` }}
            />
          </div>
          <p className="cc-gauge-note">
            Weakest: {resourceCopy[readiness.weakest].title} (
            {Math.round(state.resources[readiness.weakest])})
          </p>
        </section>

        <section className="cc-resources" aria-label="The ground">
          {READINESS_KEYS.map((key) => (
            <span key={key} title={resourceCopy[key].description}>
              {resourceCopy[key].title}
              <strong>{Math.round(state.resources[key])}</strong>
            </span>
          ))}
        </section>

        {state.report.length ? (
          <p className="cc-report">{state.report.join(' ')}</p>
        ) : null}

        <h2>Arrange the ground</h2>
        <ul className="cc-choices">
          {pratapgadActionOrder.map((actionId) => {
            const action = pratapgadActions[actionId]
            const forecast = actionForecast(state, actionId)
            return (
              <li key={actionId}>
                <button
                  type="button"
                  className="cc-choice"
                  disabled={!forecast.allowed}
                  onClick={() => dispatch({ type: 'TAKE_ACTION', actionId })}
                >
                  <span className="cc-choice-title">{action.title}</span>
                  <span className="cc-choice-summary">{action.summary}</span>
                  <span className="cc-choice-rationale">{action.rationale}</span>
                  <span className="cc-choice-meta">
                    {Object.entries(action.delta).map(([key, value]) => (
                      <span key={key} className="cc-up">
                        {resourceCopy[key as ResourceKey].title} +{value}
                      </span>
                    ))}
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
              onClick={() => dispatch({ type: 'COMMIT' })}
            >
              <span className="cc-choice-title">Go down to the meeting</span>
              <span className="cc-choice-summary">
                Stop preparing. The encounter happens with the ground as it
                stands.
              </span>
              <span className="cc-choice-rationale">
                Nothing more can be arranged once this is chosen.
              </span>
              <span className="cc-blocked">Ends preparation immediately.</span>
            </button>
          </li>
        </ul>

        <h2>
          Arranged so far
          <span className="cc-count">{state.preparations.length}</span>
        </h2>
        {state.preparations.length ? (
          <ul className="cc-accounts">
            {[...state.preparations].reverse().map((prep, index) => (
              <li className="cc-account" key={`${prep.id}-${index}`}>
                <p className="cc-account-head">
                  {prep.title}
                  <span className={`cc-label label-${prep.label}`}>
                    {EVIDENCE_LABEL[prep.label] ?? prep.label}
                  </span>
                </p>
                <div className="cc-column">
                  <p>{prep.detail}</p>
                </div>
                <p className="cc-account-source">
                  {pratapgadSourceById(prep.sourceId)?.title}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="cc-empty">Nothing has been arranged yet.</p>
        )}

        {sourcesOpen ? (
          <div className="cc-sources">
            <h2>Sources</h2>
            <ul>
              {pratapgadSources.map((source) => (
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
