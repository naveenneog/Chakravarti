import type { ActionId, CampaignAction, SourceRecord } from './types'

/**
 * Sources for The Western Horizon.
 *
 * The chapter's whole argument rests on what survives, so the source list is the
 * content. Dates are given as ranges where scholarship gives ranges; the chapter
 * never picks the most dramatic reading and presents it as settled.
 */
export const vikramaSources: readonly SourceRecord[] = [
  {
    id: 'kshatrapa-coinage',
    title: 'Western Kshatrapa silver coinage and its cessation',
    detail:
      'The Western Kshatrapas struck dated silver for roughly four centuries. The series ends with Rudrasimha III in the early fifth century CE. That cessation, rather than any surviving battle narrative, is the primary evidence that Kshatrapa rule ended. Precise regnal end-dates are debated within roughly 395\u2013415 CE.',
  },
  {
    id: 'gupta-western-silver',
    title: 'Chandragupta II\u2019s silver in the Kshatrapa standard',
    detail:
      'After the annexation Chandragupta II issued silver for the western provinces cut to the Kshatrapa weight and broadly imitating its format, but carrying an imperial Gupta legend in Brahmi and, characteristically, a peacock reverse. Keeping the familiar standard is read as a deliberate concession to markets that already trusted it.',
  },
  {
    id: 'udayagiri-virasena',
    title: 'Udayagiri cave inscription of Virasena',
    detail:
      'An inscription of Virasena, a minister of Chandragupta II, at the Udayagiri caves near Vidisha, dated to Gupta era year 82 (c. 401\u2013402 CE). It records the king travelling in the region, placing the Gupta court in former Kshatrapa territory at a datable moment.',
  },
  {
    id: 'sanchi-amrakardava',
    title: 'Sanchi inscription of Amrakardava',
    detail:
      'An inscription of Amrakardava, an officer of Chandragupta II, at Sanchi, dated to Gupta era year 93 (c. 412\u2013413 CE). It records an endowment and is read as evidence of settled Gupta administration in the west by that date.',
  },
  {
    id: 'vakataka-marriage',
    title: 'The Vakataka marriage and Prabhavatigupta\u2019s regency',
    detail:
      'Chandragupta II\u2019s daughter Prabhavatigupta married the Vakataka ruler Rudrasena II. After her husband\u2019s death she governed as regent, and her own copper-plate charters survive. The alliance gave the Guptas a friendly power on the Deccan flank of the Kshatrapa lands.',
  },
  {
    id: 'mehrauli-chandra',
    title: 'The Mehrauli iron pillar inscription of "Chandra"',
    detail:
      'An undated Sanskrit inscription on the iron pillar now at Mehrauli praises a king named Chandra. Identification with Chandragupta II is widely argued but not certain, and the campaigns it describes cannot be securely mapped onto the western war.',
  },
  {
    id: 'vikramaditya-legend',
    title: 'The Vikramaditya legend',
    detail:
      '"Vikramaditya" is a royal title later attached to a cycle of stories about an ideal king, including the Navaratna court legend. These are literary tradition of much later date and are not evidence for the reign of Chandragupta II.',
  },
  {
    id: 'silence-of-armies',
    title: 'The archaeological silence of campaigns',
    detail:
      'Marches, sieges and garrisons rarely leave datable, attributable traces, while mints and endowed monuments do. The asymmetry is a general feature of the period\u2019s evidence, and it is why a conquest can be firmly inferred while its battles remain entirely unknown.',
  },
]

export const vikramaSourceById = (sourceId: string) =>
  vikramaSources.find((source) => source.id === sourceId)

/**
 * The campaign's seven standing options. Deltas are gameplay reconstruction; the
 * artifacts each one leaves are modelled on real, cited categories of evidence.
 */
