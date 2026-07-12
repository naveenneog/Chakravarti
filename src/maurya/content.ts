import type {
  BuildingDefinition,
  CouncilDebate,
  Formation,
  SourceRecord,
  UnitDefinition,
} from './types'

export const sources: readonly SourceRecord[] = [
  {
    id: 'classical-rise',
    title: 'Justin XV.4 and Plutarch, Alexander 62',
    detail:
      'Later Greco-Roman accounts connect Sandrocottus with the post-Alexander political transition. Exact battles are not preserved.',
  },
  {
    id: 'arthashastra-statecraft',
    title: "Kautilya's Arthashastra",
    detail:
      'A statecraft text traditionally attributed to Kautilya. Its authorship, layers, and date are disputed; mechanics use it as inspiration, not a transcript of Mauryan practice.',
    url: 'https://en.wikisource.org/wiki/Arthashastra',
  },
  {
    id: 'olivelle-2013',
    title: 'Patrick Olivelle, King, Governance, and Law in Ancient India',
    detail:
      'Modern critical translation and source study emphasizing the composite and debated history of the extant Arthashastra.',
  },
  {
    id: 'seleucid-settlement',
    title: 'Strabo XV, Appian, Plutarch, and Justin',
    detail:
      'Later classical sources report conflict and settlement with Seleucus, territorial transfer, alliance, and elephants. No detailed battle account survives.',
  },
  {
    id: 'megasthenes-fragments',
    title: 'Megasthenes fragments preserved by later authors',
    detail:
      'The lost Indica survives through later quotations. It describes Pataliputra and administration through a foreign and fragmentary lens.',
    url: 'https://archive.org/details/AncientIndiaAsDescribedByMegasthenesAndArrian',
  },
  {
    id: 'pataliputra-archaeology',
    title: 'Kumhrar and Bulandi Bagh archaeological evidence',
    detail:
      'Timber fortification remains support a large fortified ancient city at Patna, but not a precise recoverable Mauryan city plan.',
  },
]

export const buildings: Record<BuildingDefinition['id'], BuildingDefinition> = {
  farm: {
    id: 'farm',
    name: 'Irrigated farms',
    description: 'Increase seasonal grain and support a larger field army.',
    role: '+3 food each season',
    cost: { treasury: 2 },
    evidence: {
      kind: 'gameplay-reconstruction',
      sourceId: 'arthashastra-statecraft',
      note:
        'Agrarian revenue and irrigation matter in the source tradition; this exact building bonus is a game abstraction.',
    },
  },
  market: {
    id: 'market',
    name: 'River market',
    description: 'Turn roads and river traffic into a steadier treasury.',
    role: '+3 treasury each season',
    cost: { food: 2 },
    evidence: {
      kind: 'gameplay-reconstruction',
      sourceId: 'megasthenes-fragments',
      note:
        'Trade and city administration inspire this system. The market placement and income are reconstructed.',
    },
  },
  barracks: {
    id: 'barracks',
    name: 'Army cantonment',
    description: 'Train formations and unlock advanced recruitment.',
    role: '+1 readiness each season',
    cost: { food: 2, treasury: 2 },
    evidence: {
      kind: 'claim-in-source',
      sourceId: 'arthashastra-statecraft',
      note:
        'The text describes army categories and administration. This cantonment and its bonuses are not a verified Mauryan plan.',
    },
  },
  fort: {
    id: 'fort',
    name: 'Timber river fort',
    description: 'Slow threat growth and strengthen the border-war defense.',
    role: 'Reduces threat and adds war defense',
    cost: { treasury: 3 },
    evidence: {
      kind: 'scholarly-inference',
      sourceId: 'pataliputra-archaeology',
      note:
        'Timber fortification is archaeologically supported at Pataliputra; this provincial fort is reconstructed.',
    },
  },
}

export const units: Record<UnitDefinition['id'], UnitDefinition> = {
  infantry: {
    id: 'infantry',
    name: 'Infantry cohort',
    role: 'Reliable center and the cheapest force to sustain.',
    counter: 'Strengthens every formation but lacks a decisive specialty.',
    cost: { food: 1, treasury: 1 },
    upkeep: { food: 1 },
    readiness: 1,
    requirements: {},
    evidence: {
      kind: 'claim-in-source',
      sourceId: 'arthashastra-statecraft',
      note:
        'Infantry is part of the text-derived fourfold army. Cohort size and statistics are gameplay reconstruction.',
    },
  },
  archers: {
    id: 'archers',
    name: 'Bow companies',
    role: 'Best in an archer screen against a stronger advancing force.',
    counter: 'Vulnerable without infantry support.',
    cost: { food: 1, treasury: 2 },
    upkeep: { food: 1 },
    readiness: 1,
    requirements: { barracks: 1 },
    evidence: {
      kind: 'gameplay-reconstruction',
      sourceId: 'arthashastra-statecraft',
      note:
        'Ranged troops are plausible within ancient armies, but this unlock and formation role are reconstructed.',
    },
  },
  cavalry: {
    id: 'cavalry',
    name: 'Cavalry wing',
    role: 'Creates the strongest flank bonus when roads and markets support it.',
    counter: 'Consumes both food and treasury each season.',
    cost: { food: 2, treasury: 3 },
    upkeep: { food: 1, treasury: 1 },
    readiness: 2,
    requirements: { barracks: 1, market: 1 },
    evidence: {
      kind: 'claim-in-source',
      sourceId: 'arthashastra-statecraft',
      note:
        'Cavalry belongs to the source-derived fourfold army. Recruitment conditions and combat bonus are reconstructed.',
    },
  },
  elephants: {
    id: 'elephants',
    name: 'Elephant corps',
    role: 'Powerful center pressure and morale effect.',
    counter: 'Highest food burden and requires legitimacy and support buildings.',
    cost: { food: 4, treasury: 4 },
    upkeep: { food: 2, treasury: 1 },
    readiness: 3,
    requirements: { barracks: 1, farm: 1 },
    legitimacyRequired: 6,
    evidence: {
      kind: 'claim-in-source',
      sourceId: 'seleucid-settlement',
      note:
        'Classical sources emphasize Mauryan elephants, including a reported transfer to Seleucus. Exact numbers and this unit balance are not verified.',
    },
  },
}

