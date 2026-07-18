# Unity Client QA Report & Divergence Matrix

Date: 2026-07-18. Web client version: **v0.6.3**. Unity client version: **v0.5.0**.

## Product direction

The **web / PWA client** (`src/`, React 19 + React-Three-Fiber) is the
**authoritative, actively developed product**. The **Unity 6 native client**
(`unity/ChakravartiAction`) is a **frozen v0.5.0 vertical-slice prototype**,
retained as a native showcase. No web features are ported to Unity without an
explicit realignment project (Sol review, 2026-07-18).

## QA performed

Runtime smoke of the existing Unity **Windows** build via the built-in
`AutomatedSmokeRunner` (`-smokeTest -smokeOutput=...`), which moves the hero,
issues an attack, captures a screenshot, and quits.

| Check | Result |
| --- | --- |
| Windows player launches | ✅ Pass |
| Renders the mission (HUD, hero, touch controls, lighting) | ✅ Pass (screenshot captured) |
| Scripted movement + attack execute | ✅ Pass |
| Clean exit code | ✅ `0` |
| `Player.log` exceptions | ✅ None (only a benign D3D11 video-decode fallback warning) |
| Android build artifact present | ✅ `ChakravartiAction-v0.5.0.apk` (21.4 MB) |
| Android **runtime** on device/emulator | ⚠️ **Unverified** — no device/emulator available |

**Verdict: Unity v0.5.0 build verified and Windows runtime verified. Android
build present but runtime unverified.**

## Divergence matrix — web v0.6.3 vs Unity v0.5.0

| Feature | Web (authoritative) | Unity v0.5.0 |
| --- | --- | --- |
| Third-person movement, jump, sword combat | ✅ | ✅ |
| Guards, objectives, opening gate | ✅ | ✅ (simple chase) |
| Mobile touch controls + HUD | ✅ | ✅ |
| Stealth-aware guard AI (vision, hearing, flank, telegraph) | ✅ v0.5.3 | ❌ |
| Nanda Captain boss fight (phases, lunge, HP bar) | ✅ v0.6.0 | ❌ |
| Sora cinematic story intro + narration | ✅ v0.5.2 | ❌ |
| First-run gameplay tutorial | ✅ v0.5.2 | ❌ |
| Victory/defeat aftermath cutscenes | ✅ v0.6.1 | ❌ |
| Mobile GPU perf pass (light/shadow budget) | ✅ v0.5.4 | ❌ |
| Grandiose character presentation pass | ✅ v0.6.3 | ❌ |
| Strategy / evidence / campaign layer | ✅ | ❌ |
| Repeatable browser smoke test | ✅ v0.6.2 | Built-in native smoke runner |

## Recommendation

Keep Unity **frozen**. If a native client is ever prioritised, treat it as a new
realignment project that ports the web gameplay contract (guard AI, boss,
onboarding, cutscenes) rather than resuming the v0.5.0 slice in place. For now,
ship all gameplay on the web/PWA (and its Capacitor APK).

## Reproduce

```powershell
# Fresh build (installed Unity 6 editors: 6000.5.3f1, 6000.3.19f1)
npm run unity:windows   # or unity:android

# Runtime smoke of an existing Windows build
unity\ChakravartiAction\Builds\Windows\ChakravartiAction.exe `
  -smokeTest -smokeOutput=$env:USERPROFILE\unity-smoke.png
```
