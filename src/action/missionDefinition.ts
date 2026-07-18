/**
 * Generic action-mission definition schema (Sol-approved, schemaVersion 1).
 *
 * A chapter describes its mission as immutable data + a few pure driver
 * references, so new chapters can reuse the Timber Gate runtime without forking
 * NandaMission.tsx. This is intentionally NOT a fully data-driven engine: terrain
 * and collision stay as pure function references (see missionGeometry.ts), the
 * guard/boss AI stay as their existing state machines referenced by driverId,
 * and the useFrame loop is unchanged. Definitions are static and immutable — a
 * change requires a Canvas remount/reset.
 */

import type { GuardPerception } from '../nanda/guardAi'
import type { BossConfig } from '../nanda/bossAi'

export type Vec2 = { readonly x: number; readonly z: number }
export type Vec3 = { readonly x: number; readonly y: number; readonly z: number }

export type FloorHeightQuery = (x: number, z: number) => number
export type CollisionQuery = (
  x: number,
  z: number,
  playerY: number,
  sideGateOpen: boolean,
) => boolean

export type CharacterRole = 'hero' | 'guard' | 'captain'

export type CharacterPalette = {
  readonly cloth: string
  readonly clothDark: string
  readonly metal: string
  readonly leather: string
}

export type PromptState =
  | 'spotted'
  | 'heard'
  | 'atGateReady'
  | 'atGateLocked'
  | 'noHeals'
  | 'bossEngaged'
  | 'bossVulnerable'
  | 'bossGate'
  | 'default'

export type WorldBounds = {
  readonly minX: number
  readonly maxX: number
  readonly minZ: number
  readonly maxZ: number
}

export type ExitAnchor = {
  readonly id: string
  readonly position: Vec2
  readonly interactionRadius: number
}

export type GuardSpawn = {
  readonly id: string
  readonly spawn: Vec3
  readonly patrol: readonly Vec2[]
  readonly flankSign: 1 | -1
}

export type BossDefinition = {
  readonly id: string
  readonly displayName: string
  readonly spawn: Vec3
  readonly driverId: 'nanda-captain-v1'
  readonly config: Readonly<BossConfig>
  readonly maxHealth: number
}

export type ObjectiveItem = {
  readonly id: string
  readonly position: Vec3
}

export type ObjectiveCollection = {
  readonly kind: 'proximity-or-axis-box-v1'
  readonly radius: number
  readonly axisTolerance: Vec3
}

export type CompletionRule =
  | {
      readonly kind: 'interact-at-exit-v1'
      readonly exitAnchorId: string
      readonly requireBossDefeated: boolean
    }
  | {
      readonly kind: 'chapter-policy'
      readonly policyId: string
    }

export type ActionMissionDefinition = Readonly<{
  schemaVersion: 1

  identity: {
    readonly id: string
    readonly chapterId: string
    readonly title: string
  }

  topology: {
    readonly sceneId: string
    readonly worldBounds: WorldBounds
    readonly playerSpawn: Vec3
    readonly anchors: { readonly exit: ExitAnchor }
    readonly geometry: {
      readonly floorHeightAt: FloorHeightQuery
      readonly isBlocked: CollisionQuery
    }
  }

  encounters: {
    readonly guardAi: {
      readonly driverId: 'guard-ai-v1'
      readonly config: Readonly<GuardPerception>
    }
    readonly guards: readonly GuardSpawn[]
    readonly boss: null | BossDefinition
  }

  objectives: {
    readonly items: readonly ObjectiveItem[]
    readonly baseRequiredCount: number
    readonly collection: ObjectiveCollection
    readonly completion: CompletionRule
  }

  presentation: {
    readonly assets: {
      readonly heroModel: string
      readonly guardModel: string
      readonly bossModel: string
      readonly props: Readonly<Record<string, string>>
    }
    readonly assetFailurePolicy: 'reduced-mode'
    readonly characterPalette: Readonly<Record<CharacterRole, CharacterPalette>>
    readonly copy: {
      readonly defaultRouteLabel: string
      readonly initialPrompt: string
      readonly prompts: Readonly<Record<PromptState, string>>
      readonly objectiveLabel: string
      readonly bossLabel: string
      readonly exitActionLabel: string
    }
    readonly audioThemeId: string
    readonly indicatorStyleId: string
    readonly lightingPresetId: string
  }

  historicalMetadata: {
    readonly evidenceRefIds: readonly string[]
    readonly claimBindings: readonly {
      readonly subjectId: string
      readonly evidenceRefId: string
    }[]
  }

  budgets: {
    readonly dpr: readonly [number, number]
    readonly maxTotalLights: number
    readonly maxPointLights: number
    readonly maxShadowCastingLights: number
    readonly shadowMapSize: number
    readonly shadowCasterPolicy: string
  }
}>

/**
 * Validate a definition's internal consistency. Returns a list of human-readable
 * problems (empty when valid). Kept pure and dependency-free so it can gate
 * definitions in unit tests before any are wired into production.
 */
export const validateMissionDefinition = (
  def: ActionMissionDefinition,
): string[] => {
  const errors: string[] = []
  if (def.schemaVersion !== 1) {
    errors.push(`schemaVersion must be 1, got ${String(def.schemaVersion)}`)
  }
  if (!def.identity.id) {
    errors.push('identity.id is required')
  }
  const b = def.topology.worldBounds
  if (b.minX >= b.maxX || b.minZ >= b.maxZ) {
    errors.push('worldBounds min must be strictly less than max')
  }
  if (def.encounters.guards.length === 0) {
    errors.push('at least one guard is required')
  }
  const guardIds = new Set<string>()
  for (const guard of def.encounters.guards) {
    if (guardIds.has(guard.id)) {
      errors.push(`duplicate guard id: ${guard.id}`)
    }
    guardIds.add(guard.id)
    if (guard.patrol.length === 0) {
      errors.push(`guard ${guard.id} needs at least one patrol point`)
    }
  }
  const objectiveIds = new Set<string>()
  for (const item of def.objectives.items) {
    if (objectiveIds.has(item.id)) {
      errors.push(`duplicate objective id: ${item.id}`)
    }
    objectiveIds.add(item.id)
  }
  if (
    def.objectives.baseRequiredCount < 0 ||
    def.objectives.baseRequiredCount > def.objectives.items.length
  ) {
    errors.push(
      'baseRequiredCount must be between 0 and the number of objective items',
    )
  }
  if (def.objectives.completion.kind === 'interact-at-exit-v1') {
    if (
      def.objectives.completion.exitAnchorId !== def.topology.anchors.exit.id
    ) {
      errors.push('completion.exitAnchorId must match the topology exit anchor')
    }
    if (def.objectives.completion.requireBossDefeated && !def.encounters.boss) {
      errors.push('completion requires a boss but no boss is defined')
    }
  }
  if (def.budgets.dpr[0] > def.budgets.dpr[1]) {
    errors.push('budgets.dpr must be [min, max] with min <= max')
  }
  if (def.budgets.maxPointLights > def.budgets.maxTotalLights) {
    errors.push('maxPointLights cannot exceed maxTotalLights')
  }
  return errors
}