export const vikramaActions: Record<ActionId, CampaignAction> = {
  'malwa-road': {
    id: 'malwa-road',
    title: 'March the Malwa road',
    summary:
      'Move the field army west along the Malwa corridor toward Kshatrapa country.',
    rationale:
      'Reach is the precondition for everything else. Nothing can be minted, endowed or administered in a province the army cannot stand in.',
    delta: { reach: 18, treasury: -12, acceptance: -6 },
    artifact: {
      id: 'absence-march',
      kind: 'absence',
      title: 'A march that left nothing',
      detail:
        'The army moved, wintered and moved again. No inscription commemorates it and no coin records it. A historian sixteen centuries later will not be able to date this campaign season at all.',
      label: 'scholarly-inference',
      sourceId: 'silence-of-armies',
    },
    evidence: {
      kind: 'scholarly-inference',
      sourceId: 'silence-of-armies',
      note: 'That campaigns happened is inferred from their results, not from records of the marching.',
    },
  },
  'vakataka-marriage': {
    id: 'vakataka-marriage',
    title: 'Seal the Vakataka marriage',
    summary:
      'Give Prabhavatigupta in marriage to the Vakataka house, securing the Deccan flank.',
    rationale:
      'A friendly Vakataka court denies the Kshatrapas a southern ally and gives the campaign a secure flank. It is also the single most durably documented act available.',
    delta: { alliance: 34, legitimacy: 8, treasury: -10 },
    onceOnly: true,
    artifact: {
      id: 'vakataka-charters',
      kind: 'dynastic-record',
      title: 'Vakataka copper-plate charters',
      detail:
        'The marriage, and later Prabhavatigupta\u2019s regency, are preserved in her own copper-plate grants \u2014 documents issued to be kept, and therefore among the firmest dynastic evidence of the period.',
      label: 'recorded-evidence',
      sourceId: 'vakataka-marriage',
    },
    evidence: {
      kind: 'recorded-evidence',
      sourceId: 'vakataka-marriage',
      note: 'The marriage and the regency are attested by surviving Vakataka charters.',
    },
  },
  'strike-silver': {
    id: 'strike-silver',
    title: 'Strike silver in their standard',
    summary:
      'Open a western mint issuing Gupta silver at the Kshatrapa weight, with an imperial legend and a peacock reverse.',
    rationale:
      'Markets will not take an unfamiliar coin. Keeping their standard buys acceptance, and displaces their silver far more permanently than a garrison ever could.',
    delta: { treasury: -14, acceptance: 12, legitimacy: 4 },
    coinage: { kshatrapa: -22, gupta: 26 },
    requires: { reach: 30 },
    artifact: {
      id: 'gupta-silver-issue',
      kind: 'coin',
      title: 'Gupta silver, Kshatrapa weight',
      detail:
        'A dated silver issue in the familiar western standard, imperial Brahmi legend, peacock reverse. Coins are struck in quantity, buried in hoards and dug up again \u2014 the most survivable evidence a reign can make.',
      label: 'recorded-evidence',
      sourceId: 'gupta-western-silver',
    },
    evidence: {
      kind: 'recorded-evidence',
      sourceId: 'gupta-western-silver',
      note: 'Gupta silver cut to the Kshatrapa standard survives in quantity.',
    },
  },
  'endow-udayagiri': {
    id: 'endow-udayagiri',
    title: 'Endow the caves at Udayagiri',
    summary:
      'Have the court\u2019s ministers cut and endow rock-shrines near Vidisha while the king is in the region.',
    rationale:
      'An endowment is a public claim, in stone, that this ground is governed from Pataliputra \u2014 and it will still be legible when every dispatch has rotted.',
    delta: { legitimacy: 16, treasury: -12, acceptance: 6 },
    onceOnly: true,
    requires: { reach: 22 },
    artifact: {
      id: 'udayagiri-inscription',
      kind: 'inscription',
      title: 'A minister\u2019s inscription at Udayagiri',
      detail:
        'A minister records in stone that he came to these caves in the king\u2019s company. An inscription of this kind fixes the court in former Kshatrapa country at a precise, datable moment. The surviving example \u2014 Virasena\u2019s \u2014 is dated to Gupta era 82, c. 401\u2013402 CE.',
      label: 'recorded-evidence',
      sourceId: 'udayagiri-virasena',
    },
    evidence: {
      kind: 'recorded-evidence',
      sourceId: 'udayagiri-virasena',
      note: 'The Udayagiri inscription of Virasena is dated to Gupta era 82.',
    },
  },
  'hold-ports': {
    id: 'hold-ports',
    title: 'Hold the Saurashtra ports',
    summary:
      'Garrison the western sea-ports and take the customs of the Arabian Sea trade.',
    rationale:
      'The Kshatrapas were rich because they held the ports. Taking the revenue is how the campaign pays for itself \u2014 but a garrison is an occupation, and it is felt as one.',
    delta: { treasury: 22, reach: 10, acceptance: -10 },
    requires: { reach: 26 },
    artifact: {
      id: 'absence-ports',
      kind: 'absence',
      title: 'Customs without a record',
      detail:
        'Revenue flowed and ships were taxed. No surviving document names the officers, the rates or the year. Prosperity of this kind is visible only indirectly, in what it paid for.',
      label: 'scholarly-inference',
      sourceId: 'silence-of-armies',
    },
    evidence: {
      kind: 'scholarly-inference',
      sourceId: 'silence-of-armies',
      note: 'Control of the western ports is inferred from Gupta wealth and later administration, not from customs records.',
    },
  },
  'confirm-officers': {
    id: 'confirm-officers',
    title: 'Confirm the local officers',
    summary:
      'Leave western administration in the hands of men already trusted locally, under imperial title.',
    rationale:
      'Rule that depends on the army ends when the army leaves. Rule through local officers survives \u2014 and those officers endow monuments in their own names, which is how it gets recorded.',
    delta: { acceptance: 20, legitimacy: -6, treasury: -6 },
    onceOnly: true,
    requires: { reach: 34, acceptance: 20 },
    artifact: {
      id: 'sanchi-inscription',
      kind: 'inscription',
      title: 'An officer\u2019s endowment at Sanchi',
      detail:
        'An officer of the king records an endowment at a great monument in his own name. An officer with that standing implies an administration that is settled rather than an occupation. The surviving example \u2014 Amrakardava\u2019s \u2014 is dated to Gupta era 93, c. 412\u2013413 CE.',
      label: 'recorded-evidence',
      sourceId: 'sanchi-amrakardava',
    },
    evidence: {
      kind: 'recorded-evidence',
      sourceId: 'sanchi-amrakardava',
      note: 'The Sanchi inscription of Amrakardava is dated to Gupta era 93.',
    },
  },
  'winter-court': {
    id: 'winter-court',
    title: 'Winter the court',
    summary:
      'Halt the campaign for a season: rest the army, hear petitions, and refill the treasury.',
    rationale:
      'A campaign that never pauses bankrupts itself. Doing nothing is a legitimate move \u2014 and, as the record will show, an invisible one.',
    delta: { treasury: 16, legitimacy: 4, acceptance: 4, reach: -4 },
    artifact: {
      id: 'absence-winter',
      kind: 'absence',
      title: 'A season with no trace',
      detail:
        'The court rested. Nothing was struck and nothing was cut. To a later historian this year simply does not exist.',
      label: 'scholarly-inference',
      sourceId: 'silence-of-armies',
    },
    evidence: {
      kind: 'scholarly-inference',
      sourceId: 'silence-of-armies',
      note: 'Ordinary years leave no datable trace and are invisible in the record.',
    },
  },
}

