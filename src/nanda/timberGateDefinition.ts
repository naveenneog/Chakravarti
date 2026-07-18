/**
 * The Timber Gate mission, encoded as an ActionMissionDefinition.
 *
 * Gate 3 of the Sol-approved migration: this data mirrors the values currently
 * hardcoded across NandaMission.tsx / NandaCampaign.tsx / engine.ts EXACTLY. It
 * is not wired into production yet — the golden tests in
 * timberGateDefinition.test.ts pin these values so subsequent wiring commits
 * (gates 5–13) can migrate one subsystem at a time with no behaviour change.
 */

import type { ActionMissionDefinition } from '../action/missionDefinition'
import { GUARD_PERCEPTION } from './guardAi'
import { BOSS_CONFIG, BOSS_MAX_HEALTH } from './bossAi'
import { floorHeightAt, isBlocked } from './missionGeometry'

export const timberGateDefinition: ActionMissionDefinition = {
  schemaVersion: 1,

  identity: {
    id: 'timber-gate',
    chapterId: 'fall-of-nandas',
    title: 'The Timber Gate',
  },

  topology: {
    sceneId: 'pataliputra-timber-district',
    worldBounds: { minX: -9.6, maxX: 9.6, minZ: -15.2, maxZ: 15.2 },
    playerSpawn: { x: 0, y: 0.85, z: 13.4 },
    anchors: {
      exit: {
        id: 'northern-gate',
        position: { x: 0, z: -12.4 },
        interactionRadius: 2.4,
      },
    },
    geometry: { floorHeightAt, isBlocked },
  },

  encounters: {
    guardAi: { driverId: 'guard-ai-v1', config: GUARD_PERCEPTION },
    guards: [
      {
        id: 'nanda-guard-1',
        spawn: { x: 0, y: 0, z: 6 },
        patrol: [{ x: 0, z: 6 }, { x: 3.2, z: 8.6 }, { x: -2.6, z: 8 }],
        flankSign: 1,
      },
      {
        id: 'nanda-guard-2',
        spawn: { x: 5.5, y: 0, z: 3 },
        patrol: [{ x: 5.5, z: 3 }, { x: 7.6, z: 6.6 }, { x: 4, z: 1.4 }],
        flankSign: -1,
      },
      {
        id: 'nanda-guard-3',
        spawn: { x: -4, y: 0, z: -3 },
        patrol: [{ x: -4, z: -3 }, { x: -6.6, z: -1.4 }, { x: -3, z: -6 }],
        flankSign: 1,
      },
      {
        id: 'nanda-guard-4',
        spawn: { x: 5.5, y: 0, z: -6 },
        patrol: [{ x: 5.5, z: -6 }, { x: 7.6, z: -9 }, { x: 3.6, z: -4 }],
        flankSign: -1,
      },
      {
        id: 'nanda-guard-5',
        spawn: { x: -3, y: 0, z: -10 },
        patrol: [{ x: -3, z: -10 }, { x: -6, z: -12 }, { x: -1.6, z: -8 }],
        flankSign: 1,
      },
      {
        id: 'nanda-guard-6',
        spawn: { x: 2.8, y: 0, z: -12 },
        patrol: [{ x: 2.8, z: -12 }, { x: 5, z: -13.4 }, { x: 0.6, z: -10 }],
        flankSign: -1,
      },
    ],
    boss: {
      id: 'nanda-captain',
      displayName: 'Nanda Captain',
      spawn: { x: 0, y: 0, z: -9 },
      driverId: 'nanda-captain-v1',
      config: BOSS_CONFIG,
      maxHealth: BOSS_MAX_HEALTH,
    },
  },

  objectives: {
    items: [
      { id: 'objective-1', position: { x: -7.5, y: 2.65, z: 3.4 } },
      { id: 'objective-2', position: { x: 6.4, y: 0.25, z: -5.1 } },
    ],
    baseRequiredCount: 2,
    collection: {
      kind: 'proximity-or-axis-box-v1',
      radius: 1.35,
      axisTolerance: { x: 1.2, y: 1.8, z: 1.2 },
    },
    completion: {
      kind: 'interact-at-exit-v1',
      exitAnchorId: 'northern-gate',
      requireBossDefeated: true,
    },
  },

  presentation: {
    assets: {
      heroModel: './models/cc0/quaternius-characters/BaseCharacter.gltf',
      guardModel: './models/cc0/quaternius-characters/Ninja_Sand.gltf',
      bossModel: './models/cc0/quaternius-characters/Ninja_Sand.gltf',
      props: {
        tree: './models/cc0/kenney-nature/tree_oak.glb',
        bush: './models/cc0/kenney-nature/plant_bushLarge.glb',
        jar: './models/nanda/mauryan-storage-jar.glb',
      },
    },
    assetFailurePolicy: 'reduced-mode',
    characterPalette: {
      hero: {
        cloth: '#8f1d33',
        clothDark: '#5d1322',
        metal: '#c9a24b',
        leather: '#5a3b24',
      },
      guard: {
        cloth: '#7a6038',
        clothDark: '#463722',
        metal: '#8a7444',
        leather: '#463020',
      },
      captain: {
        cloth: '#611427',
        clothDark: '#360c17',
        metal: '#d8b45c',
        leather: '#3d281a',
      },
    },
    copy: {
      defaultRouteLabel: 'Supplied courtyard route',
      initialPrompt: 'Reach the marked dispatches, then the northern gate',
      prompts: {
        spotted: 'Spotted — break line of sight or fight through',
        heard: 'A guard heard something — stay out of sight',
        atGateReady: 'Open the timber gate',
        atGateLocked: 'Secure the dispatches before opening the gate',
        noHeals: 'No recovery charges remain',
        bossEngaged: 'Fell the Nanda captain to reach the gate',
        bossVulnerable: 'The captain is off balance — strike now!',
        bossGate: 'Face the Nanda captain guarding the gate',
        default: 'Reach the marked dispatches, then the northern gate',
      },
      objectiveLabel: 'Dispatches',
      bossLabel: 'Nanda Captain',
      exitActionLabel: 'Open',
    },
    audioThemeId: 'nanda-timber-gate',
    indicatorStyleId: 'alert-diamond-v1',
    lightingPresetId: 'timber-gate-night-v1',
  },

  historicalMetadata: {
    evidenceRefIds: ['nanda-transition'],
    claimBindings: [],
  },

  budgets: {
    dpr: [1, 1.5],
    maxTotalLights: 5,
    maxPointLights: 2,
    maxShadowCastingLights: 1,
    shadowMapSize: 1024,
    shadowCasterPolicy:
      'walls-and-characters-cast; props, ground/water planes, and torch poles do not',
  },
}
