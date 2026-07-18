# Pratapgad Chapter — Approval Brief (pre-code, pre-spend)

**Status: DRAFT for human sign-off. No chapter code and no paid media may begin
until the named approvers below sign this brief.**

This is the Sol-gated approval packet for a proposed second playable chapter
covering the encounter at Pratapgad fort (10 November 1659) between Chhatrapati
Shivaji and the Adilshahi (Bijapur) general Afzal Khan. Pratapgad is a
**contested and communally sensitive** event in modern India; this brief is
deliberately conservative. It was produced autonomously per Sol's boundary
(research + paper design only). Everything below is a *proposal*, not a decision.

Related conventions: the Timber Gate chapter is now fully data-driven by
`ActionMissionDefinition` (see `RESUME.md`), and the Kalinga chapter already
demonstrates our evidence-aware, account-comparison pattern — Pratapgad should
reuse that established approach rather than invent a new tone.

---

## 0. Sol's ruling (2026-07-19)

- **NO-GO** on any Pratapgad chapter code, definition file, or Sora spend until
  human sign-off.
- **GO** (already done here) on the paper approval packet: evidence-matrix draft,
  mechanics alternatives, account-comparison wireframe/copy, and schema-gap /
  performance / test / cost analysis.
- Renderer: build a **bespoke `<PratapgadMission>`** and share only proven leaf
  infrastructure (Canvas shell, controls/HUD contracts, character loader/rig,
  objective/interaction indicators). **Do NOT** invent a JSON scene-description
  language; reconsider only after 3+ missions reveal stable patterns.
- Poster/still media is a **permanent supported fallback**, not scaffolding.
- Keep the disputed personal encounter **non-interactive** unless explicitly
  approved. Do **not** make Afzal Khan a boss/kill objective without sign-off.

---

## 1. Experience contract (proposed)

- **Player objective:** as a Maratha commander in Shivaji's confidence, *prepare
  the ground* for a high-risk parley beneath the fort — scout the wooded
  approach, position lookouts and the concealed reserve, and establish the signal
  that commits or aborts the plan. Success is measured by preparation and
  positioning, not by a duel.
- **Agency boundary (hard):** the player controls approach, preparation,
  signalling, terrain use, and withdrawal. The **personal encounter in the
  pavilion is a non-interactive, evidence-labelled cutscene**, framed as a
  *dramatic reconstruction of a disputed event*. The player never performs the
  killing blow as a mechanic in the default design.
- **Success conditions:** lookouts placed, reserve concealed within terrain
  cover, signal line established, withdrawal route held.
