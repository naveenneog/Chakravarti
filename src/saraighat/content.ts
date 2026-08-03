import type { ActionId, CampaignAction, Ground, SourceRecord } from './types'

export const saraighatSources: readonly SourceRecord[] = [
  {
    id: 'buranji-tradition',
    title: 'The Assamese buranjis',
    detail:
      'The Ahom court maintained a continuous chronicle tradition, the buranjis, written in Ahom and later Assamese. They are an indigenous administrative and historical record with their own authorship and purpose \u2014 not folklore, and not a gloss on Mughal history. They are the fullest account of this campaign.',
  },
  {
    id: 'mughal-accounts',
    title: 'Mughal-side accounts of the Assam campaign',
    detail:
      'Persian histories and campaign records from the imperial side describe Ram Singh I\u2019s expedition, its lack of progress, and its withdrawal. They are written by the losing side of this campaign, which makes their broad agreement with the buranjis evidentially valuable.',
  },
  {
    id: 'treaty-ghilajharighat',
    title: 'The Treaty of Ghilajharighat (1663)',
    detail:
      'After Mir Jumla\u2019s invasion the Ahom kingdom accepted an indemnity, hostages, and the loss of territory from the Manas to Guwahati. The campaign of 1667\u20131671 begins from this position of depletion, which both traditions record.',
  },
  {
    id: 'saraighat-terrain',
    title: 'The narrows at Saraighat',
    detail:
      'At Saraighat the Brahmaputra narrows to roughly a kilometre, between hills. The Ahom command chose Guwahati deliberately because the hilly ground denied Mughal cavalry its mobility, and because the only way east was the river.',
  },
  {
    id: 'alaboi',
    title: 'The reverse at Alaboi (1669)',
    detail:
      'Drawn into a set-piece engagement in open fields near the Alaboi hills, the Ahom force was broken by Mughal cavalry with very heavy losses. It is the clearest surviving demonstration of what happened when the Ahoms fought the war the Mughals were equipped for.',
  },
  {
    id: 'lachit-illness',
    title: 'Lachit\u2019s illness and intervention',
    detail:
      'The buranji tradition records that Lachit was gravely ill during the final battle, that Ahom boats began to fall back, and that he had himself carried to a war-boat and led the counter-attack. The famous words attributed to him at that moment come from this chronicle tradition and are transmitted, not contemporary transcript.',
  },
  {
    id: 'dagga-judha',
    title: 'Guerrilla warfare and the "dignity of warfare"',
    detail:
      'The Ahom side conducted sustained harassing operations. The Mughal commander is recorded as protesting that such methods lowered the dignity of warfare \u2014 a complaint that itself corroborates that the tactics were used and were effective.',
  },
  {
    id: 'ram-singh-terms',
    title: 'Ram Singh\u2019s settlement offers',
    detail:
      'Repeated Mughal proposals sought an Ahom withdrawal from Guwahati and a return to an earlier status quo, at one point with a substantial payment. The Ahom council debated accepting; the argument for refusal was that no assurance from a field commander could bind Delhi, and that a settlement would waste everything already spent.',
  },
]

export const saraighatSourceById = (sourceId: string) =>
  saraighatSources.find((source) => source.id === sourceId)

