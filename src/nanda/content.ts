import type {
  PlanCategory,
  PlanId,
  PlanOption,
  SourceRecord,
} from './types'

export const nandaSources: readonly SourceRecord[] = [
  {
    id: 'nanda-transition',
    title: 'Modern scholarship on the Nanda-Maurya transition',
    detail:
      'Independent later Indian and Greco-Roman traditions agree on the broad dynastic transition, while no contemporary narrative of the campaign survives.',
  },
  {
    id: 'arthashastra-statecraft',
    title: "Kautilya's Arthashastra",
    detail:
      'A composite statecraft text attributed to Kautilya that describes intelligence, alliances, logistics, fortification, and political destabilization. Its date and authorship are disputed.',
    url: 'https://en.wikisource.org/wiki/Arthashastra',
  },
  {
    id: 'olivelle-2013',
    title: 'Patrick Olivelle, King, Governance, and Law in Ancient India',
    detail:
      'A modern critical translation and study emphasizing that the extant Arthashastra is a layered text rather than a transcript of Chandragupta Maurya’s government.',
  },
  {
    id: 'megasthenes-fragments',
    title: 'Megasthenes fragments preserved by later authors',
    detail:
      'The lost Indica describes Palibothra as a timber-walled city with a ditch, gates, and towers. Its exact measurements survive only as claims quoted by later writers.',
    url: 'https://archive.org/details/AncientIndiaAsDescribedByMegasthenesAndArrian',
  },
  {
    id: 'pataliputra-archaeology',
    title: 'Kumhrar and Bulandi Bagh archaeological evidence',
    detail:
      'Excavation confirms large timber fortification, a defensive moat, and monumental architecture at ancient Pataliputra, but no conquest sequence or Nanda palace assault.',
  },
  {
    id: 'plutarch-alex-62',
    title: 'Plutarch, Life of Alexander 62',
    detail:
      'Writing centuries later, Plutarch preserves a tradition connecting the young Chandragupta with Alexander’s era and describing the reigning eastern king as unpopular.',
    url: 'https://www.perseus.tufts.edu/hopper/text?doc=Plut.+Alex.+62',
  },
  {
    id: 'justin-xv-4',
    title: 'Justin, Epitome XV.4',
    detail:
      'A late Latin epitome describes Chandragupta displacing an existing dynasty. Its vivid origin story is transmitted literary tradition, not an eyewitness account.',
    url: 'https://www.attalus.org/translate/justin15.html',
  },
  {
    id: 'mudrarakshasa-play',
    title: 'Vishakhadatta, Mudrarakshasa',
    detail:
      'A Sanskrit political drama composed centuries later that depicts Chanakya using intelligence and shifting ministerial loyalties to establish Chandragupta.',
  },
]

export const planCategoryCopy: Record<
  PlanCategory,
  { title: string; description: string }
> = {
  intelligence: {
    title: 'Intelligence',
    description:
      'Decide what must be known before Chandragupta enters the fortified district.',
  },
  alliance: {
    title: 'Alliance',
    description:
      'Choose whose support shapes the route through the city and the resistance inside it.',
  },
  logistics: {
    title: 'Logistics',
    description:
      'Balance protection and mobility for a short, uncertain operation behind timber walls.',
  },
}