export const formationNames: Record<Formation, string> = {
  'elephant-center': 'Elephants at the center',
  'cavalry-flank': 'Cavalry on the flank',
  'archer-screen': 'Archers before the line',
}

export const councilDebates: readonly CouncilDebate[] = [
  {
    id: 'grain-and-momentum',
    season: 1,
    title: 'Grain or momentum',
    problem:
      'The province can secure its stores or spend immediately to strengthen the new army.',
    chandraguptaLine:
      'A throne won too slowly may never be won. Yet an army that outruns its grain becomes another enemy.',
    kautilyaLine:
      'Power begins before battle: counted stores, known roads, and costs understood before orders are given.',
    context: {
      kind: 'gameplay-reconstruction',
      sourceId: 'arthashastra-statecraft',
      note:
        'The dilemma is invented. Agrarian revenue and logistical statecraft are source-inspired themes.',
    },
    options: [
      {
        id: 'secure-stores',
        title: 'Secure the granaries',
        argument: 'Spend treasury now to protect grain and public confidence.',
        effects: { food: 3, treasury: -1, legitimacy: 1 },
        evidence: {
          kind: 'gameplay-reconstruction',
          sourceId: 'arthashastra-statecraft',
          note: 'The exact policy and effects are reconstructed for play.',
        },
      },
      {
        id: 'reward-volunteers',
        title: 'Reward the volunteers',
        argument: 'Convert wealth into readiness while enthusiasm is high.',
        effects: { treasury: -2, readiness: 3, legitimacy: 1 },
        evidence: {
          kind: 'gameplay-reconstruction',
          sourceId: 'classical-rise',
          note:
            'Later accounts describe political upheaval, but this recruitment decision and dialogue are invented.',
        },
      },
    ],
  },
  {
    id: 'reports-from-frontier',
    season: 2,
    title: 'Reports from the frontier',
    problem:
      'Rumors of a hostile concentration arrive through merchants and local officers.',
    chandraguptaLine:
      'An envoy may turn uncertainty into terms. A hidden report may reveal what terms are worth accepting.',
    kautilyaLine:
      'One report is a rumor. Independent reports that agree become intelligence.',
    context: {
      kind: 'claim-in-source',
      sourceId: 'arthashastra-statecraft',
      note:
        'The text describes elaborate intelligence practices. Their direct use by Chandragupta in this form is not established.',
    },
    options: [
      {
        id: 'merchant-network',
        title: 'Fund independent reports',
        argument: 'Pay multiple routes for information and reduce surprise.',
        effects: { treasury: -2, threat: -2, readiness: 1 },
        evidence: {
          kind: 'claim-in-source',
          sourceId: 'arthashastra-statecraft',
          note:
            'Cross-checking agents is source-inspired; the network and effects are reconstruction.',
        },
      },
      {
        id: 'open-envoys',
        title: 'Send open envoys',
        argument: 'Lower tension and gain legitimacy through visible diplomacy.',
        effects: { treasury: -1, legitimacy: 2, threat: -1 },
        evidence: {
          kind: 'gameplay-reconstruction',
          sourceId: 'seleucid-settlement',
          note:
            'Diplomatic settlement is historically attested in broad outline; this early exchange is invented.',
        },
      },
    ],
  },
  {
    id: 'passes-or-field',
    season: 3,
    title: 'Hold the crossings or seek the field',
    problem:
      'The border force is close enough that the next season may decide the province.',
    chandraguptaLine:
      'If we choose the field, the army must move as one. If we hold, the people must trust the walls.',
    kautilyaLine:
      'Terrain is an ally only when stores, scouts, and retreat routes have already been prepared.',
    context: {
      kind: 'gameplay-reconstruction',
      sourceId: 'arthashastra-statecraft',
      note:
        'No detailed Chandragupta battle plan survives. Terrain-linked forts and campaign planning are source-inspired.',
    },
    options: [
      {
        id: 'fortify-crossings',
        title: 'Fortify the crossings',
        argument: 'Spend treasury to lower threat and improve cohesion.',
        effects: { treasury: -2, threat: -2, readiness: 1 },
        evidence: {
          kind: 'gameplay-reconstruction',
          sourceId: 'pataliputra-archaeology',
          note: 'Timber defenses are plausible; this border work is reconstructed.',
        },
      },
      {
        id: 'mobile-column',
        title: 'Prepare a mobile column',
        argument: 'Consume stores for a sharper field readiness advantage.',
        effects: { food: -2, readiness: 3, threat: 1 },
        evidence: {
          kind: 'gameplay-reconstruction',
          sourceId: 'classical-rise',
          note: 'The maneuver and effects are entirely reconstructed.',
        },
      },
    ],
  },
  {
    id: 'govern-the-border',
    season: 4,
    title: 'Govern the border districts',
    problem:
      'After the confrontation, the province must balance continuity and royal oversight.',
    chandraguptaLine:
      'A district that obeys only from fear will rebel when the army turns away.',
    kautilyaLine:
      'Continuity has value, but every officer must know that accounts can be examined.',
    context: {
      kind: 'gameplay-reconstruction',
      sourceId: 'arthashastra-statecraft',
      note:
        'Administrative oversight is source-inspired. These officers and choices are invented.',
    },
    options: [
      {
        id: 'retain-local-officers',
        title: 'Retain local officers',
        argument: 'Trade treasury for continuity, legitimacy, and lower threat.',
        effects: { treasury: -1, legitimacy: 2, threat: -1 },
        evidence: {
          kind: 'gameplay-reconstruction',
          sourceId: 'olivelle-2013',
          note: 'This specific settlement policy is reconstruction.',
        },
      },
      {
        id: 'appoint-auditors',
        title: 'Appoint royal auditors',
        argument: 'Increase revenue at the risk of resentment.',
        effects: { treasury: 3, legitimacy: -1, threat: 1 },
        evidence: {
          kind: 'claim-in-source',
          sourceId: 'arthashastra-statecraft',
          note:
            'The text discusses officials and oversight; this direct implementation and outcome are not verified.',
        },
      },
    ],
  },
  {
    id: 'burden-of-army',
    season: 5,
    title: 'The burden of the army',
    problem:
      'The expanded force strains stores while veterans demand recognition.',
    chandraguptaLine:
      'Those who held the line must see that service is remembered.',
    kautilyaLine:
      'An army that consumes the kingdom it protects has already lost its purpose.',
    context: {
      kind: 'gameplay-reconstruction',
      sourceId: 'arthashastra-statecraft',
      note: 'Army upkeep is a game system inspired by statecraft and logistics.',
    },
    options: [
      {
        id: 'rotate-garrisons',
        title: 'Rotate and reward garrisons',
        argument: 'Spend food to preserve readiness and legitimacy.',
        effects: { food: -2, readiness: 2, legitimacy: 1 },
        evidence: {
          kind: 'gameplay-reconstruction',
          sourceId: 'arthashastra-statecraft',
          note: 'The rotation policy and numbers are invented.',
        },
      },
      {
        id: 'reduce-campaign-burden',
        title: 'Reduce campaign burden',
        argument: 'Recover treasury while accepting lower readiness.',
        effects: { treasury: 2, readiness: -2 },
        evidence: {
          kind: 'gameplay-reconstruction',
          sourceId: 'arthashastra-statecraft',
          note: 'This abstraction represents demobilization and deferred maintenance.',
        },
      },
    ],
  },
  {
    id: 'terms-and-elephants',
    season: 6,
    title: 'Terms at the frontier',
    problem:
      'A foreign envoy tests whether strength should become settlement or further pressure.',
    chandraguptaLine:
      'A frontier secured by terms may be worth more than a field won twice.',
    kautilyaLine:
      'The strongest agreement is one both sides prefer to the cost of renewing war.',
    context: {
      kind: 'claim-in-source',
      sourceId: 'seleucid-settlement',
      note:
        'A Seleucid-Mauryan settlement is cross-reported by later classical sources. This dialogue and timing are reconstructed.',
    },
    options: [
      {
        id: 'settlement',
        title: 'Secure a durable settlement',
        argument: 'Reduce threat and gain legitimacy through negotiated terms.',
        effects: { legitimacy: 2, threat: -3, treasury: 1 },
        evidence: {
          kind: 'claim-in-source',
          sourceId: 'seleucid-settlement',
          note:
            'The broad settlement is reported. Exact terms, dialogue, and these effects are reconstruction.',
        },
      },
      {
        id: 'press-advantage',
        title: 'Press the advantage',
        argument: 'Gain immediate wealth and readiness while risking renewed tension.',
        effects: { treasury: 2, readiness: 2, threat: 2 },
        evidence: {
          kind: 'gameplay-reconstruction',
          sourceId: 'seleucid-settlement',
          note: 'No surviving source records this alternative decision.',
        },
      },
    ],
  },
]

export const debateForSeason = (season: number) =>
  councilDebates.find((debate) => debate.season === season)

export const sourceById = (sourceId: string) =>
  sources.find((source) => source.id === sourceId)