export const saraighatActions: Record<ActionId, CampaignAction> = {
  'rebuild-khels': {
    id: 'rebuild-khels',
    title: 'Rebuild the khels',
    summary:
      'Bring the dispersed population back into the service rolls and restore food and weapon production.',
    rationale:
      'Mir Jumla left the kingdom depopulated and the treasury empty. Nothing else on this list is possible without first putting men back on the rolls.',
    delta: { manpower: 20, cohesion: 8 },
    pressureDelta: 4,
    corroboration: {
      id: 'rebuild',
      title: 'Reorganisation after Ghilajharighat',
      buranji:
        'The chronicles describe a deliberate overhaul: people rehabilitated into their khels, production increased, new forts built and garrisoned, and a new commander appointed.',
      mughal:
        'Imperial records note the Ahom kingdom recovering and rearming in the years after the treaty.',
      agrees: true,
      label: 'recorded-evidence',
      sourceId: 'treaty-ghilajharighat',
    },
  },
  'raise-embankments': {
    id: 'raise-embankments',
    title: 'Raise the mud embankments',
    summary:
      'Build the earthwork system around Guwahati so the land approach cannot be forced.',
    rationale:
      'This is the whole plan. If they cannot come by land they must come by river, and the river is the one place a smaller force can meet them on equal terms.',
    delta: { embankments: 26, manpower: -6 },
    pressureDelta: -6,
    corroboration: {
      id: 'embankments',
      title: 'The earthworks at Guwahati',
      buranji:
        'A complex system of mud embankments was prepared so that Guwahati could not be taken by land, forcing the Mughals onto the water.',
      mughal:
        'The imperial side records the land approaches as impracticable and the campaign stalling in front of them.',
      agrees: true,
      label: 'recorded-evidence',
      sourceId: 'saraighat-terrain',
    },
  },
  'build-boats': {
    id: 'build-boats',
    title: 'Build the light war-boats',
    summary:
      'Lay down numerous small, fast craft rather than trying to match the imperial fleet ship for ship.',
    rationale:
      'Their boats are bigger and carry cannon. In a wide reach that decides everything; in a narrow one it decides nothing, and numbers and handling decide instead.',
    delta: { riverCraft: 24, manpower: -4 },
    requires: { manpower: 25 },
    corroboration: {
      id: 'boats',
      title: 'Small craft against a heavy fleet',
      buranji:
        'The Ahom navy fought with many light boats handled close in, rather than in line against heavier vessels.',
      mughal:
        'The imperial fleet is described as large, with vessels carrying numerous cannon \u2014 an advantage that required room to use.',
      agrees: true,
      label: 'scholarly-inference',
      sourceId: 'saraighat-terrain',
    },
  },
  'renew-alliances': {
    id: 'renew-alliances',
    title: 'Renew the hill alliances',
    summary:
      'Confirm the understandings with the Jaintia and Kachari kingdoms and the neighbouring hill peoples.',
    rationale:
      'The flanks are not ours to hold alone. Allies on the hills make the encirclement they want impossible.',
    delta: { alliances: 24, cohesion: 6 },
    onceOnly: true,
    corroboration: {
      id: 'alliances',
      title: 'Allied contingents',
      buranji:
        'Alliances with neighbouring kingdoms and hill peoples were renewed, and allied contingents joined the fighting around Guwahati.',
      mughal:
        'Imperial accounts record hostile local forces operating around the Mughal positions.',
      agrees: true,
      label: 'recorded-evidence',
      sourceId: 'buranji-tradition',
    },
  },
  'sham-negotiation': {
    id: 'sham-negotiation',
    title: 'Open negotiations you do not mean',
    summary:
      'Send envoys, exchange courtesies, and let the imperial camp believe a settlement is close.',
    rationale:
      'Every week they spend talking is a week we spend digging. Time is the only resource we can take from them without fighting.',
    delta: { cohesion: -4 },
    pressureDelta: -16,
    corroboration: {
      id: 'negotiation',
      title: 'Negotiation as delay',
      buranji:
        'The chronicles describe negotiations conducted to buy time, including flattering forms of address, while defensive work continued.',
      mughal:
        'The imperial commander is recorded conducting prolonged and ultimately fruitless negotiations, and being rebuked from Delhi for it.',
      agrees: true,
      label: 'recorded-evidence',
      sourceId: 'ram-singh-terms',
    },
  },
  'guerrilla-raids': {
    id: 'guerrilla-raids',
    title: 'Order the harassing war',
    summary:
      'Night raids, cut supply, constant small attacks on the imperial camps.',
    rationale:
      'We cannot beat their army. We can make its every day expensive, and armies that cannot rest do not stay.',
    delta: { cohesion: 4, manpower: -5 },
    pressureDelta: -10,
    corroboration: {
      id: 'raids',
      title: 'The harassing war',
      buranji:
        'Sustained guerrilla operations are recorded as a deliberate method, associated particularly with Atan Burhagohain.',
      mughal:
        'The imperial commander protested that these methods lowered the dignity of warfare and for a time withdrew from fighting \u2014 a complaint that corroborates both their use and their effect.',
      agrees: true,
      label: 'recorded-evidence',
      sourceId: 'dagga-judha',
    },
  },
  'accept-open-battle': {
    id: 'accept-open-battle',
    title: 'Accept battle in the open field',
    summary:
      'Answer the imperial challenge and meet their cavalry on level ground.',
    rationale:
      'It is what honour seems to demand, and what the court may order. It is also the one ground on which their army is unbeatable.',
    delta: { manpower: -26, cohesion: -18 },
    pressureDelta: 10,
    onceOnly: true,
    corroboration: {
      id: 'alaboi-entry',
      title: 'The reverse at Alaboi',
      buranji:
        'Drawn into a set-piece fight in open fields, the Ahom force was broken by Mughal horse with very heavy losses.',
      mughal:
        'The imperial side records a clear victory in the open and its commander rewarded for it.',
      agrees: true,
      label: 'recorded-evidence',
      sourceId: 'alaboi',
    },
  },
}