export const vikramaActionOrder: readonly ActionId[] = [
  'malwa-road',
  'hold-ports',
  'strike-silver',
  'vakataka-marriage',
  'endow-udayagiri',
  'confirm-officers',
  'winter-court',
]

export const resourceCopy: Record<
  keyof import('./types').ResourceValues,
  { title: string; description: string }
> = {
  treasury: {
    title: 'Treasury',
    description: 'Gold to pay the army, the mint and the masons.',
  },
  legitimacy: {
    title: 'Legitimacy',
    description: 'Standing as a rightful sovereign rather than an occupier.',
  },
  alliance: {
    title: 'Alliance',
    description: 'The Vakataka connection covering the southern flank.',
  },
  reach: {
    title: 'Reach',
    description: 'How far imperial authority can actually be exercised.',
  },
  acceptance: {
    title: 'Acceptance',
    description:
      'Whether western markets and notables treat Gupta rule as ordinary.',
  },
}

export const endingCopy: Record<
  import('./types').CampaignEnding,
  { title: string; verdict: string; summary: string }
> = {
  'absorbed-west': {
    title: 'The west absorbed',
    verdict:
      'A historian can date your conquest to within a few years without a single account of a battle.',
    summary:
      'Kshatrapa silver stops. Your silver, in their weight, takes its place in the same markets. Inscriptions fix your court and then your officers in the province. The record is thin on war and unambiguous on outcome \u2014 which is exactly what the surviving evidence for Chandragupta II looks like.',
  },
  'hollow-conquest': {
    title: 'A conquest the record forgot',
    verdict:
      'A historian can tell that something happened in the west, but not what, nor when, nor by whom.',
    summary:
      'You took the ground and held it with soldiers. You minted little, endowed nothing lasting, and governed through the army. Armies leave almost no datable trace, so your campaign survives only as a gap \u2014 a coinage that falters without a clear successor.',
  },
  overreach: {
    title: 'Overreach',
    verdict:
      'The campaign outran what the treasury and your standing could carry.',
    summary:
      'The western war consumed more than it returned. Whatever ground was taken could not be paid for or justified, and the province was not absorbed on any terms a later record would recognise as rule.',
  },
}
