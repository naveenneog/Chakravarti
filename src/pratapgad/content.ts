import type {
  ActionId,
  CampaignAction,
  DisputedPoint,
  SourceRecord,
} from './types'

export const pratapgadSources: readonly SourceRecord[] = [
  {
    id: 'contested-event',
    title: 'A contested event',
    detail:
      'The meeting beneath Pratapgad on 10 November 1659 is described in Marathi, Persian and later European accounts, and in bakhar narratives written well afterwards. They disagree about preparation, intent and above all about who attacked first. This chapter does not choose between them.',
  },
  {
    id: 'terrain-pratapgad',
    title: 'The ground below the fort',
    detail:
      'Pratapgad stands above steep, densely wooded slopes in the Western Ghats. The approach is constricted and broken \u2014 country in which a large force cannot deploy, observation is difficult, and movement is slow. The terrain is the least disputed fact in the whole episode.',
  },
  {
    id: 'bakhar-tradition',
    title: 'The bakhar narratives',
    detail:
      'Marathi prose chronicles composed decades to centuries after the event. They preserve a detailed tradition and are a genuine source, but they are late, literary, and were shaped by the purposes of their compilers.',
  },
  {
    id: 'persian-accounts',
    title: 'Persian and Adilshahi-side accounts',
    detail:
      'Accounts written from the Bijapur side and in later Mughal-period Persian histories. They are hostile to the Maratha reading of events and are equally shaped by the purpose of their authors.',
  },
  {
    id: 'european-reports',
    title: 'Contemporary European factory reports',
    detail:
      'English and other European trading-post correspondence from the period mentions the episode at a distance. These reports are close in time but far from the event, and their information is second-hand.',
  },
  {
    id: 'preparation-inference',
    title: 'The inference of preparation',
    detail:
      'That the meeting place was prepared \u2014 a pavilion built, paths cleared, forces positioned in the surrounding country \u2014 is generally accepted across the traditions, even where their explanations of why differ completely. The specific dispositions in this chapter are gameplay reconstruction.',
  },
]

export const pratapgadSourceById = (sourceId: string) =>
  pratapgadSources.find((source) => source.id === sourceId)

export const pratapgadActions: Record<ActionId, CampaignAction> = {
  'scout-approach': {
    id: 'scout-approach',
    title: 'Scout the wooded approach',
    summary:
      'Send small parties down the slopes to learn the paths, the sightlines and where a column would have to string out.',
    rationale:
      'Nothing else can be placed sensibly until the ground is known. In this country a party can pass within a hundred paces and never be seen.',
    delta: { intelligence: 26 },
    preparation: {
      id: 'scouted',
      title: 'The approach was learned',
      detail:
        'The paths, the sightlines and the places where a column must narrow were surveyed in advance.',
      label: 'gameplay-reconstruction',
      sourceId: 'terrain-pratapgad',
    },
  },
  'place-lookouts': {
    id: 'place-lookouts',
    title: 'Place the lookouts',
    summary:
      'Post watchers on the spurs above the path so the approach can be seen long before it arrives.',
    rationale:
      'Warning is the whole difference between a plan and a surprise. We need to know what is coming while there is still time to answer it.',
    delta: { lookouts: 30, intelligence: 4 },
    requires: { intelligence: 20 },
    preparation: {
      id: 'lookouts',
      title: 'Watchers on the spurs',
      detail:
        'Observers were placed on high ground covering the approach, able to see far down the valley.',
      label: 'gameplay-reconstruction',
      sourceId: 'preparation-inference',
    },
  },
  'conceal-reserve': {
    id: 'conceal-reserve',
    title: 'Conceal the reserve',
    summary:
      'Move the supporting force into the folds of the hills, off every path, and keep it there.',
    rationale:
      'A reserve that can be seen is not a reserve; it is a provocation. It must be close enough to matter and invisible until it does.',
    delta: { reserve: 30 },
    requires: { intelligence: 20 },
    preparation: {
      id: 'reserve',
      title: 'A concealed supporting force',
      detail:
        'A body of troops was held in the broken country off the approach, positioned to intervene.',
      label: 'gameplay-reconstruction',
      sourceId: 'preparation-inference',
    },
  },
  'lay-signal-line': {
    id: 'lay-signal-line',
    title: 'Establish the signal',
    summary:
      'Fix the chain of signals that will carry one decision from the meeting place to every post.',
    rationale:
      'Whatever happens down there, it must be able to commit or abort everything in the hills within moments. Without that, the preparation is decoration.',
    delta: { signal: 34 },
    requires: { lookouts: 20 },
    preparation: {
      id: 'signal',
      title: 'A signal chain',
      detail:
        'A prearranged means of communication linked the meeting place to the surrounding posts.',
      label: 'gameplay-reconstruction',
      sourceId: 'preparation-inference',
    },
  },
  'hold-withdrawal': {
    id: 'hold-withdrawal',
    title: 'Hold the withdrawal route',
    summary:
      'Secure the path back up to the fort and keep it clear and covered.',
    rationale:
      'If this goes badly the only thing that matters is the road home. It is held first and given up last.',
    delta: { withdrawal: 32 },
    preparation: {
      id: 'withdrawal',
      title: 'The route to the fort held',
      detail:
        'The path from the meeting ground back up to Pratapgad was kept open and covered.',
      label: 'gameplay-reconstruction',
      sourceId: 'terrain-pratapgad',
    },
  },
  'clear-the-ground': {
    id: 'clear-the-ground',
    title: 'Prepare the meeting ground',
    summary:
      'Build the pavilion, cut the approach paths to it, and set how the parley will be arranged.',
    rationale:
      'The place itself must be beyond argument: open enough to be seen to be honest, narrow enough that nothing can be brought into it unnoticed.',
    delta: { intelligence: 6, signal: 6, lookouts: 6 },
    onceOnly: true,
    preparation: {
      id: 'pavilion',
      title: 'The meeting ground was prepared',
      detail:
        'A pavilion was built and the approaches to it cut and arranged in advance. That the site was prepared is common ground across the traditions; why, is not.',
      label: 'scholarly-inference',
      sourceId: 'preparation-inference',
    },
  },
  'send-envoy': {
    id: 'send-envoy',
    title: 'Exchange envoys',
    summary:
      'Continue the negotiation over terms, escorts and the form of the meeting.',
    rationale:
      'Every exchange settles one more detail of how this will happen, and buys another day to finish the hills.',
    delta: { intelligence: 10, withdrawal: 6 },
    preparation: {
      id: 'envoys',
      title: 'Envoys passed between the camps',
      detail:
        'Terms for the meeting \u2014 escorts, numbers, the form of the encounter \u2014 were negotiated beforehand. The traditions agree that envoys passed and disagree sharply about what was intended by either side.',
      label: 'claim-in-source',
      sourceId: 'contested-event',
    },
  },
}