export const saraighatActionOrder: readonly ActionId[] = [
  'rebuild-khels',
  'raise-embankments',
  'build-boats',
  'renew-alliances',
  'sham-negotiation',
  'guerrilla-raids',
  'accept-open-battle',
]

export const resourceCopy: Record<
  import('./types').ResourceKey,
  { title: string; description: string }
> = {
  manpower: {
    title: 'Manpower',
    description: 'Men on the service rolls, after Mir Jumla\u2019s devastation.',
  },
  embankments: {
    title: 'Earthworks',
    description:
      'How completely the land approach to Guwahati has been closed off.',
  },
  riverCraft: {
    title: 'War-boats',
    description: 'Light craft able to fight close in the narrows.',
  },
  alliances: {
    title: 'Allies',
    description: 'Jaintia, Kachari and hill contingents covering the flanks.',
  },
  cohesion: {
    title: 'Cohesion',
    description: 'Whether the commanders and the army will hold together.',
  },
}

export const groundCopy: Record<
  Ground,
  { title: string; detail: string }
> = {
  'open-field': {
    title: 'The open field',
    detail:
      'Level ground, room to manoeuvre, and a professional cavalry arm that has never lost on it.',
  },
  'guwahati-hills': {
    title: 'The hills at Guwahati',
    detail:
      'Broken country that blunts cavalry, but the land approach is still passable and the fight is still theirs to shape.',
  },
  'saraighat-narrows': {
    title: 'The narrows at Saraighat',
    detail:
      'The river at its tightest, between hills, with the land closed by earthworks. A heavy fleet cannot deploy here and a light one can.',
  },
}

export const endingCopy: Record<
  import('./types').CampaignEnding,
  { title: string; verdict: string; summary: string }
> = {
  'river-holds': {
    title: 'The Brahmaputra holds',
    verdict:
      'The imperial fleet is broken in the narrows and the campaign withdraws west.',
    summary:
      'The land was closed, so they came by water; the water was narrow, so their weight could not tell. This is the outcome both traditions record \u2014 the last major imperial attempt to push east, ended on a river a kilometre wide.',
  },
  'guwahati-falls': {
    title: 'Guwahati falls',
    verdict:
      'The decision was forced on ground the imperial army was built to win on.',
    summary:
      'Whether from an unfinished earthwork, an empty roll, or a battle accepted in the open, the fight happened where their numbers, horse and artillery could all be used at once. That was always the losing arrangement.',
  },
  'terms-accepted': {
    title: 'The terms are accepted',
    verdict:
      'Guwahati is given up by agreement rather than lost by assault.',
    summary:
      'The offer was real and the council genuinely debated it. The argument against it, recorded in the chronicles, was that no field commander\u2019s assurance binds Delhi, and that settling now would make every year of drain on the country pointless.',
  },
}
