import type { ActionId, CampaignAction, SourceRecord } from './types'

export const narraiSources: readonly SourceRecord[] = [
  {
    id: 'akbarnama-tradition',
    title: 'The Akbarnama and the Mughal chronicle tradition',
    detail:
      'The narrative of this campaign comes from the imperial side: the court history of Akbar\u2019s reign and related Persian accounts. They record the invasion, the commander, the terrain and the queen\u2019s death. They were written to explain and justify an imperial success, and they are the only narrative that survives.',
  },
  {
    id: 'no-gond-account',
    title: 'The absence of a Gond account',
    detail:
      'No contemporary Gond or Garha-Katanga narrative of this campaign is known to survive. Nothing records what the defenders intended, argued about, or thought they were doing. Everything on the defending side of this chapter is reconstruction built around an absence.',
  },
  {
    id: 'narrai-terrain',
    title: 'The ground at Narrai',
    detail:
      'The defensive position is described as lying between a hill range on one side and the Gaur and Narmada rivers on the other \u2014 a constricted approach that a smaller force could contest and a larger one could not easily deploy across.',
  },
  {
    id: 'asymmetry',
    title: 'The disparity in arms',
    detail:
      'The invading force is described as bringing trained troops with muskets and artillery in quantity. Specific numbers given in the chronicles are victor-side claims; this chapter labels them and does not use them as balance figures.',
  },
  {
    id: 'regency',
    title: 'Durgavati\u2019s regency',
    detail:
      'Durgavati governed Garha-Katanga as regent for her young son after her husband\u2019s death, moving the seat to a hill fort in the Satpura range. An earlier invasion from Malwa had been repulsed, which is part of why the kingdom was worth invading.',
  },
  {
    id: 'the-death',
    title: 'The account of her death',
    detail:
      'The surviving imperial account states that, wounded and with the position lost, the queen took her own life rather than be captured. There is no independent account. This chapter presents it once, as what that source reports, and never as a mechanic.',
  },
]

export const narraiSourceById = (sourceId: string) =>
  narraiSources.find((source) => source.id === sourceId)

export const narraiActions: Record<ActionId, CampaignAction> = {
  'hold-defile': {
    id: 'hold-defile',
    title: 'Hold the defile',
    summary:
      'Stand where the hills and the rivers squeeze the approach, and make them come through it.',
    rationale:
      'Here their numbers are worth less than they should be. Every hour we hold is paid for on both sides.',
    delta: { warriors: -14, resolve: 4 },
    costDelta: 16,
    deed: {
      id: 'held',
      title: 'The defile was held',
      deed: 'The line stood in the narrow ground and the advance was stopped for a time.',
      preserved: true,
      label: 'gameplay-reconstruction',
      sourceId: 'narrai-terrain',
    },
  },
  'give-ground': {
    id: 'give-ground',
    title: 'Give ground to the next line',
    summary:
      'Break contact and fall back to the next defensible bend before the position is enveloped.',
    rationale:
      'A force that is destroyed here cannot make them pay tomorrow. Ground is the cheapest thing we have left to spend.',
    delta: { ground: -1, warriors: 6, resolve: -4 },
    costDelta: 3,
    deed: {
      id: 'withdrew',
      title: 'A fighting withdrawal',
      deed: 'The force disengaged in order and re-formed further back.',
      preserved: false,
      label: 'gameplay-reconstruction',
      sourceId: 'no-gond-account',
    },
  },
  evacuate: {
    id: 'evacuate',
    title: 'Empty the villages',
    summary:
      'Spend a day moving non-combatants, grain and herds back beyond the hills.',
    rationale:
      'The kingdom is not the army. If the people are gone before the army breaks, something survives this.',
    delta: { sheltered: 22, ground: -1 },
    costDelta: 2,
    deed: {
      id: 'evacuated',
      title: 'The villages were emptied',
      deed: 'Non-combatants, grain and herds were moved out of the line of advance.',
      preserved: false,
      label: 'gameplay-reconstruction',
      sourceId: 'no-gond-account',
    },
  },
  'night-attack': {
    id: 'night-attack',
    title: 'Strike the camp at night',
    summary:
      'Go into their lines in the dark, where muskets and guns are worth least.',
    rationale:
      'They are not afraid of us by day. Let them be afraid of the dark, and let them post double sentries every night after.',
    delta: { warriors: -18, resolve: 8 },
    costDelta: 24,
    requires: { resolve: 30 },
    deed: {
      id: 'night',
      title: 'A night attack on the camp',
      deed: 'The defenders went into the invading camp after dark and did real damage.',
      preserved: true,
      label: 'gameplay-reconstruction',
      sourceId: 'asymmetry',
    },
  },
  'call-for-help': {
    id: 'call-for-help',
    title: 'Send to the neighbours',
    summary:
      'Ride to the neighbouring rulers and ask for the help that was promised in easier years.',
    rationale:
      'They have every reason to come. An empire that takes Garha-Katanga will be on their border next season.',
    delta: { resolve: -10 },
    costDelta: 0,
    onceOnly: true,
    deed: {
      id: 'unanswered',
      title: 'The appeal went unanswered',
      deed: 'Riders were sent to neighbouring courts. No relief came.',
      preserved: false,
      label: 'gameplay-reconstruction',
      sourceId: 'no-gond-account',
    },
  },
  'elephants-forward': {
    id: 'elephants-forward',
    title: 'Bring the elephants forward',
    summary:
      'Commit the war elephants to break the head of the column in the narrow ground.',
    rationale:
      'In a defile they cannot be flanked and they cannot be ignored. It is the heaviest blow we can still strike.',
    delta: { elephants: -34, warriors: -6 },
    costDelta: 20,
    requires: { elephants: 30 },
    deed: {
      id: 'elephants',
      title: 'The elephants were committed',
      deed: 'War elephants were sent against the head of the advancing column.',
      preserved: true,
      label: 'gameplay-reconstruction',
      sourceId: 'asymmetry',
    },
  },
  'refuse-summons': {
    id: 'refuse-summons',
    title: 'Refuse the summons',
    summary:
      'Return the demand for submission without an answer they can use.',
    rationale:
      'Submission now would be believed to be the end of it. It would not be.',
    delta: { resolve: 16 },
    costDelta: 4,
    onceOnly: true,
    deed: {
      id: 'refused',
      title: 'The summons was refused',
      deed: 'A demand for submission was rejected and the defence continued.',
      preserved: true,
      label: 'claim-in-source',
      sourceId: 'akbarnama-tradition',
    },
  },
}

