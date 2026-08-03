# Chakravarti Game Design

## Vision

**Chakravarti: Chronicles of Bharat** is a turn-based strategy anthology in
which each campaign teaches a real period, real political conflict, and the
limits of surviving evidence. The anthology frame is grand and mythic; the
battles themselves remain inside their own historical era.

The game should create admiration for leadership, logistics, courage, diplomacy,
and statecraft without treating conquest or casualties as spectacle.

## Player promise

- Command a famous historical campaign in sessions that work on a phone.
- Understand why terrain, supply, morale, alliances, and information mattered.
- Meet rulers and defenders as people in a political context, not collectible
  superheroes detached from their century.
- Leave each chapter knowing which details are evidenced and which were
  reconstructed for play.

## Core loop

1. Give the player direct control of one character in the graphical mission.
2. Teach movement, traversal, combat, and the objective through play.
3. Offer strategy, evidence, and campaign planning as optional overlays.
4. Return the mission outcome to political and military state.
5. Show human cost, historical evidence, and reconstruction boundaries after
   the action instead of blocking first play with them.
6. Carry campaign decisions into the next mission.

The product must open action-first. Anthology navigation, codex, cinematics, and
War Council planning support the game but never replace the first playable view.

## Battle model

The vertical slice uses a readable square grid before any move to a more complex
hex system. A unit can move once and attack once each turn.

Terrain changes movement and defense:

- Plains favor mobility.
- Forests slow troops and protect against ranged attacks.
- Hills provide defensive advantage.
- Rivers create costly crossings.
- Villages provide cover but should later carry civilian-risk consequences.

The combat model is deterministic. Players can understand the result before
committing instead of depending on opaque random rolls.

## Close-combat model (action missions)

Close combat is a conversation, not a damage race. Every enemy attack is
telegraphed, and the player has exactly one defensive verb — **Guard** — whose
timing decides the outcome:

| Input | Outcome |
| --- | --- |
| Guard raised as the blow lands | **Parry** — no damage, attacker staggered, riposte window opens |
| Guard raised inside the leading slice of that window | **Perfect parry** — longer stagger, larger riposte |
| Guard already up when the blow lands | **Block** — reduced damage, paid for out of Resolve |
| Resolve exhausted | **Guard break** — extra damage and the verb is locked briefly |
| Blow from outside the frontal arc | Lands in full |

Three rules keep it a skill: Resolve makes turtling lose, a re-raise cooldown
makes mashing lose, and the frontal arc makes positioning matter — which is what
gives the guards' flanking behaviour its consequence. Riposte and
target-vulnerability bonuses never stack; the larger one wins.

The logic is a pure, engine-agnostic, unit-tested module (`src/nanda/combat.ts`)
in the same family as `guardAi.ts` and `bossAi.ts`. Per-chapter tuning is data on
the mission definition (`encounters.playerCombat`), defaulting to the shipped
config. Feedback is driven from the resolution itself — hit-stop, camera punch,
sparks, audio and the on-screen banner all read the same outcome, so the juice
can never drift out of sync with the rules.

### Enemy archetypes

One verb only stays interesting if different enemies ask different questions of
it. Archetypes (`src/nanda/archetypes.ts`) are equipment-led, and the equipment
comes from a source the chapter already cites rather than from invention:

| Archetype | Question it asks | Answer |
| --- | --- | --- |
| Sentry | Can you read a wind-up? | Parry it |
| Javelineer | Longer reach, and the thrust steps in | Stand and parry; retreat no longer works |
| Shieldbearer | Carries the player's own mechanic | Flank the narrow buckler, or punish the window after his blow |
| Archer | Outranges everything | Close during the long draw, break line of sight, or deflect the arrow |

The shieldbearer is the design keystone: his buckler is long but **not broad**,
so it covers his front and not his flanks — the historical detail and the
mechanic are the same decision. He cannot be out-damaged, which forces the parry
to be learned rather than optional.

An archetype is data (perception config, behaviour flags, presentation kit,
evidence labels) attached to a guard spawn in the mission definition, so a new
chapter composes a garrison without touching the runtime.

## Strategic layers planned after the vertical slice

- **Supply:** food, animals, river access, and road networks.
- **Morale:** leadership, fatigue, losses, and defensive purpose.
- **Intelligence:** scouts, local guides, spies, and uncertain enemy positions.
- **Diplomacy:** vassals, allied polities, tribute, truces, and legitimacy.
- **Season:** monsoon, heat, river levels, and campaign timing.
- **Consequence:** displacement, treasury cost, resentment, and post-war policy.

## Historical campaign roadmap

### 1. Ashoka Maurya - The Cost of Kalinga

The conquest is recorded, while battlefield details are largely unknown. This
chapter therefore teaches the edict, its stated human toll, the absence of a
surviving Kalingan account, and Ashoka's remorse. Tactical missions are labeled
reconstruction.

### 2. Chandragupta II Vikramaditya - The Western Horizon

