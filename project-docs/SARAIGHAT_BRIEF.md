# Saraighat Chapter — Approval Brief (pre-code)

**Status: DRAFT for human sign-off. No chapter code and no paid media may begin
until the named approvers below sign this brief.**

Proposed chapter on **Lachit Borphukan** and the Ahom defence of the Brahmaputra,
culminating in the naval engagement at **Saraighat (1671 CE)**. Produced
autonomously as a paper packet only, per the precedent set by
`PRATAPGAD_BRIEF.md`. Everything below is a *proposal*, not a decision.

---

## 0. Why this needs sign-off

Saraighat is the least contested of the remaining chapters factually — it is well
attested from **both** sides, which is unusual and valuable. The sensitivity is
different in kind:

- Lachit has become a **strong national symbol** in recent years, with
  significant state commemoration. Presentational choices carry weight.
- The Ahom sources (**buranjis**) are a genuine indigenous chronicle tradition and
  deserve to be treated as sources in their own right, not as colour on a Mughal
  narrative. Getting that framing wrong would be a substantive failure.
- Regional/ethnic representation in Assam requires care in naming, art direction
  and language.

This chapter is the **strongest candidate of the three remaining** for a full
build, because the evidence is good on both sides and there is a real, teachable
tactical subject that does not require inventing a battle.

---

## 1. Experience contract (proposed)

- **Player objective:** as Lachit's command, **hold the river**. Fight a
  combined-arms defensive campaign in which the river, the monsoon, fortified
  earthworks and boat handling are the actual weapons.
- **The core insight to teach:** the Ahom side won by refusing to fight the war
  the Mughals were equipped for — choosing the narrow river reach, fighting from
  prepared banks, and using small fast boats against a larger fleet.
- **Agency boundary:** the player commands emplacements, boat squadrons, supply
  and timing. The famous personal episodes (the uncle at the ramparts; commanding
  while ill) are presented as **evidence-labelled chronicle episodes**, not as
  QTE-style playable beats.
- **Success conditions:** the river line holds and the fleet is broken in the
  narrows.
- **Non-goals:** no communal framing of a Mughal-vs-Ahom war as a religious one;
  no invented atrocities; no invented dialogue presented as chronicle.

---

## 2. Evidence matrix (DRAFT — requires qualified Ahom / Mughal-period review)

| Claim | Proposed label | Basis | Risk |
| --- | --- | --- | --- |
| A Mughal campaign against the Ahom kingdom culminated at Saraighat in 1671 | Recorded evidence | Attested in both buranji and Mughal traditions | Low |
| Lachit Borphukan held the Ahom command | Recorded evidence | Buranji tradition | Low |
| The engagement was fought on the Brahmaputra near Saraighat | Recorded evidence | Both traditions | Low |
| Ahom forces used numerous small, fast boats against a larger fleet | Scholarly inference | Chronicle description + terrain | Medium |
| Earthwork/rampart defences shaped the approach | Recorded evidence | Chronicle + surviving archaeology | Low |
| Specific fleet and troop numbers | Claim in a source | Chronicle figures, unverified | **High** — label, never use as raw stats |
| The episode of Lachit and his uncle at the ramparts | Claim in a source / literary tradition | Buranji tradition, later elaborated | **High** — present with provenance |
| Lachit commanding while gravely ill | Claim in a source | Buranji tradition | Medium — label |
| Specific squadron orders, timings, dispositions | Gameplay reconstruction | None | Must be marked in-game |

**Framing rule:** the buranjis must be introduced to the player *as a chronicle
tradition with its own authorship and purpose*, exactly as the Kalinga chapter
introduces Ashoka's edict as Ashoka's own claim. Two source traditions that broadly
agree is a genuinely strong evidential position and the chapter should say so —
this is the one remaining chapter where we can show corroboration rather than
absence.

---

## 3. Mechanics options (for reviewer to choose one)

1. **River-line defence campaign** (recommended). Turn-based; the player places
   emplacements, allocates boat squadrons, and chooses when to commit, with the
   narrows as the decisive terrain. Combined-arms without inventing detail.
2. **Kalinga-style tactical board on water.** Cheapest, reuses shipped code, but
   a square grid handles a river badly.
3. **Action mission.** Would require a bespoke `<SaraighatMission>` per Sol's
   architectural guardrail, plus water rendering. **Highest cost by a wide
   margin**; not recommended for v1.

## 4. Renderer and cost

- **No new 3D renderer for v1.** Option 1 is 2D/DOM.
- Per Sol's standing guardrail: if an action mission is ever approved, build a
  bespoke mission component and share only proven leaf infrastructure. **Do not**
  build a generic scene-description language.
- **No paid media in v1.** Any Sora spend is a separate approval.

## 5. Red lines

- No religious framing of the conflict.
- No treatment of the buranjis as folklore while treating Mughal chronicles as
  history, or vice versa.
- No invented quotations attributed to Lachit.
- No casualty figures presented as established fact.

## 6. Required approvers

- [ ] Product owner
- [ ] Ahom / north-east India history and sensitivity reviewer
- [ ] Spend authorizer (only if any paid media is proposed)

**Chapter build is blocked until all applicable boxes are signed.**