export const nandaPlans: Record<PlanId, PlanOption> = {
  'watch-rotations': {
    id: 'watch-rotations',
    category: 'intelligence',
    title: 'Watch the guard rotations',
    summary:
      'Pay independent observers to mark patrol changes and exposed objectives.',
    consequence:
      'One fewer guard enters the district and mission objectives remain visible.',
    strategicDelta: { treasury: -1, intelligence: 2 },
    missionEffect: {
      enemyCount: -1,
      revealObjectives: true,
      routeLabel: 'Observed roofline',
    },
    evidence: {
      kind: 'claim-in-source',
      sourceId: 'arthashastra-statecraft',
      note:
        'The text advocates cross-checked intelligence. These observers, routes, and exact bonuses are gameplay reconstruction.',
    },
  },
  'court-rumors': {
    id: 'court-rumors',
    category: 'intelligence',
    title: 'Turn court rumors into access',
    summary:
      'Use political reports to identify a neglected dispatch cache before entry.',
    consequence:
      'One objective begins secured and guards have lower resolve, but the network costs more.',
    strategicDelta: { treasury: -2, intelligence: 1, unrest: -1 },
    missionEffect: {
      securedObjectives: 1,
      enemyHealth: -12,
      routeLabel: 'Court service passage',
    },
    evidence: {
      kind: 'literary-tradition',
      sourceId: 'mudrarakshasa-play',
      note:
        'The drama emphasizes intrigue and shifting loyalties. This cache and every participating character are invented.',
    },
  },
  'guild-network': {
    id: 'guild-network',
    category: 'alliance',
    title: 'Rally the river-market guilds',
    summary:
      'Ask local carriers and traders to open a service gate and hide one dispatch.',
    consequence:
      'The side gate opens, one objective begins secured, and popular support rises.',
    strategicDelta: { treasury: -1, popularSupport: 2, unrest: -1 },
    missionEffect: {
      sideGateOpen: true,
      securedObjectives: 1,
      routeLabel: 'Guild service gate',
    },
    evidence: {
      kind: 'gameplay-reconstruction',
      sourceId: 'megasthenes-fragments',
      note:
        'Urban administration and trade are source-informed themes. This guild alliance and service gate are not documented events.',
    },
  },
  'frontier-veterans': {
    id: 'frontier-veterans',
    category: 'alliance',
    title: 'Stage a veteran diversion',
    summary:
      'Coordinate a visible challenge outside the wall while Chandragupta enters elsewhere.',
    consequence:
      'One fewer guard remains inside and Chandragupta deals more damage.',
    strategicDelta: { treasury: -2, legitimacy: 1 },
    missionEffect: {
      enemyCount: -1,
      attackDamage: 10,
      routeLabel: 'Diversion at the river wall',
    },
    evidence: {
      kind: 'gameplay-reconstruction',
      sourceId: 'nanda-transition',
      note:
        'No surviving source records this diversion, its participants, or the route of the Nanda campaign.',
    },
  },
  'hidden-caches': {
    id: 'hidden-caches',
    category: 'logistics',
    title: 'Prepare hidden supply caches',
    summary:
      'Trade speed for bandages, water, and protected equipment inside the district.',
    consequence:
      'Chandragupta begins with more health and two recovery charges.',
    strategicDelta: { treasury: -1, popularSupport: 1 },
    missionEffect: {
      maxHealth: 30,
      healingCharges: 2,
      routeLabel: 'Supplied courtyard route',
    },
    evidence: {
      kind: 'gameplay-reconstruction',
      sourceId: 'arthashastra-statecraft',
      note:
        'Logistical preparation is source-inspired. The caches and their effects are invented for the mission.',
    },
  },
  'light-kit': {
    id: 'light-kit',
    category: 'logistics',
    title: 'Travel light across the roofs',
    summary:
      'Carry only essential equipment and rely on speed through elevated passages.',
    consequence:
      'Movement and jumping improve, but no healing supplies are available.',
    strategicDelta: { legitimacy: 1 },
    missionEffect: {
      moveSpeed: 1.2,
      jumpForce: 1.6,
      routeLabel: 'Light roofline approach',
    },
    evidence: {
      kind: 'gameplay-reconstruction',
      sourceId: 'pataliputra-archaeology',
      note:
        'The timber architecture is archaeologically informed. The traversable roofs and this approach are reconstructed.',
    },
  },
}

export const plansByCategory = (
  category: PlanCategory,
): readonly PlanOption[] =>
  Object.values(nandaPlans).filter((plan) => plan.category === category)

export const nandaSourceById = (sourceId: string) =>
  nandaSources.find((source) => source.id === sourceId)