export const narraiActionOrder: readonly ActionId[] = [
  'hold-defile',
  'give-ground',
  'evacuate',
  'night-attack',
  'elephants-forward',
  'call-for-help',
  'refuse-summons',
]

export const resourceCopy: Record<
  import('./types').ResourceKey,
  { title: string; description: string }
> = {
  warriors: {
    title: 'Warriors',
    description: 'What is left of the fighting strength.',
  },
  elephants: {
    title: 'Elephants',
    description: 'The heaviest arm still available in close ground.',
  },
  ground: {
    title: 'Defiles left',
    description:
      'Defensible bends still ahead. When they run out, the position is fixed.',
  },
  sheltered: {
    title: 'People sheltered',
    description: 'Non-combatants moved beyond the line of advance.',
  },
  resolve: {
    title: 'Resolve',
    description: 'Whether the army will stand another day.',
  },
}

/**
 * The surviving account. Deliberately short, self-serving, and silent about most
 * of what the player did — because that is what the record actually looks like.
 */
export const survivingAccount = [
  'The imperial commander, having obtained permission, marched into Garha-Katanga.',
  'The queen drew up her force in broken country between the hills and the rivers, and gave battle.',
  'The imperial troops, with muskets and artillery, prevailed. The queen, being wounded and unwilling to be taken, put an end to her own life.',
  'The country and its treasure passed to the empire.',
]

export const endingCopy: Record<
  import('./types').CampaignEnding,
  { title: string; verdict: string; summary: string }
> = {
  remembered: {
    title: 'A price, and a people',
    verdict:
      'The invasion took the country expensively, and much of the country was not there to be taken.',
    summary:
      'You spent the ground slowly, made them pay for each defile, and got the villages out before the line broke. The outcome was never in question. What you controlled was the cost and the survivors, and you took both.',
  },
  costly: {
    title: 'Bought at a price',
    verdict: 'They took the country, and they will remember what it cost.',
    summary:
      'The defence was expensive to overcome. But the fighting held the army in the defiles while the villages behind them were still full, and what was not carried away was taken.',
  },
  sheltered: {
    title: 'The people got out',
    verdict:
      'The country fell quickly, but much of what mattered was already gone.',
    summary:
      'You traded the fight for time and used the time to empty the valley. The invasion met little and paid little \u2014 and found much less than it came for.',
  },
  overrun: {
    title: 'Overrun',
    verdict: 'The position was carried before it cost them anything much.',
    summary:
      'Ground was given without a price attached and the people were still in the path when it ran out. This is the version of the campaign that an imperial chronicle could record in a single sentence \u2014 and very nearly did.',
  },
}