Coins, inscriptions, and the end of Western Kshatrapa rule strongly support the
western conquest. Exact battle narratives are not securely preserved. This
chapter therefore emphasizes grand strategy, routes, diplomacy, and numismatic
evidence rather than inventing a single cinematic "decisive battle."

**Shipped in v0.10.0.** The constraint became the mechanic: there is no battle to
win, so the player conducts a reign — routes, the Vakataka marriage, mint policy,
endowments, local officers — and every season either leaves a durable artifact or
leaves nothing at all. Coinage is the scoreboard: Kshatrapa silver must actually
stop and Gupta silver in their weight standard must take its place, which needs
market acceptance rather than only military reach. The ending is a historian's
dossier reconstructing the reign from what survived, with a coinage chart drawn
from the player's own campaign. Winning by pure force produces the *hollow
conquest* ending, in which the record cannot say what happened — which is the
lesson the chapter exists to teach.

### 3. Rani Durgavati - The Defiance at Narrai

A terrain-led defensive campaign centered on Gondwana, mobility, and the Battle
of Narrai.

**Shipped in v0.11.0.** The chapter on a **hostile record**: the only narrative
of this campaign belongs to the invaders, and no Gond account survives. The
campaign cannot be won and offers no counterfactual in which it is. The player
trades the defiles of Narrai between two axes they actually controlled — the
price the invasion pays, and how many people get out — and the epilogue prints
the short, self-serving imperial account beside everything the player did that
it does not preserve. The queen's death appears once, as what that single source
reports, and is never a mechanic.

### 4. Lachit Borphukan - The Brahmaputra Holds

A river-warfare campaign centered on the Battle of Saraighat, coordinating
boats, forts, artillery, and land detachments.

**Shipped in v0.11.0.** The chapter on **corroboration** — the one place in the
anthology where two independent traditions, the Assamese buranjis and the
Mughal-side accounts, broadly agree, and each season shows both side by side.
The verb is *choose the ground*: earthworks close the land approach so the
imperial fleet must come up the narrows where its weight cannot tell. The
narrows are never picked from a menu, they are earned by making every other
approach impossible — and accepting battle in the open field throws all of it
away, as it historically did at Alaboi.

### 5. Chhatrapati Shivaji Maharaj - The Hills of Pratapgad

A campaign about intelligence, hill-fort geography, diplomacy, and comparing
accounts of the Battle of Pratapgad.

**Shipped in v0.11.0.** The chapter on an **irreconcilable record**. The player
never fights: there is no strike action, no target and no combat resolution
anywhere in the engine. They arrange the hills — scouting, lookouts, a concealed
reserve, a signal chain, a withdrawal route — and the arrangement is scored on
its weakest element rather than its average. The encounter beneath the fort is
narrated in neutral terms, labelled *disputed and not depicted*, and the
aftermath presents the contradictory accounts of who struck first, whether it
was premeditated, and how many were present, each marked **unresolved** with the
reason it cannot presently be settled.

## Epic and literary material

The Mahabharata, Ramayana, and other Itihasa or literary traditions can form a
separate collection. Those chapters should teach the texts, regional retellings,
strategy, ethics, and literary influence while clearly using **literary
tradition** labels rather than presenting every event as independently verified
history.

## Mobile-first interaction

- Primary target: portrait phones from 360 CSS pixels wide.
- Touch targets: at least 44 CSS pixels.
- One-thumb actions: select, move, attack, end turn.
- Session length: five to eight minutes per tactical mission.
- No required hover states.
- Bottom navigation and compact status panels.
- Audio is optional, captioned, and never required for rules comprehension.
- Reduced-motion support and symbols in addition to color.

## Desktop distribution

Desktop uses the same web client and game engine. It adds:

- Larger battlefields and persistent side panels.
- Keyboard shortcuts and mouse inspection.
- Higher-resolution cinematics and optional multi-window codex.
- Deeper army composition and campaign planning.

The planned packaging order is Capacitor for mobile, then Tauri for desktop.

## Art direction

The visual identity should be monumental but evidence-aware:

- Indian stone, wood, textiles, terrain, inscriptions, and period material
  culture rather than generic fantasy armor.
- Deep crimson as the main interface accent.
- Hero portraits should avoid deity-like halos unless a sourced artistic
  tradition specifically calls for them.
- War is shown without gore. Aftermath emphasizes people, policy, and memory.
- Every generated asset receives a prompt record and historical review.

## Presentation quality gate

- The main playable character must use a rigged, animated humanoid or a reviewed
  equivalent asset. Primitive mannequin geometry is allowed only for internal
  collision and prototyping, never as the release-facing hero.
- Every live action mission needs ambience, adaptive music, movement sounds,
  combat impacts, damage response, objective cues, and outcome audio.
- Lighting must provide readable depth through shadows, key and fill lights,
  atmospheric separation, and visible landmarks in both light and dark themes.
- A release is not "grandiose" merely because the setting is historical; scale,
  animation, sound, camera, material treatment, and feedback must support it.
