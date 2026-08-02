# Narrai / Gondwana Chapter — Approval Brief (pre-code)

**Status: DRAFT for human sign-off. No chapter code and no paid media may begin
until the named approvers below sign this brief.**

Proposed chapter on **Rani Durgavati of Garha-Katanga (Gondwana)** and her
resistance to the Mughal invasion of 1564 CE, culminating at Narrai. Produced
autonomously as a paper packet only, per the precedent set by
`PRATAPGAD_BRIEF.md`. Everything below is a *proposal*, not a decision.

Related conventions: the Kalinga chapter established our evidence-aware framing
and the "cost of victory" debrief; The Western Horizon (v0.10.0) established that
a chapter may refuse to dramatise an undocumented battle and instead make the
evidence itself the mechanic. Narrai should reuse one of those two established
tones rather than invent a third.

---

## 0. Why this needs sign-off

Durgavati is a **regional and increasingly national symbol**, and the chapter sits
at the intersection of Adivasi/Gond identity, Mughal-period conquest, and modern
commemorative politics. None of that makes the chapter improper — it makes it a
chapter that must not be written unreviewed. Specifically:

- The main narrative source is **Mughal**, written by the victors' side.
- There is no surviving Gond account.
- Her death is described in the sources as **self-inflicted to avoid capture**,
  which is a sensitive depiction requiring deliberate handling.
- Modern commemoration (statues, university naming, anniversary observances)
  means presentational choices will be read politically whether or not intended.

---

## 1. Experience contract (proposed)

- **Player objective:** as Durgavati's war council, fight an **asymmetric
  defensive campaign** — choose where to give ground, where terrain multiplies a
  smaller force, when to accept battle and when to refuse it.
- **The dominant tension:** you are outmatched in artillery and numbers. Every
  turn asks what you are willing to trade for time.
- **Agency boundary (hard):** the player commands dispositions, terrain, supply
  and the decision to give or refuse battle. **The queen's death is not a
  playable mechanic.** It is an evidence-labelled epilogue, presented as what the
  surviving (Mughal-side) source reports, with its provenance stated.
- **Success conditions:** proposed as *cost imposed and cohesion preserved*, not
  survival — the historical outcome is not in doubt and the chapter must not
  offer a counterfactual victory as the "good" ending.
- **Non-goals:** no communal framing; no invented atrocities; no invented
  quotations; no heroic-suicide spectacle; no implication that a different
  decision would have "won".

---

## 2. Evidence matrix (DRAFT — requires qualified Mughal-period / Gond-history review)

| Claim | Proposed label | Basis | Risk |
| --- | --- | --- | --- |
| Durgavati ruled Garha-Katanga as regent for her son | Recorded evidence | Multiple period sources agree | Low |
| A Mughal force under Asaf Khan invaded in 1564 | Recorded evidence | Mughal chronicle tradition | Low |
| A defensive engagement occurred at/near Narrai | Recorded evidence | Chronicle tradition | Low |
| Specific troop numbers | Claim in a source | Chronicle figures, victor-side, unverified | **High** — must be labelled, never used as a stat |
| Terrain (hills, river, narrow approach) shaped the battle | Scholarly inference | Topography + chronicle description | Medium |
| Her death was self-inflicted to avoid capture | Claim in a source | Mughal-side account; no Gond account survives | **High** — provenance must be stated on screen |
| Specific tactical dispositions, orders, timings | Gameplay reconstruction | None | Must be marked in-game |
| Any dialogue | Gameplay reconstruction | None | Must be marked in-game |

**Hard rule:** the chapter must state on screen that the surviving narrative is
from the invading side and that no Gond account of these events survives — the
same move the Kalinga chapter makes about the absent Kalingan voice.

---

## 3. Mechanics options (for reviewer to choose one)

1. **Attrition-and-terrain campaign** (recommended). Turn-based; the player
   spends terrain, mobility and cohesion to impose cost. Closest to the design
   doc's "terrain-led defensive campaign".
2. **Kalinga-style tactical board.** Reuses shipped code; cheapest; but risks
   reducing an asymmetric defensive war to an even-sided skirmish.
3. **Western-Horizon-style evidence campaign.** Would foreground the
   historiographical problem (only the victors wrote), but repeats the structure
   we just shipped and may feel like a formula.

## 4. Renderer and cost

- **No new 3D renderer.** Option 1 or 2 is 2D/DOM, matching Kalinga.
- **No paid media in v1.** Poster/still art only, or none. Any Sora spend is a
  separate approval.

## 5. Red lines

- No playable depiction of the queen's death.
- No invented Gond "voice" presented as recovered testimony.
- No victory ending that reverses the historical outcome.
- No use of victor-side casualty figures as balanced game statistics.

## 6. Required approvers

- [ ] Product owner
- [ ] Mughal-period / Gond-history and sensitivity reviewer
- [ ] Spend authorizer (only if any paid media is proposed)

**Chapter build is blocked until all applicable boxes are signed.**
