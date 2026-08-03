import { useEffect, useReducer, useState } from 'react'
import {
  BookOpen,
  Flag,
  Home,
  Mountain,
  RotateCcw,
  ScrollText,
  Shield,
  Users,
} from 'lucide-react'
import '../chapters/campaign.css'
import {
  endingCopy,
  narraiActionOrder,
  narraiActions,
  narraiSourceById,
  narraiSources,
  resourceCopy,
  survivingAccount,
} from './content'
import { actionForecast, createNarraiCampaign, narraiReducer } from './engine'
import type { NarraiState, ResourceKey } from './types'

const RESOURCE_ORDER: readonly ResourceKey[] = [
  'ground',
  'warriors',
  'elephants',
  'sheltered',
  'resolve',
]

const EVIDENCE_LABEL: Record<string, string> = {
  'recorded-evidence': 'Recorded evidence',
  'claim-in-source': 'Claim in a source',
  'scholarly-inference': 'Scholarly inference',
  'gameplay-reconstruction': 'Gameplay reconstruction',
  'literary-tradition': 'Literary tradition',
}

const SAVE_KEY = 'chakravarti.defiance-at-narrai.save'

const loadState = (): NarraiState => {
  if (typeof window === 'undefined') {
    return createNarraiCampaign()
  }
  try {
    const raw = window.localStorage.getItem(SAVE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<NarraiState>
      if (
        parsed.schemaVersion === 1 &&
        parsed.campaignId === 'defiance-at-narrai' &&
        parsed.contentVersion === '0.11.0' &&
        parsed.resources &&
        Array.isArray(parsed.deeds)
      ) {
        return parsed as NarraiState
      }
    }
  } catch {
    /* fall through */
  }
  return createNarraiCampaign()
}

export default function DefianceAtNarrai({ onExit }: { onExit: () => void }) {
  const [state, dispatch] = useReducer(narraiReducer, undefined, loadState)
  const [sourcesOpen, setSourcesOpen] = useState(false)

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
            Chapter IV &middot; Rani Durgavati
          </p>
          <h1>The Defiance at Narrai</h1>
          <p className="cc-lede">
            Malwa has fallen, so the empire is now the neighbour. A force has
            crossed the border with the emperor&apos;s permission, and it is
            better than yours in every arm that counts.
          </p>
          <p>
            You cannot win this. The chapter does not offer a version in which
            you do. Narrai is a defile &mdash; hills on one side, the Gaur and
            the Narmada on the other &mdash; and what you control is what you are
            willing to spend, and for what.
          </p>
          <ul className="cc-rules">
            <li>
              <Shield size={15} />
              <span>
                Hold the narrow ground and the invasion pays for every hour. It
                costs you warriors you cannot replace.
              </span>
            </li>
            <li>
              <Users size={15} />
              <span>
                Or spend the day emptying the villages instead. The kingdom is
                not the army.
              </span>
            </li>
            <li>
              <ScrollText size={15} />
              <span>
                Afterwards you will read the only account of this campaign that
                survives. It was written by the people you fought.
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
              Form up at Narrai
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

  if (state.phase === 'epilogue') {
    const ending = state.ending ?? 'overrun'
    const copy = endingCopy[ending]
    const preserved = state.deeds.filter((d) => d.preserved)
    const lost = state.deeds.filter((d) => !d.preserved)
    return (
      <main className="page cc-page">
        <section className="panel-card cc-card">
          <p className="eyebrow">
            <Mountain size={14} />
            Epilogue &middot; 1564
          </p>
          <h1>{copy.title}</h1>
          <p className="cc-verdict">{copy.verdict}</p>
          <p>{copy.summary}</p>

          <div className="cc-stats">
            <span>
              Price imposed<strong>{Math.round(state.costImposed)}</strong>
            </span>
            <span>
              People sheltered
              <strong>{Math.round(state.resources.sheltered)}</strong>
            </span>
            <span>
              Things you did<strong>{state.deeds.length}</strong>
            </span>
            <span>
              Things the record keeps<strong>{preserved.length}</strong>
            </span>
          </div>

          <h2>The account that survives</h2>
          <div className="cc-account">
            <p className="cc-account-head">
              The imperial chronicle
              <span className="cc-label label-claim-in-source">
                Claim in a source
              </span>
            </p>
            <div className="cc-column">
              {survivingAccount.map((line) => (
                <p key={line} style={{ marginBottom: 6 }}>
                  {line}
                </p>
              ))}
            </div>
            <p className="cc-account-source">
              This is the whole of it. No contemporary Gond account of this
              campaign is known to survive.
            </p>
          </div>

          <h2>
            What the record does not keep
            <span className="cc-count">{lost.length} of {state.deeds.length}</span>
          </h2>
          {lost.length ? (
            <ul className="cc-accounts">
              {lost.map((deed, index) => (
                <li className="cc-account" key={`${deed.id}-${index}`}>
                  <p className="cc-account-head">
                    {deed.title}
                    <span className={`cc-label label-${deed.label}`}>
                      {EVIDENCE_LABEL[deed.label] ?? deed.label}
                    </span>
                  </p>
                  <div className="cc-column">
                    <p>{deed.deed}</p>
                  </div>
                  <p className="cc-account-source">
                    {narraiSourceById(deed.sourceId)?.title}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cc-empty">
              Nothing you did fell outside the account &mdash; because you did
              very little.
            </p>
          )}

          <h2>The queen</h2>
          <div className="cc-account">
            <p className="cc-account-head">
              What the surviving source reports
              <span className="cc-label label-claim-in-source">
                Claim in a source
              </span>
            </p>
            <div className="cc-column">
              <p>
                The imperial account states that, wounded and with the position
                lost, the queen took her own life rather than be captured. There
                is no independent account of this, and no Gond record of it at
                all. It is reported here once, as that source reports it, and it
                is not part of anything you played.
              </p>
            </div>
          </div>

          <div className="cc-actions">
            <button className="primary-button" type="button" onClick={restart}>
              <RotateCcw size={17} />
              Fight the withdrawal again
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
              Day {state.turn} of {state.maxTurns}
            </p>
            <h1>
              Narrai<span className="cc-sub"> &middot; 1564</span>
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

        <section className="cc-gauge" aria-label="Price imposed on the invasion">
          <p className="cc-gauge-title">
            <Shield size={15} />
            Price imposed on the invasion
          </p>
          <div className="cc-track">
            <div
              className="cc-fill tone-accent"
              style={{ width: `${state.costImposed}%` }}
            />
          </div>
          <p className="cc-gauge-note">
            {Math.round(state.costImposed)}% &mdash; the only thing you can still
            take from them.
          </p>
        </section>

        <section className="cc-resources" aria-label="What is left">
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

        <h2>Spend the day</h2>
        <ul className="cc-choices">
          {narraiActionOrder.map((actionId) => {
            const action = narraiActions[actionId]
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
                    {action.costDelta ? (
                      <span className="cc-up">Price +{action.costDelta}</span>
                    ) : null}
                    {Object.entries(action.delta).map(([key, value]) => (
                      <span key={key} className={value >= 0 ? 'cc-up' : 'cc-down'}>
                        {resourceCopy[key as ResourceKey].title}{' '}
                        {value >= 0 ? '+' : ''}
                        {value}
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
        </ul>

        {sourcesOpen ? (
          <div className="cc-sources">
            <h2>Sources</h2>
            <ul>
              {narraiSources.map((source) => (
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
