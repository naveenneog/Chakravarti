# Chakravarti: Chronicles of Bharat

A mobile-first, turn-based historical strategy anthology about Indian rulers,
defenders, and decisive wars. The first playable vertical slice is **The Cost
of Kalinga**, set during the Mauryan conquest around 261 BCE.

**Play:** <https://naveenneog.github.io/Chakravarti/>  
**Android APK:** <https://github.com/naveenneog/Chakravarti/releases/download/v0.2.0/Chakravarti-v0.2.0.apk>

![Kalinga chapter cinematic](public/media/kalinga-intro-poster.jpg)

The game never treats tactical invention as established history. Every chapter
separates:

- **Recorded evidence** from inscriptions, archaeology, coins, and contemporary
  or near-contemporary sources.
- **Claims inside a source**, such as the human toll stated in Ashoka's Major
  Rock Edict XIII.
- **Gameplay reconstruction**, including maps, formations, unit rosters, and
  turn objectives that are not preserved in the historical record.

## Play locally

```powershell
npm install
npm run dev
```

## Validate

```powershell
npm test
npm run build
npm run lint
```

## Current vertical slice

- Installable responsive PWA.
- Portrait-first 7x8 touch battlefield.
- Deterministic movement, terrain, combat, and enemy turns.
- Mauryan infantry, archers, cavalry, elephant corps, and command unit.
- Kalingan defenders with a command-standard objective.
- A neutral "cost of war" score that rises with damage on either side.
- Turn-by-turn historical evidence cards and a source-backed codex.
- Azure Speech narration and Azure Sora intro hooks.

## Distribution direction

1. **Mobile first:** installable PWA and Capacitor Android APK.
2. **Desktop second:** the same React rules and content packaged with Tauri,
   adding keyboard shortcuts, larger maps, and expanded command panels.

The rules engine and scenario data stay platform-neutral so mobile and desktop
do not fork into different games.

See [project-docs/GAME_DESIGN.md](project-docs/GAME_DESIGN.md),
[project-docs/HISTORICAL_METHOD.md](project-docs/HISTORICAL_METHOD.md), and
[project-docs/AZURE_MEDIA_PIPELINE.md](project-docs/AZURE_MEDIA_PIPELINE.md).

## Android package

```powershell
npm run apk
```

This produces `Chakravarti-v<version>.apk`, signed with the Android debug key
for direct installation and GitHub release distribution.

## GitHub Pages package

```powershell
npm run build:pages
```

The generated `docs/` directory is the deployable GitHub Pages site.