- **Failure conditions:** premature detection of the reserve, or the signal line
  broken (mirrors Kalinga's "disciplined withdrawal vs. exposure" outcomes).
- **Non-goals:** no communal/religious framing; no invented quotations, motives,
  or atrocities; no gore-driven boss kill; no claim of a single settled "truth"
  on the disputed first-strike question.

---

## 2. Evidence matrix (DRAFT — requires qualified Deccan-history review)

Claim-status legend: **[E]** established / broadly agreed · **[D]** disputed
between source traditions · **[T]** later tradition / commemorative ·
**[U]** unknown / underdetermined · **[R]** gameplay reconstruction (our
invention, must be labelled as such in-product).

| # | Claim | Status | Source traditions (attributed, not equal weight) | Proposed depiction |
|---|-------|--------|---------------------------------------------------|--------------------|
| 1 | A meeting/parley was arranged below Pratapgad fort, Nov 1659 | **[E]** | Maratha bakhars; Persian/Adilshahi accounts; modern scholarship | Shown as setup beat |
| 2 | Afzal Khan led a large Bijapur (Adilshahi) expedition against Shivaji | **[E]** | Both traditions; modern scholarship | Strategic framing in intro |
| 3 | The meeting ended in violence; Afzal Khan died; the Bijapur force was routed at Pratapgad | **[E]** | Both traditions; modern scholarship | Non-interactive cutscene + debrief |
| 4 | **Who struck first / premeditation** | **[D]** | Maratha tradition: Khan attempted treachery first; Persian accounts and some scholarship differ on initiative and intent | Present *side by side* as disputed; take no in-product side |
| 5 | Concealed weapons (bagh nakh "tiger claws", bichhwa dagger) were used | **[D]** | Strong in Maratha tradition; contested in detail elsewhere | Prop referenced only in labelled reconstruction, not asserted as fact |
| 6 | Specific dialogue exchanged in the tent | **[U]** | Later chronicles give varying words | **Do not depict** invented quotations |
| 7 | Terrain: dense wooded, steep approach around Pratapgad favoured the Marathas | **[E]** | Geography; both traditions; scholarship | Core to the greybox mechanic |
| 8 | Maratha forces were pre-positioned near the meeting ground | **[D/T]** | Prominent in Maratha tradition; degree/coordination debated | Abstracted into the "reserve" mechanic, labelled reconstruction |

> **Rule:** the account-comparison UI must state that these traditions do **not**
> carry equal evidentiary weight and must attribute each, per Sol.

---

## 3. Greybox flow (paper, 4 beats)

1. **Approach** — traverse the wooded, stepped path toward the meeting ground;
   primitive terrain; stealth-lite (reuse guard perception as *lookouts*, no new
   AI). Mechanic: stay within cover corridors.
2. **Preparation** — place N lookouts and conceal the reserve within cover
   (reuse the objective-in-range/interaction pattern from `missionRuntime.ts`).
3. **The signal** — establish/hold a signal line (single interaction gate; reuse
   the `interact-at-exit-v1`-style predicate conceptually, likely a new
   `hold-signal-v1` rule in a schema extension — see §5).
4. **Aftermath** — **non-interactive** reconstruction cutscene (still-image
   fallback by default) + evidence-labelled debrief distinguishing player agency
   from historical claims (mirrors Kalinga debrief).

Core mechanic = **positioning + terrain + signalling**, not a duel. One
success/failure loop, restart path, feature-flagged behind an off-by-default flag.

---

## 4. Account-comparison wireframe + draft copy

Reuse the Kalinga account-comparison component pattern. Wireframe:

```
┌───────────────────────────────────────────────┐
│  Pratapgad, 1659 — what the sources say         │
│  ───────────────────────────────────────────── │
│  The meeting happened. Afzal Khan died. The     │  ← [E] established, neutral
│  Bijapur army was routed.                       │
│                                                 │
│  Disputed: who struck first?                    │  ← [D]
│  ┌───────────────┐   ┌────────────────────────┐ │
│  │ Maratha        │   │ Other accounts /        │ │
│  │ tradition      │   │ modern scholarship      │ │
│  │ (attributed)   │   │ (attributed)            │ │
│  └───────────────┘   └────────────────────────┘ │
│                                                 │
│  Sources do not carry equal evidentiary weight. │
│  This scene is a dramatic reconstruction.       │
└───────────────────────────────────────────────┘
```

Draft copy is intentionally minimal and **must** be replaced by
historian-reviewed final copy before release. No quotations. Political/military
framing only.

---

## 5. Schema-gap, renderer, performance, test & cost analysis

**Schema gaps (blocking a clean second mission):** `ActionMissionDefinition` is
not yet mission-neutral —
- imports Nanda AI types (`src/action/missionDefinition.ts:13-14`),
- boss `driverId` fixed to `nanda-captain-v1` (line 93),
- prompt keys encode gates/bosses (lines 58-67),
- `NandaMission` imports Timber data directly (`src/nanda/NandaMission.tsx`).

Do **not** force Pratapgad into the v1 schema. After mechanics approval, design
the **smallest** schema v2/extension needed: generic prompt-key set, optional
(nullable) boss already supported, a new completion rule kind
(e.g. `hold-signal-v1`) added to the existing discriminated union, and
AI-driver ids made generic. Keep it additive and behind tests.

**Renderer:** bespoke `<PratapgadMission>` + a small shared `src/action/`
component kit extracted from proven Timber leaves (Canvas shell, HUD/controls
contracts, character loader/rig, indicators). No scene-description DSL.

**Performance:** reuse the definition budget contract (dpr, light/shadow caps,
shadow-map size). Target the same mobile budget (≤5 lights / 2 point / 1 shadow /
1024 map). Greybox uses primitives → cheap.

**Testing:** mirror the migration discipline — pure helpers unit-tested first
(any new completion/signal predicate gets a truth table BEFORE wiring), then a
smoke path (boots, controls, no console errors) added to `tests/smoke.mjs`, then
a desktop+mobile playthrough capture.

**Cost (Sora):** deferred. Rough envelope for planning only: intro + debrief =
~2 short clips; prior story/Kalinga/Maurya intros were 8s 720×1280. Actual
storyboard, prompts, and spend cap require separate explicit authorization; keep
the generator idempotent via the gitignored `--state` file.

---

## 6. Red lines (hard) and required human approvers

**Red lines — do not, under any autonomous circumstance:**
- make Afzal Khan a boss/kill objective, or make the pavilion killing a player
  mechanic, without explicit sign-off;
- depict invented quotations, motives, religious symbolism, or atrocity claims;
- assert a single side of the disputed first-strike/premeditation question;
- generate, composite, or spend on Sora media;
- frame the event as Hindu-versus-Muslim rather than political/military;
- ship any historical copy without historian + product-owner review.

**Required approvers before ANY Pratapgad code or media:**
1. **Product owner** — experience contract, agency boundary, feature scope.
2. **Qualified Deccan-history / sensitivity reviewer** — evidence matrix,
   account-comparison copy, red lines.
3. **Spend authorizer** — any Sora generation and its cost cap.

---

## 7. Recommended next actions (post-sign-off, in order)

1. Human approvers sign §1, §2, §4, §6.
2. Author `src/pratapgad/pratapgadDefinition.ts` (data only) + minimal schema v2
   extension, unit-tested, feature-flagged off.
3. Greybox `<PratapgadMission>` with primitives + poster fallback (NO Sora).
4. Smoke + playthrough capture; ship behind flag.
5. Only then: storyboard → spend authorization → Sora → human footage review →
   labelled integration.

Until step 1 is satisfied, this chapter is **blocked pending human review**.
