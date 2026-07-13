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
chapter should emphasize grand strategy, routes, diplomacy, and numismatic
evidence rather than inventing a single cinematic "decisive battle."

### 3. Rani Durgavati - The Defiance at Narrai

A terrain-led defensive campaign centered on Gondwana, mobility, and the Battle
of Narrai.

### 4. Lachit Borphukan - The Brahmaputra Holds

A river-warfare campaign centered on the Battle of Saraighat, coordinating
boats, forts, artillery, and land detachments.

### 5. Chhatrapati Shivaji Maharaj - The Hills of Pratapgad

A campaign about intelligence, hill-fort geography, diplomacy, and comparing
accounts of the Battle of Pratapgad.

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