export const pratapgadActionOrder: readonly ActionId[] = [
  'scout-approach',
  'place-lookouts',
  'conceal-reserve',
  'lay-signal-line',
  'hold-withdrawal',
  'clear-the-ground',
  'send-envoy',
]

export const resourceCopy: Record<
  import('./types').ResourceKey,
  { title: string; description: string }
> = {
  intelligence: {
    title: 'Knowledge of the ground',
    description: 'Paths, sightlines and where a column must narrow.',
  },
  lookouts: {
    title: 'Observation',
    description: 'Watchers able to see the approach in time.',
  },
  reserve: {
    title: 'Concealed reserve',
    description: 'Supporting force in position and still unseen.',
  },
  signal: {
    title: 'Signal chain',
    description: 'The ability to commit or abort everything at once.',
  },
  withdrawal: {
    title: 'Withdrawal route',
    description: 'The path back up to the fort, open and covered.',
  },
}

/**
 * The heart of the chapter. These are shown after the encounter, unresolved.
 * The game states the disagreement and stops; it does not adjudicate.
 */
export const disputedPoints: readonly DisputedPoint[] = [
  {
    id: 'who-struck-first',
    question: 'Who struck first?',
    accounts: [
      {
        tradition: 'Marathi bakhar tradition',
        claim:
          'That the Adilshahi general moved first in the embrace, and that the response was defensive.',
      },
      {
        tradition: 'Persian / Adilshahi-side accounts',
        claim:
          'That the attack came from the Maratha side and the meeting was a trap prepared in advance.',
      },
      {
        tradition: 'Contemporary European reports',
        claim:
          'That the two met and one was killed, without reliable detail on the sequence.',
      },
    ],
    unresolved:
      'There is no disinterested eyewitness account. Every surviving version was written by, or for, a party with an interest in the answer, and the earliest detailed narratives are considerably later than the event. On present evidence the question cannot be settled, and this game does not pretend otherwise.',
  },
  {
    id: 'was-it-planned',
    question: 'Was the outcome intended beforehand?',
    accounts: [
      {
        tradition: 'Marathi bakhar tradition',
        claim:
          'That precautions were taken because treachery was expected, not because it was planned.',
      },
      {
        tradition: 'Persian / Adilshahi-side accounts',
        claim: 'That the preparation is itself proof of premeditation.',
      },
    ],
    unresolved:
      'Both readings fit the same physical facts. That the ground was prepared and forces were positioned is broadly accepted; preparation is equally consistent with expecting an ambush and with laying one. The evidence does not distinguish intent.',
  },
  {
    id: 'numbers',
    question: 'How many were present?',
    accounts: [
      {
        tradition: 'Marathi bakhar tradition',
        claim: 'Figures for escorts and the forces in the hills vary widely.',
      },
      {
        tradition: 'Persian / Adilshahi-side accounts',
        claim: 'Different figures again, generally larger for the opposing side.',
      },
    ],
    unresolved:
      'Numbers in narrative sources of this period are routinely conventional or rhetorical. This chapter uses none of them as game quantities.',
  },
]

export const endingCopy: Record<
  import('./types').CampaignEnding,
  { title: string; verdict: string; summary: string }
> = {
  'ground-prepared': {
    title: 'The ground was ready',
    verdict:
      'Whatever happened at the pavilion, the hills were arranged to answer it.',
    summary:
      'The approach was known, the watchers could see, the reserve was in place and unseen, one signal could move everything, and the road back up to the fort was held. That is the whole of what a commander could control here \u2014 and all of it was done.',
  },
  'partly-ready': {
    title: 'Partly ready',
    verdict: 'Enough was arranged to matter, and something important was not.',
    summary:
      'Some of the preparation held and some of it did not exist. In broken country and at short notice, one missing element \u2014 a signal that cannot reach, a route not held \u2014 is usually the one that decides the day.',
  },
  exposed: {
    title: 'Exposed',
    verdict: 'The meeting went ahead on ground nobody had arranged.',
    summary:
      'Without observation, without a reserve within reach, without a way to pass one order to the hills, the encounter below was simply an encounter, and everything after it was improvised.',
  },
}
