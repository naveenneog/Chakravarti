import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import {
  type NandaMissionControls,
  type NandaMissionHud,
} from './missionTypes'
import type { NandaSoundEffect } from './audio'
import {
  createGuardBrain,
  playerNoiseLevel,
  updateGuardBrain,
  type GuardAlert,
  type GuardBrain,
  type GuardIntent,
} from './guardAi'
import {
  createBossBrain,
  updateBossBrain,
  type BossBrain,
  type BossPhase,
} from './bossAi'
import {
  COMBAT_CONFIG,
  HITSTOP,
  HITSTOP_TIME_SCALE,
  createGuardStance,
  isWithinArc,
  resolveIncomingAttack,
  resolveOutgoingStrike,
  selectMeleeTarget,
  updateGuardStance,
  type GuardOutcome,
  type GuardResolution,
  type GuardStance,
  type MeleeTarget,
  type StrikeKind,
} from './combat'
import type { Vec2 } from './guardAi'
import {
  GUARD_ARCHETYPES,
  resolveArchetype,
  type GuardArchetype,
  type GuardArchetypeId,
} from './archetypes'
import {
  ARROW_POOL,
  advanceArrow,
  arrowHits,
  createArrowPool,
  fireArrow,
  retireArrow,
  type ArrowPool,
} from './arrows'
import type { MissionModifiers, MissionResult } from './types'
import { timberGateDefinition } from './timberGateDefinition'
import { projectGuards, isObjectiveInRange, evaluateExitCompletion } from '../action/missionRuntime'

// Gate 5 of the mission-definition migration: model/prop asset paths come from
// the definition (single source of truth) rather than hardcoded strings.
const MISSION_ASSETS = timberGateDefinition.presentation.assets
// Gate 11: terrain/collision queries route through the definition's geometry
// (the same pure functions from missionGeometry), closing the direct-import
// bypass so a future mission definition can substitute its own geometry.
const { floorHeightAt, isBlocked } = timberGateDefinition.topology.geometry
// Gate 6: HUD prompt strings come from the definition's presentation copy.
const MISSION_PROMPTS = timberGateDefinition.presentation.copy.prompts
// Gate 8: mobile performance budgets (DPR, shadow-map size) from the definition.
const MISSION_BUDGETS = timberGateDefinition.budgets
// Gate 10: objective items + collection policy from the definition.
const MISSION_OBJECTIVES = timberGateDefinition.objectives
// Gate 12: guard/boss AI configs come from the definition (single source of
// truth). GUARD_PERCEPTION/BOSS_CONFIG/BOSS_MAX_HEALTH stay as AI-module
// defaults; the runtime reads the mission's chosen values instead. The Timber
// Gate is a boss encounter, so fail fast if the data ever omits it rather than
// silently degrading to a bossless mission.
const MISSION_GUARD_CONFIG = timberGateDefinition.encounters.guardAi.config
// Each guard now runs its archetype's own perception, but the sentry remains the
// chapter's baseline. Fail fast if the definition's guard config and the sentry
// archetype ever drift apart, so "single source of truth" stays true rather than
// quietly becoming two sources.
if (MISSION_GUARD_CONFIG !== GUARD_ARCHETYPES.sentry.perception) {
  throw new Error(
    'The Timber Gate guard config must match the sentry archetype perception',
  )
}
const missionBossDef = timberGateDefinition.encounters.boss
if (!missionBossDef) {
  throw new Error('The Timber Gate mission requires a boss encounter definition')
}
const MISSION_BOSS = missionBossDef
// Gate 13: the completion policy and its exit anchor come from the definition.
// The rule references the exit by id, so fail fast if that ever dangles.
const MISSION_COMPLETION = MISSION_OBJECTIVES.completion
const MISSION_EXIT = timberGateDefinition.topology.anchors.exit
// The player's close-combat tuning is chapter data with a module-level default,
// matching how the guard and boss AI configs are sourced.
const MISSION_COMBAT =
  timberGateDefinition.encounters.playerCombat ?? COMBAT_CONFIG
/** The captain's longer silhouette is reachable slightly further out. */
const BOSS_STRIKE_REACH = 2.6

/**
 * What a parried guard "wants" while it is reeling: nothing. Frozen in place,
 * no facing change, no strike. Shared and immutable — the loop never writes to it.
 */
const STAGGERED_GUARD_INTENT: GuardIntent = {
  state: 'attack',
  alert: 'alerted',
  awareness: 1,
  moveTarget: null,
  faceTarget: null,
  speed: 0,
  strike: false,
  windup: false,
  senses: true,
  guarding: false,
}
if (MISSION_COMPLETION.kind !== 'interact-at-exit-v1') {
  throw new Error(
    `Timber Gate mission does not support completion kind "${MISSION_COMPLETION.kind}"`,
  )
}
if (MISSION_COMPLETION.exitAnchorId !== MISSION_EXIT.id) {
  throw new Error(
    `Timber Gate completion references unknown exit anchor "${MISSION_COMPLETION.exitAnchorId}"`,
  )
}

type NandaMissionProps = {
  controlsRef: RefObject<NandaMissionControls>
  modifiers: MissionModifiers
  paused: boolean
  resetToken: number
  onHudChange: (hud: NandaMissionHud) => void
  onComplete: (result: MissionResult) => void
  onAudioStart: () => void
  onSound: (effect: NandaSoundEffect) => void
}

type WorldColors = {
  background: string
  ground: string
  groundSoft: string
  wall: string
  wallDark: string
  text: string
  muted: string
  accent: string
  accentHover: string
  success: string
  danger: string
  warning: string
  water: string
}

type EnemyRuntime = {
  id: string
  position: THREE.Vector3
  hp: number
  maxHp: number
  alive: boolean
  defeatTimer: number
  /** Seconds of parry-induced stagger left; the brain is frozen while it runs. */
  stagger: number
  /** True while this archetype's own shield is up (shieldbearer only). */
  guarding: boolean
  archetype: GuardArchetype
  brain: GuardBrain
}

type HeroMotion = {
  moving: boolean
  attacking: boolean
  airborne: boolean
  hurt: boolean
  guarding: boolean
}

type GuardMotion = {
  moving: boolean
  attacking: boolean
  defeated: boolean
  alert: GuardAlert
  windup: boolean
  staggered: boolean
  /** Shield raised, for the buckler pose and the deflection tell. */
  guarding: boolean
  archetype: GuardArchetypeId
}

type BossMotion = {
  moving: boolean
  windup: boolean
  lunging: boolean
  vulnerable: boolean
  defeated: boolean
  staggered: boolean
  phase: BossPhase
}

const readWorldColors = (): WorldColors => {
  const styles = getComputedStyle(document.documentElement)
  const read = (name: string) => styles.getPropertyValue(name).trim()
  // Gate 7: the world colour-role -> CSS-variable mapping comes from the mission
  // definition (single source of truth); identical variables as before.
  const wp = timberGateDefinition.presentation.worldPalette
  return {
    background: read(wp.background),
    ground: read(wp.ground),
    groundSoft: read(wp.groundSoft),
    wall: read(wp.wall),
    wallDark: read(wp.wallDark),
    text: read(wp.text),
    muted: read(wp.muted),
    accent: read(wp.accent),
    accentHover: read(wp.accentHover),
    success: read(wp.success),
    danger: read(wp.danger),
    warning: read(wp.warning),
    water: read(wp.water),
  }
}

const objectivePositions = timberGateDefinition.objectives.items.map(
  (item) => new THREE.Vector3(item.position.x, item.position.y, item.position.z),
)

// The Nanda captain holds the ground between the wall and the northern gate.
const bossStart = new THREE.Vector3(
  MISSION_BOSS.spawn.x,
  MISSION_BOSS.spawn.y,
  MISSION_BOSS.spawn.z,
)

function useKeyboardControls(
  controlsRef: RefObject<NandaMissionControls>,
  onAudioStart: () => void,
) {
  useEffect(() => {
    const keyMap: Record<string, keyof NandaMissionControls | undefined> = {
      KeyW: 'forward',
      ArrowUp: 'forward',
      KeyS: 'backward',
      ArrowDown: 'backward',
      KeyA: 'left',
      ArrowLeft: 'left',
      KeyD: 'right',
      ArrowRight: 'right',
      Space: 'jump',
      KeyF: 'attack',
      KeyE: 'interact',
      KeyH: 'heal',
      KeyQ: 'guard',
      ShiftLeft: 'guard',
      ShiftRight: 'guard',
    }
    const update = (event: KeyboardEvent, pressed: boolean) => {
      const control = keyMap[event.code]
      if (!control || !controlsRef.current) {
        return
      }
      event.preventDefault()
      if (pressed) {
        onAudioStart()
      }
      controlsRef.current[control] = pressed
    }
    const onDown = (event: KeyboardEvent) => update(event, true)
    const onUp = (event: KeyboardEvent) => update(event, false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [controlsRef, onAudioStart])
}

function CameraRig({
  target,
  shakeRef,
  punchRef,
}: {
  target: RefObject<THREE.Group | null>
  shakeRef: RefObject<number>
  punchRef: RefObject<number>
}) {
  const { camera } = useThree()
  const desired = useMemo(() => new THREE.Vector3(), [])
  const lookAt = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const player = target.current
    if (!player) {
      return
    }
    // A punch dollies the rig in toward the hero for a beat. Combined with the
    // shake it reads as recoil rather than as a wobble.
    const punch = punchRef.current ?? 0
    desired.set(
      player.position.x +
        Math.sin(performance.now() * 0.055) * (shakeRef.current ?? 0),
      player.position.y +
        4.15 -
        punch * 0.75 +
        Math.cos(performance.now() * 0.07) * (shakeRef.current ?? 0) * 0.45,
      player.position.z +
        6.25 -
        punch * 1.15 +
        Math.sin(performance.now() * 0.045) * (shakeRef.current ?? 0) * 0.65,
    )
    // Snap in fast on a punch, ease out slowly, so the recoil has attack.
    camera.position.lerp(desired, 1 - Math.exp(-(6 + punch * 22) * delta))
    lookAt.set(
      player.position.x,
      player.position.y + 1.05,
      player.position.z - 2.8,
    )
    camera.lookAt(lookAt)
  })

  return null
}

const SPARK_POOL = 128

/** Renders the live arrows as one instanced mesh; dead slots scale to zero. */
function ArrowVolley({
  arrowsRef,
  colors,
}: {
  arrowsRef: RefObject<ArrowPool>
  colors: WorldColors
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const scratch = useMemo(() => new THREE.Object3D(), [])
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const dir = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const mesh = meshRef.current
    const pool = arrowsRef.current
    if (!mesh || !pool) {
      return
    }
    let visible = false
    for (let i = 0; i < ARROW_POOL; i += 1) {
      if (pool.life[i] <= 0) {
        scratch.position.set(0, -500, 0)
        scratch.scale.setScalar(0)
        scratch.rotation.set(0, 0, 0)
      } else {
        visible = true
        scratch.position.set(pool.x[i], pool.y[i], pool.z[i])
        scratch.scale.setScalar(1)
        // Point the shaft along its own velocity.
        dir.set(pool.vx[i], pool.vy[i], pool.vz[i])
        if (dir.lengthSq() > 1e-6) {
          dir.normalize()
          scratch.quaternion.setFromUnitVectors(up, dir)
        }
      }
      scratch.updateMatrix()
      mesh.setMatrixAt(i, scratch.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.visible = visible
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, ARROW_POOL]}
      frustumCulled={false}
      visible={false}
    >
      <cylinderGeometry args={[0.022, 0.022, 0.78, 5]} />
      <meshStandardMaterial
        color={colors.wallDark}
        emissive={colors.warning}
        emissiveIntensity={0.35}
        roughness={0.7}
      />
    </instancedMesh>
  )
}

export type SparkApi = {
  burst: (
    x: number,
    y: number,
    z: number,
    color: THREE.Color,
    count: number,
    power: number,
  ) => void
}

/**
 * Pooled impact sparks. Every buffer is preallocated and dead particles are
 * simply faded to black under additive blending, so a burst costs no allocation
 * and no draw-call churn on a phone.
 */
function ImpactSparks({ apiRef }: { apiRef: RefObject<SparkApi | null> }) {
  const pointsRef = useRef<THREE.Points>(null)
  const state = useMemo(() => {
    const positions = new Float32Array(SPARK_POOL * 3)
    // `colors` is the render buffer; `tint` keeps each particle's seed colour so
    // fading never compounds on itself.
    const colors = new Float32Array(SPARK_POOL * 3)
    const tint = new Float32Array(SPARK_POOL * 3)
    const velocities = new Float32Array(SPARK_POOL * 3)
    const life = new Float32Array(SPARK_POOL)
    const maxLife = new Float32Array(SPARK_POOL)
    const geometry = new THREE.BufferGeometry()
    const positionAttr = new THREE.BufferAttribute(positions, 3)
    const colorAttr = new THREE.BufferAttribute(colors, 3)
    geometry.setAttribute('position', positionAttr)
    geometry.setAttribute('color', colorAttr)
    return {
      positions,
      colors,
      tint,
      velocities,
      life,
      maxLife,
      geometry,
      positionAttr,
      colorAttr,
      cursor: 0,
    }
  }, [])

  useEffect(() => {
    const geometry = state.geometry
    return () => {
      geometry.dispose()
    }
  }, [state])

  useEffect(() => {
    apiRef.current = {
      burst: (x, y, z, color, count, power) => {
        for (let i = 0; i < count; i += 1) {
          const index = state.cursor
          state.cursor = (state.cursor + 1) % SPARK_POOL
          const p = index * 3
          state.positions[p] = x
          state.positions[p + 1] = y
          state.positions[p + 2] = z
          // Cone of debris biased upward, so sparks arc instead of spraying flat.
          const theta = Math.random() * Math.PI * 2
          const lift = 0.35 + Math.random() * 0.9
          const speed = power * (0.55 + Math.random() * 0.85)
          state.velocities[p] = Math.cos(theta) * speed
          state.velocities[p + 1] = lift * power
          state.velocities[p + 2] = Math.sin(theta) * speed
          state.tint[p] = color.r
          state.tint[p + 1] = color.g
          state.tint[p + 2] = color.b
          state.colors[p] = color.r
          state.colors[p + 1] = color.g
          state.colors[p + 2] = color.b
          const span = 0.24 + Math.random() * 0.34
          state.life[index] = span
          state.maxLife[index] = span
        }
        state.positionAttr.needsUpdate = true
        state.colorAttr.needsUpdate = true
      },
    }
    return () => {
      apiRef.current = null
    }
  }, [apiRef, state])

  useFrame((_, delta) => {
    const points = pointsRef.current
    if (!points) {
      return
    }
    const step = Math.min(delta, 0.05)
    let anyAlive = false
    for (let index = 0; index < SPARK_POOL; index += 1) {
      if (state.life[index] <= 0) {
        continue
      }
      state.life[index] -= step
      const p = index * 3
      if (state.life[index] <= 0) {
        // Additive blending: black is invisible, so a dead particle just goes dark.
        state.colors[p] = 0
        state.colors[p + 1] = 0
        state.colors[p + 2] = 0
        anyAlive = true
        continue
      }
      anyAlive = true
      state.velocities[p + 1] -= 14 * step
      const drag = Math.exp(-3.4 * step)
      state.velocities[p] *= drag
      state.velocities[p + 2] *= drag
      state.positions[p] += state.velocities[p] * step
      state.positions[p + 1] += state.velocities[p + 1] * step
      state.positions[p + 2] += state.velocities[p + 2] * step
      const fade = state.life[index] / state.maxLife[index]
      const eased = fade * fade
      state.colors[p] = state.tint[p] * eased
      state.colors[p + 1] = state.tint[p + 1] * eased
      state.colors[p + 2] = state.tint[p + 2] * eased
    }
    if (anyAlive) {
      state.positionAttr.needsUpdate = true
      state.colorAttr.needsUpdate = true
      points.visible = true
    } else {
      points.visible = false
    }
  })

  return (
    <points ref={pointsRef} frustumCulled={false} visible={false}>
      <primitive object={state.geometry} attach="geometry" />
      <pointsMaterial
        size={0.11}
        sizeAttenuation
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function TimberWall({
  colors,
  sideGateOpen,
}: {
  colors: WorldColors
  sideGateOpen: boolean
}) {
  const posts = Array.from({ length: 19 }, (_, index) => -9 + index)
  return (
    <group>
      {posts.map((x) => {
        const sideOpening = sideGateOpen && x >= 6 && x <= 8
        const roofOpening = x >= -9 && x <= -6
        if (sideOpening || roofOpening) {
          return null
        }
        return (
          <mesh key={x} position={[x, 1.45, 0]}>
            <boxGeometry args={[0.78, 2.9, 0.72]} />
            <meshStandardMaterial color={colors.wallDark} roughness={0.95} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[19.2, 0.35, 1.2]} />
        <meshStandardMaterial color={colors.wall} roughness={0.95} />
      </mesh>
      {sideGateOpen ? (
        <group position={[7, 1.45, 0]}>
          <mesh position={[-1.15, 0.3, 0]}>
            <boxGeometry args={[0.25, 3.5, 0.9]} />
            <meshStandardMaterial color={colors.accent} />
          </mesh>
          <mesh position={[1.15, 0.3, 0]}>
            <boxGeometry args={[0.25, 3.5, 0.9]} />
            <meshStandardMaterial color={colors.accent} />
          </mesh>
        </group>
      ) : null}
    </group>
  )
}

function PataliputraDistrict({
  colors,
  sideGateOpen,
}: {
  colors: WorldColors
  sideGateOpen: boolean
}) {
  const districtRef = useRef<THREE.Group>(null)
  const cityPosts = Array.from({ length: 11 }, (_, index) => -10 + index * 2)
  useEffect(() => {
    districtRef.current?.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Flat ground/water planes only receive shadows; solid structures cast.
        const isPlane = child.geometry instanceof THREE.PlaneGeometry
        child.castShadow = !isPlane
        child.receiveShadow = true
      }
    })
  }, [])
  return (
    <group ref={districtRef}>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.04, 0]}
      >
        <planeGeometry args={[22, 34]} />
        <meshStandardMaterial color={colors.ground} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 15.8]}>
        <planeGeometry args={[22, 2.2]} />
        <meshStandardMaterial color={colors.water} roughness={0.4} />
      </mesh>

      <TimberWall colors={colors} sideGateOpen={sideGateOpen} />

      <mesh position={[-7.5, 2.15, 4.45]}>
        <boxGeometry args={[3, 0.35, 6.9]} />
        <meshStandardMaterial color={colors.wall} roughness={0.9} />
      </mesh>
      <mesh position={[-7.5, 2.15, -4.45]}>
        <boxGeometry args={[3, 0.35, 6.9]} />
        <meshStandardMaterial color={colors.wall} roughness={0.9} />
      </mesh>
      <mesh position={[-4.8, 1.1, 6]} rotation={[0, 0, -0.72]}>
        <boxGeometry args={[3.55, 0.35, 3.5]} />
        <meshStandardMaterial color={colors.wall} roughness={0.9} />
      </mesh>

      {[
        [-4.2, 0.8, 8.5],
        [4.3, 0.8, 8.7],
        [5.2, 0.8, -2.8],
        [-2.8, 0.8, -7.5],
      ].map(([x, y, z], index) => (
        <group key={`${x}-${z}`} position={[x, y, z]}>
          <mesh>
            <boxGeometry args={[3.3, 1.6, 2.6]} />
            <meshStandardMaterial color={colors.groundSoft} roughness={0.95} />
          </mesh>
          <mesh position={[0, 1.05, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[2.25, 1.1, 4]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? colors.accent : colors.wallDark}
              roughness={0.95}
            />
          </mesh>
        </group>
      ))}

      {cityPosts.map((x) => (
        <mesh key={`north-${x}`} position={[x, 1.8, -15.5]}>
          <boxGeometry args={[1.3, 3.6, 0.85]} />
          <meshStandardMaterial color={colors.wallDark} roughness={1} />
        </mesh>
      ))}
      <mesh position={[-3.6, 1.9, -13.4]}>
        <boxGeometry args={[5.5, 3.8, 1]} />
        <meshStandardMaterial color={colors.wallDark} roughness={1} />
      </mesh>
      <mesh position={[3.6, 1.9, -13.4]}>
        <boxGeometry args={[5.5, 3.8, 1]} />
        <meshStandardMaterial color={colors.wallDark} roughness={1} />
      </mesh>
      <mesh position={[0, 3.25, -13.4]}>
        <boxGeometry args={[2.2, 0.35, 1.2]} />
        <meshStandardMaterial color={colors.accent} />
      </mesh>
    </group>
  )
}

const themedClone = (source: THREE.Object3D, color: string) => {
  const clone = source.clone(true)
  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return
    }
    // Decorative props receive shadows but do not cast them, to keep the
    // shadow pass cheap on mobile.
    child.castShadow = false
    child.receiveShadow = true
    const recolor = (material: THREE.Material) => {
      const themed = material.clone()
      if ('color' in themed && themed.color instanceof THREE.Color) {
        themed.color.set(color)
      }
      if ('vertexColors' in themed) {
        themed.vertexColors = false
      }
      return themed
    }
    child.material = Array.isArray(child.material)
      ? child.material.map(recolor)
      : recolor(child.material)
  })
  return clone
}

function OpenAssetProps({ colors }: { colors: WorldColors }) {
  const treeSource = useLoader(
    GLTFLoader,
    MISSION_ASSETS.props.tree,
  ).scene
  const bushSource = useLoader(
    GLTFLoader,
    MISSION_ASSETS.props.bush,
  ).scene
  const jarSource = useLoader(
    GLTFLoader,
    MISSION_ASSETS.props.jar,
  ).scene
  const trees = useMemo(
    () =>
      [
        [-8.7, 0, 12.2, 3.2],
        [8.5, 0, 11.2, 3.6],
        [8.4, 0, -9.8, 3.1],
      ].map(([x, y, z, scale]) => ({
        object: themedClone(treeSource, colors.success),
        position: [x, y, z] as [number, number, number],
        scale,
      })),
    [colors.success, treeSource],
  )
  const bushes = useMemo(
    () =>
      [
        [-7.2, 0, 10.5],
        [7.3, 0, 8.7],
        [8.3, 0, 1.5],
        [-8, 0, -10.4],
      ].map(([x, y, z]) => ({
        object: themedClone(bushSource, colors.success),
        position: [x, y, z] as [number, number, number],
      })),
    [bushSource, colors.success],
  )
  const jars = useMemo(
    () =>
      [
        [4.1, 0, 7.2, 0.56],
        [4.9, 0, 7.4, 0.44],
        [6.7, 0, -3.1, 0.5],
        [-2.4, 0, -6.1, 0.46],
      ].map(([x, y, z, scale]) => ({
        object: themedClone(jarSource, colors.warning),
        position: [x, y, z] as [number, number, number],
        scale,
      })),
    [colors.warning, jarSource],
  )

  return (
    <group>
      {trees.map((tree, index) => (
        <primitive
          key={`tree-${index}`}
          object={tree.object}
          position={tree.position}
          scale={tree.scale}
        />
      ))}
      {bushes.map((bush, index) => (
        <primitive
          key={`bush-${index}`}
          object={bush.object}
          position={bush.position}
          scale={2.2}
        />
      ))}
      {jars.map((jar, index) => (
        <primitive
          key={`jar-${index}`}
          object={jar.object}
          position={jar.position}
          scale={jar.scale}
        />
      ))}
    </group>
  )
}

function TorchLights({ colors }: { colors: WorldColors }) {
  // Only the two torches flanking the play area cast real (expensive) point
  // lights; the rear pair keep a brighter emissive glow so they still read as
  // lit without adding per-fragment lighting cost on mobile.
  const torches: readonly { position: [number, number, number]; light: boolean }[] = [
    { position: [-8.6, 1.6, 1.2], light: true },
    { position: [8.6, 1.6, 1.2], light: true },
    { position: [-4.8, 1.5, -10.4], light: false },
    { position: [4.8, 1.5, -10.4], light: false },
  ]
  return (
    <group>
      {torches.map((torch, index) => (
        <group key={index} position={torch.position}>
          <mesh>
            <cylinderGeometry args={[0.07, 0.1, 1.2, 8]} />
            <meshStandardMaterial color={colors.wallDark} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <sphereGeometry args={[0.16, 10, 8]} />
            <meshStandardMaterial
              color={colors.warning}
              emissive={colors.warning}
              emissiveIntensity={torch.light ? 1.8 : 2.6}
            />
          </mesh>
          {torch.light ? (
            <pointLight
              color={colors.warning}
              intensity={8}
              distance={8}
              decay={2}
              position={[0, 0.85, 0]}
            />
          ) : null}
        </group>
      ))}
    </group>
  )
}

type CharacterRole = 'hero' | 'guard' | 'captain'

// Gate 7 of the migration: the reviewed character palette is sourced from the
// mission definition (single source of truth). Aliased into the flat shape the
// theming code already uses; values are identical (pinned by golden tests).
const CHARACTER_PALETTE = {
  skin: timberGateDefinition.presentation.characterPalette.skin,
  hair: timberGateDefinition.presentation.characterPalette.hair,
  hero: timberGateDefinition.presentation.characterPalette.roles.hero,
  guard: timberGateDefinition.presentation.characterPalette.roles.guard,
  captain: timberGateDefinition.presentation.characterPalette.roles.captain,
} as const

type MaterialCategory = 'skin' | 'hair' | 'metal' | 'leather' | 'cloth'

const categorize = (name: string): MaterialCategory => {
  if (name.includes('skin') || name.includes('face') || name.includes('body')) {
    return 'skin'
  }
  if (name.includes('hair')) {
    return 'hair'
  }
  if (
    name.includes('band') ||
    name.includes('detail') ||
    name.includes('trim') ||
    name.includes('gold') ||
    name.includes('metal') ||
    name.includes('belt') ||
    name.includes('buckle')
  ) {
    return 'metal'
  }
  if (
    name.includes('grey') ||
    name.includes('gray') ||
    name.includes('leather') ||
    name.includes('strap') ||
    name.includes('boot') ||
    name.includes('glove')
  ) {
    return 'leather'
  }
  return 'cloth'
}

const themedCharacterClone = (
  source: THREE.Object3D,
  _colors: WorldColors,
  role: CharacterRole,
  clothOverride?: string,
) => {
  const actor = cloneSkeleton(source)
  const baseColors =
    role === 'hero'
      ? CHARACTER_PALETTE.hero
      : role === 'captain'
        ? CHARACTER_PALETTE.captain
        : CHARACTER_PALETTE.guard
  // An archetype may recolour only its cloth, so the roster reads apart at a
  // glance while every guard still shares one coherent palette family.
  const roleColors = clothOverride
    ? { ...baseColors, cloth: clothOverride }
    : baseColors
  actor.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return
    }
    child.castShadow = true
    child.receiveShadow = true
    const restyle = (material: THREE.Material) => {
      if (
        !(material instanceof THREE.MeshStandardMaterial) ||
        !(material.color instanceof THREE.Color)
      ) {
        return material
      }
      const themed = material.clone()
      const category = categorize(material.name.toLowerCase())
      switch (category) {
        case 'skin':
          themed.color.set(CHARACTER_PALETTE.skin)
          themed.roughness = 0.7
          themed.metalness = 0
          break
        case 'hair':
          themed.color.set(CHARACTER_PALETTE.hair)
          themed.roughness = 0.95
          themed.metalness = 0
          break
        case 'metal':
          themed.color.set(roleColors.metal)
          themed.roughness = 0.32
          themed.metalness = 0.62
          break
        case 'leather':
          themed.color.set(roleColors.leather)
          themed.roughness = 0.82
          themed.metalness = 0.04
          break
        default:
          themed.color.set(roleColors.cloth)
          themed.roughness = 0.9
          themed.metalness = 0
      }
      themed.map = null
      return themed
    }
    child.material = Array.isArray(child.material)
      ? child.material.map(restyle)
      : restyle(child.material)
  })
  return actor
}

const animationActions = (
  mixer: THREE.AnimationMixer,
  clips: readonly THREE.AnimationClip[],
) =>
  Object.fromEntries(
    clips.map((clip) => [clip.name, mixer.clipAction(clip)]),
  ) as Record<string, THREE.AnimationAction>

function HeroFigure({
  colors,
  heroRef,
  motionRef,
  timeScaleRef,
}: {
  colors: WorldColors
  heroRef: RefObject<THREE.Group | null>
  motionRef: RefObject<HeroMotion>
  timeScaleRef: RefObject<number>
}) {
  const gltf = useLoader(
    GLTFLoader,
    MISSION_ASSETS.heroModel,
  )
  const actor = useMemo(
    () => themedCharacterClone(gltf.scene, colors, 'hero'),
    [colors, gltf.scene],
  )
  const mixer = useMemo(() => new THREE.AnimationMixer(actor), [actor])
  const actions = useMemo(
    () => animationActions(mixer, gltf.animations),
    [gltf.animations, mixer],
  )
  const activeAction = useRef<THREE.AnimationAction | null>(null)

  useEffect(() => {
    const hips = actor.getObjectByName('Hips')
    const torso = actor.getObjectByName('Torso')
    const head = actor.getObjectByName('Head')
    const hand = actor.getObjectByName('Fist.R')
    const clothMaterial = new THREE.MeshStandardMaterial({
      color: colors.accent,
      roughness: 0.86,
    })
    const sashMaterial = new THREE.MeshStandardMaterial({
      color: colors.groundSoft,
      roughness: 0.9,
    })
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: colors.warning,
      metalness: 0.42,
      roughness: 0.35,
    })
    const hairMaterial = new THREE.MeshStandardMaterial({
      color: colors.text,
      roughness: 0.96,
    })
    const swordMaterial = new THREE.MeshStandardMaterial({
      color: colors.text,
      metalness: 0.72,
      roughness: 0.24,
    })
    const sword = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.15, 0.11),
      swordMaterial,
    )
    sword.position.set(0, -0.65, 0)
    sword.rotation.z = 0.08
    const torsoWrap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.42, 0.7, 8),
      clothMaterial,
    )
    torsoWrap.position.set(0, 0.02, 0)
    const shoulderCloth = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, 0.92, 0.08),
      sashMaterial,
    )
    shoulderCloth.position.set(-0.2, 0.02, 0.28)
    shoulderCloth.rotation.z = 0.32
    const dhoti = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.0, 8),
      clothMaterial,
    )
    dhoti.position.set(0, -0.34, 0)
    const belt = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.055, 6, 16),
      goldMaterial,
    )
    belt.rotation.x = Math.PI / 2
    belt.position.set(0, 0.08, 0)
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 12, 8),
      hairMaterial,
    )
    hair.scale.set(1, 0.58, 1)
    hair.position.set(0, 0.18, -0.02)
    const topKnot = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 10, 8),
      hairMaterial,
    )
    topKnot.position.set(0, 0.36, -0.03)
    const diadem = new THREE.Mesh(
      new THREE.TorusGeometry(0.235, 0.034, 6, 16),
      goldMaterial,
    )
    diadem.rotation.x = Math.PI / 2
    diadem.position.set(0, 0.11, 0)
    ;[
      torsoWrap,
      shoulderCloth,
      dhoti,
      belt,
      hair,
      topKnot,
      diadem,
      sword,
    ].forEach((mesh) => {
      mesh.castShadow = true
      mesh.receiveShadow = true
    })
    torso?.add(torsoWrap, shoulderCloth)
    hips?.add(dhoti, belt)
    head?.add(hair, topKnot, diadem)
    hand?.add(sword)
    return () => {
      torso?.remove(torsoWrap, shoulderCloth)
      hips?.remove(dhoti, belt)
      head?.remove(hair, topKnot, diadem)
      hand?.remove(sword)
      ;[
        torsoWrap,
        shoulderCloth,
        dhoti,
        belt,
        hair,
        topKnot,
        diadem,
        sword,
      ].forEach((mesh) => mesh.geometry.dispose())
      clothMaterial.dispose()
      sashMaterial.dispose()
      goldMaterial.dispose()
      hairMaterial.dispose()
      swordMaterial.dispose()
      mixer.stopAllAction()
    }
  }, [
    actions,
    actor,
    colors.accent,
    colors.groundSoft,
    colors.text,
    colors.warning,
    mixer,
  ])

  useFrame((_, delta) => {
    const motion = motionRef.current
    if (!motion) {
      return
    }
    const clipName = motion.hurt
      ? 'RecieveHit'
      : motion.attacking
        ? 'SwordSlash'
        : motion.airborne
          ? 'Jump'
          : motion.moving
            ? 'Run'
            : 'Idle'
    const next = actions[clipName] ?? actions.Idle
    if (next && activeAction.current !== next) {
      activeAction.current?.fadeOut(0.12)
      next.reset().fadeIn(0.12).play()
      activeAction.current = next
    }
    // Hit-stop dilates the mission clock; the skeleton has to freeze with it or
    // the frozen impact reads as a stutter instead of a punch.
    mixer.update(delta * (timeScaleRef.current ?? 1))
  })

  return (
    <group ref={heroRef} rotation={[0, Math.PI, 0]}>
      <primitive
        object={actor}
        position={[0, -0.92, 0]}
        scale={0.72}
      />
    </group>
  )
}

function GuardFigure({
  colors,
  groupRef,
  healthRef,
  motion,
  timeScaleRef,
  archetype,
}: {
  colors: WorldColors
  groupRef: (group: THREE.Group | null) => void
  healthRef: (mesh: THREE.Mesh | null) => void
  motion: GuardMotion
  timeScaleRef: RefObject<number>
  archetype: GuardArchetype
}) {
  const localRef = useRef<THREE.Group>(null)
  const lastPosition = useRef(new THREE.Vector3())
  const gltf = useLoader(
    GLTFLoader,
    MISSION_ASSETS.guardModel,
  )
  const actor = useMemo(
    () => themedCharacterClone(gltf.scene, colors, 'guard', archetype.presentation.accent),
    [colors, gltf.scene, archetype],
  )
  const mixer = useMemo(() => new THREE.AnimationMixer(actor), [actor])
  const actions = useMemo(
    () => animationActions(mixer, gltf.animations),
    [gltf.animations, mixer],
  )
  const activeAction = useRef<THREE.AnimationAction | null>(null)
  const indicatorRef = useRef<THREE.Mesh>(null)
  const indicatorMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const leanRef = useRef<THREE.Group>(null)
  const shieldRef = useRef<THREE.Group | null>(null)
  const pulse = useRef(0)

  // Bone-attached kit, so each archetype reads by silhouette before the player
  // is close enough to read its behaviour. Fail-soft: a rig missing the bone
  // simply renders without that piece (same policy as the captain's helmet).
  useEffect(() => {
    const kit = archetype.presentation.kit
    if (kit === 'sword') {
      return undefined
    }
    const wood = new THREE.MeshStandardMaterial({
      color: '#54381f',
      roughness: 0.88,
    })
    // Undressed ox-hide reads pale against every guard's cloth, which is what
    // makes the shieldbearer identifiable from across the courtyard.
    const hide = new THREE.MeshStandardMaterial({
      color: '#d8b98a',
      roughness: 0.82,
      metalness: 0.03,
    })
    const iron = new THREE.MeshStandardMaterial({
      color: '#3f4247',
      roughness: 0.38,
      metalness: 0.62,
    })
    const attached: { bone: THREE.Object3D; node: THREE.Object3D }[] = []
    const geometries: THREE.BufferGeometry[] = []

    const attach = (boneName: string, node: THREE.Object3D) => {
      const bone = actor.getObjectByName(boneName)
      if (!bone) {
        return false
      }
      bone.add(node)
      attached.push({ bone, node })
      return true
    }

    if (kit === 'buckler') {
      // Arrian: "not so broad as those who carry them, but are about as long" —
      // so it is modelled tall and narrow, which is also why it can be flanked.
      // Sized to read at gameplay camera distance: roughly two thirds of the
      // bearer's height, and offset clear of the arm so the silhouette is clean.
      const shield = new THREE.Group()
      const face = new THREE.BoxGeometry(0.52, 1.85, 0.09)
      const rim = new THREE.BoxGeometry(0.62, 1.96, 0.05)
      const boss = new THREE.SphereGeometry(0.13, 10, 8)
      geometries.push(face, rim, boss)
      const faceMesh = new THREE.Mesh(face, hide)
      const rimMesh = new THREE.Mesh(rim, iron)
      const bossMesh = new THREE.Mesh(boss, iron)
      rimMesh.position.z = -0.03
      bossMesh.position.z = 0.08
      shield.add(rimMesh, faceMesh, bossMesh)
      shield.position.set(0.18, 0.02, 0.42)
      shield.rotation.set(0, 0, 0.12)
      shieldRef.current = shield
      if (!attach('Fist.L', shield) && !attach('Hand.L', shield)) {
        attach('Torso', shield)
      }
    }

    if (kit === 'javelin') {
      const shaft = new THREE.CylinderGeometry(0.042, 0.042, 3.1, 6)
      const head = new THREE.ConeGeometry(0.12, 0.46, 6)
      const grip = new THREE.CylinderGeometry(0.055, 0.055, 0.3, 6)
      geometries.push(shaft, head, grip)
      const group = new THREE.Group()
      const shaftMesh = new THREE.Mesh(shaft, wood)
      const headMesh = new THREE.Mesh(head, iron)
      const gripMesh = new THREE.Mesh(grip, hide)
      headMesh.position.y = 1.75
      group.add(shaftMesh, headMesh, gripMesh)
      group.rotation.set(Math.PI / 2.2, 0, 0)
      group.position.set(0, 0.08, 0.42)
      if (!attach('Fist.R', group) && !attach('Hand.R', group)) {
        attach('Torso', group)
      }
    }

    if (kit === 'longbow') {
      // "a bow made of equal length with the man who bears it".
      const group = new THREE.Group()
      const limb = new THREE.TorusGeometry(1.24, 0.05, 6, 16, Math.PI * 1.1)
      const string = new THREE.CylinderGeometry(0.014, 0.014, 2.42, 4)
      geometries.push(limb, string)
      const limbMesh = new THREE.Mesh(limb, wood)
      const stringMesh = new THREE.Mesh(string, hide)
      stringMesh.position.set(0.38, 0, 0)
      group.add(limbMesh, stringMesh)
      group.rotation.set(0, Math.PI / 2, Math.PI / 2)
      group.position.set(0, 0.05, 0.42)
      if (!attach('Fist.L', group) && !attach('Hand.L', group)) {
        attach('Torso', group)
      }
    }

    for (const node of attached.map((a) => a.node)) {
      node.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
        }
      })
    }

    return () => {
      for (const { bone, node } of attached) {
        bone.remove(node)
      }
      shieldRef.current = null
      for (const geometry of geometries) {
        geometry.dispose()
      }
      wood.dispose()
      hide.dispose()
      iron.dispose()
    }
  }, [actor, archetype])

  useEffect(
    () => () => {
      mixer.stopAllAction()
    },
    [actor, mixer],
  )

  useFrame((_, delta) => {
    const group = localRef.current
    if (!group) {
      return
    }
    motion.moving = group.position.distanceToSquared(lastPosition.current) > 0.0001
    lastPosition.current.copy(group.position)
    const clipName = motion.defeated
      ? 'Defeat'
      : motion.staggered
        ? 'Idle'
        : motion.attacking
          ? 'Punch'
          : motion.moving
            ? 'Run'
            : 'Idle'
    const next = actions[clipName] ?? actions.Idle
    if (next && activeAction.current !== next) {
      activeAction.current?.fadeOut(0.12)
      next.reset().fadeIn(0.12).play()
      activeAction.current = next
    }
    // A parried guard is knocked off balance: freeze the clip and reel backwards.
    mixer.update(
      delta * (timeScaleRef.current ?? 1) * (motion.staggered ? 0.15 : 1),
    )

    const lean = leanRef.current
    if (lean) {
      const target = motion.staggered && !motion.defeated ? -0.42 : 0
      lean.rotation.x += (target - lean.rotation.x) * (1 - Math.exp(-11 * delta))
    }

    // The buckler swings across the body when raised and drops away when the
    // shieldbearer commits to a blow — the tell that says "hit me now".
    const shield = shieldRef.current
    if (shield) {
      const up = motion.guarding && !motion.defeated && !motion.staggered
      const targetRoll = up ? -0.95 : 0.12
      const targetLift = up ? 0.34 : 0.02
      shield.rotation.z +=
        (targetRoll - shield.rotation.z) * (1 - Math.exp(-14 * delta))
      shield.position.y +=
        (targetLift - shield.position.y) * (1 - Math.exp(-14 * delta))
    }

    const indicator = indicatorRef.current
    if (indicator) {
      if (motion.defeated || (motion.alert === 'calm' && !motion.staggered)) {
        indicator.visible = false
      } else {
        indicator.visible = true
        pulse.current +=
          delta * (motion.staggered ? 13 : motion.alert === 'alerted' ? 9 : 4)
        const scale =
          0.15 +
          Math.sin(pulse.current) * 0.03 +
          (motion.windup ? 0.06 : 0) +
          (motion.staggered ? 0.09 : 0)
        indicator.scale.setScalar(scale)
        indicatorMaterial.current?.color.set(
          motion.staggered
            ? colors.success
            : motion.guarding
              ? colors.water
              : motion.alert === 'alerted'
                ? colors.danger
                : colors.warning,
        )
      }
    }
  })

  return (
    <group
      ref={(group) => {
        localRef.current = group
        groupRef(group)
      }}
    >
      <group ref={leanRef}>
        <primitive
          object={actor}
          scale={archetype.presentation.scale}
        />
      </group>
      <mesh ref={indicatorRef} position={[0, 2.78, 0]} visible={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial ref={indicatorMaterial} color={colors.danger} />
      </mesh>
      <mesh position={[0, 2.35, 0]}>
        <boxGeometry args={[0.9, 0.1, 0.1]} />
        <meshStandardMaterial color={colors.wallDark} />
      </mesh>
      <mesh ref={healthRef} position={[-0.45, 2.35, 0.03]}>
        <boxGeometry args={[0.9, 0.11, 0.12]} />
        <meshBasicMaterial color={colors.success} />
      </mesh>
    </group>
  )
}

function BossFigure({
  colors,
  groupRef,
  healthRef,
  motion,
  timeScaleRef,
}: {
  colors: WorldColors
  groupRef: (group: THREE.Group | null) => void
  healthRef: (mesh: THREE.Mesh | null) => void
  motion: BossMotion
  timeScaleRef: RefObject<number>
}) {
  const localRef = useRef<THREE.Group>(null)
  const lastPosition = useRef(new THREE.Vector3())
  const auraRef = useRef<THREE.Mesh>(null)
  const auraMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const telegraphRef = useRef<THREE.Mesh>(null)
  const telegraphMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const leanRef = useRef<THREE.Group>(null)
  const pulse = useRef(0)
  const gltf = useLoader(
    GLTFLoader,
    MISSION_ASSETS.bossModel,
  )
  const actor = useMemo(
    () => themedCharacterClone(gltf.scene, colors, 'captain'),
    [colors, gltf.scene],
  )
  const mixer = useMemo(() => new THREE.AnimationMixer(actor), [actor])
  const actions = useMemo(
    () => animationActions(mixer, gltf.animations),
    [gltf.animations, mixer],
  )
  const activeAction = useRef<THREE.AnimationAction | null>(null)

  useEffect(
    () => () => {
      mixer.stopAllAction()
    },
    [actor, mixer],
  )

  // Bone-attached captain's helmet + crest so the boss reads as a distinct
  // commander rather than an enlarged guard. Fail-soft: if the rig lacks a Head
  // bone the boss simply renders without the crest.
  useEffect(() => {
    const head = actor.getObjectByName('Head')
    if (!head) {
      return undefined
    }
    const metal = new THREE.MeshStandardMaterial({
      color: CHARACTER_PALETTE.captain.metal,
      metalness: 0.62,
      roughness: 0.3,
    })
    const dark = new THREE.MeshStandardMaterial({
      color: CHARACTER_PALETTE.captain.clothDark,
      roughness: 0.8,
    })
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
      metal,
    )
    helmet.position.set(0, 0.12, 0)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.04, 8, 18), metal)
    rim.rotation.x = Math.PI / 2
    rim.position.set(0, 0.12, 0)
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.46), dark)
    crest.position.set(0, 0.4, 0)
    ;[helmet, rim, crest].forEach((mesh) => {
      mesh.castShadow = true
    })
    head.add(helmet, rim, crest)
    return () => {
      head.remove(helmet, rim, crest)
      helmet.geometry.dispose()
      rim.geometry.dispose()
      crest.geometry.dispose()
      metal.dispose()
      dark.dispose()
    }
  }, [actor])

  const phaseColor = (phase: BossPhase) =>
    phase >= 3 ? colors.danger : phase === 2 ? colors.accentHover : colors.warning

  useFrame((_, delta) => {
    const group = localRef.current
    if (!group) {
      return
    }
    motion.moving =
      group.position.distanceToSquared(lastPosition.current) > 0.0001
    lastPosition.current.copy(group.position)
    const clipName = motion.defeated
      ? 'Defeat'
      : motion.staggered
        ? 'Idle'
        : motion.windup || motion.lunging
          ? 'Punch'
          : motion.moving
            ? 'Run'
            : 'Idle'
    const next = actions[clipName] ?? actions.Idle
    if (next && activeAction.current !== next) {
      activeAction.current?.fadeOut(0.1)
      next.reset().fadeIn(0.1).play()
      activeAction.current = next
    }
    // Hit-stop and a parry stagger both slow the captain's clip.
    mixer.update(
      delta * (timeScaleRef.current ?? 1) * (motion.staggered ? 0.15 : 1),
    )

    const lean = leanRef.current
    if (lean) {
      const target = motion.staggered && !motion.defeated ? -0.36 : 0
      lean.rotation.x += (target - lean.rotation.x) * (1 - Math.exp(-10 * delta))
    }

    pulse.current += delta * (motion.phase >= 3 ? 8 : motion.phase === 2 ? 5.5 : 3.5)
    const aura = auraRef.current
    if (aura) {
      aura.visible = !motion.defeated
      const base = 1 + Math.sin(pulse.current) * 0.06
      aura.scale.setScalar(
        base + (motion.vulnerable ? 0.18 : 0) + (motion.staggered ? 0.12 : 0),
      )
      auraMaterial.current?.color.set(
        motion.vulnerable || motion.staggered
          ? colors.success
          : phaseColor(motion.phase),
      )
      if (auraMaterial.current) {
        auraMaterial.current.opacity =
          motion.staggered ? 0.66 : motion.vulnerable ? 0.5 : 0.28
      }
    }
    const telegraph = telegraphRef.current
    if (telegraph) {
      const active =
        (motion.windup || motion.lunging) && !motion.defeated && !motion.staggered
      telegraph.visible = active
      if (active) {
        telegraph.scale.setScalar(0.2 + Math.sin(pulse.current * 2) * 0.05)
        telegraphMaterial.current?.color.set(
          motion.lunging ? colors.danger : colors.warning,
        )
      }
    }
  })

  return (
    <group
      ref={(group) => {
        localRef.current = group
        groupRef(group)
      }}
    >
      <group ref={leanRef}>
        <primitive object={actor} scale={1.12} />
      </group>
      <mesh
        ref={auraRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.06, 0]}
        visible={false}
      >
        <ringGeometry args={[1.05, 1.35, 32]} />
        <meshBasicMaterial
          ref={auraMaterial}
          color={colors.warning}
          transparent
          opacity={0.28}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={telegraphRef} position={[0, 3.5, 0]} visible={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial ref={telegraphMaterial} color={colors.warning} />
      </mesh>
      <mesh position={[0, 3.05, 0]}>
        <boxGeometry args={[1.5, 0.14, 0.12]} />
        <meshStandardMaterial color={colors.wallDark} />
      </mesh>
      <mesh ref={healthRef} position={[-0.75, 3.05, 0.03]}>
        <boxGeometry args={[1.5, 0.15, 0.14]} />
        <meshBasicMaterial color={colors.danger} />
      </mesh>
    </group>
  )
}

function ObjectiveMarker({
  colors,
  position,
  markerRef,
  revealed,
}: {
  colors: WorldColors
  position: THREE.Vector3
  markerRef: (group: THREE.Group | null) => void
  revealed: boolean
}) {
  return (
    <group ref={markerRef} position={position}>
      <mesh rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.65, 0.18, 0.48]} />
        <meshStandardMaterial color={colors.warning} metalness={0.2} />
      </mesh>
      {revealed ? (
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.07, 0.28, 2.1, 10]} />
          <meshBasicMaterial
            color={colors.warning}
            transparent
            opacity={0.62}
          />
        </mesh>
      ) : null}
    </group>
  )
}

function MissionScene({
  controlsRef,
  modifiers,
  paused,
  onHudChange,
  onComplete,
  onSound,
}: Omit<NandaMissionProps, 'resetToken'>) {
  const colors = useMemo(readWorldColors, [])
  const heroRef = useRef<THREE.Group>(null)
  const heroMotion = useRef<HeroMotion>({
    moving: false,
    attacking: false,
    airborne: false,
    hurt: false,
    guarding: false,
  })
  const cameraShake = useRef(0)
  const cameraPunch = useRef(0)
  const hitstop = useRef(0)
  /** 1 normally, HITSTOP_TIME_SCALE during a hit-stop. Read by the figures. */
  const timeScale = useRef(1)
  // Respect the platform motion preference for the camera work specifically:
  // hit-stop is timing, but shake and punch are vestibular motion.
  const motionScale = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ? 0.2
        : 1,
    [],
  )
  const sparks = useRef<SparkApi | null>(null)
  const sparkColors = useMemo(
    () => ({
      steel: new THREE.Color('#ffe9b0'),
      perfect: new THREE.Color('#bfe9ff'),
      blood: new THREE.Color('#d1543f'),
      block: new THREE.Color('#9aa7b8'),
      broken: new THREE.Color('#ff8a4c'),
    }),
    [],
  )
  const enemyGroups = useRef(new Map<string, THREE.Group>())
  const enemyHealthBars = useRef(new Map<string, THREE.Mesh>())
  const objectiveGroups = useRef(new Map<number, THREE.Group>())
  const enemies = useRef<EnemyRuntime[]>(
    projectGuards(timberGateDefinition, modifiers.enemyCount).map((guard) => {
      const archetype = resolveArchetype(guard.archetype)
      const maxHp = modifiers.enemyHealth * archetype.behaviour.healthScale
      return {
        id: guard.id,
        position: new THREE.Vector3(
          guard.spawn.x,
          guard.spawn.y,
          guard.spawn.z,
        ),
        hp: maxHp,
        maxHp,
        alive: true,
        defeatTimer: 0,
        stagger: 0,
        guarding: false,
        archetype,
        brain: createGuardBrain(
          guard.id,
          { x: guard.spawn.x, z: guard.spawn.z },
          guard.patrol,
          guard.flankSign,
        ),
      }
    }),
  )
  const enemyMotions = useRef(
    new Map(
      enemies.current.map((enemy) => [
        enemy.id,
        {
          moving: false,
          attacking: false,
          defeated: false,
          alert: 'calm' as GuardAlert,
          windup: false,
          staggered: false,
          guarding: false,
          archetype: enemy.archetype.id,
        },
      ]),
    ),
  )
  const arrows = useRef<ArrowPool>(createArrowPool())
  const playerPosition = useRef(new THREE.Vector3(0, 0.85, 13.4))
  const bossGroup = useRef<THREE.Group | null>(null)
  const bossHealthBar = useRef<THREE.Mesh | null>(null)
  const bossBrain = useRef<BossBrain>(createBossBrain(MISSION_BOSS.id))
  const bossPosition = useRef(bossStart.clone())
  const bossHp = useRef(MISSION_BOSS.maxHealth)
  const bossAlive = useRef(true)
  const bossDefeatTimer = useRef(0)
  const bossHitFlash = useRef(0)
  const bossMotion = useRef<BossMotion>({
    moving: false,
    windup: false,
    lunging: false,
    vulnerable: false,
    defeated: false,
    staggered: false,
    phase: 1,
  })
  const bossStagger = useRef(0)
  const stance = useRef<GuardStance>(createGuardStance())
  const parries = useRef(0)
  const perfectParries = useRef(0)
  const feedbackId = useRef(0)
  const feedbackKind = useRef<GuardOutcome | StrikeKind | null>(null)
  const riposteHint = useRef(0)
  const verticalVelocity = useRef(0)
  const grounded = useRef(true)
  const health = useRef(modifiers.maxHealth)
  const healingCharges = useRef(modifiers.healingCharges)
  const healingUsed = useRef(0)
  const collectedObjectives = useRef(new Set<number>())
  const guardsDefeated = useRef(0)
  const elapsedSeconds = useRef(0)
  const attackCooldown = useRef(0)
  const attackAnimation = useRef(0)
  const hurtAnimation = useRef(0)
  const footstepTimer = useRef(0)
  const landedTimer = useRef(0)
  const healCooldown = useRef(0)
  const jumpLatch = useRef(false)
  const interactLatch = useRef(false)
  const completionSent = useRef(false)
  const hudClock = useRef(0)
  const moveDirection = useMemo(() => new THREE.Vector3(), [])
  const toPlayer = useMemo(() => new THREE.Vector3(), [])
  const candidate = useMemo(() => new THREE.Vector3(), [])
  // Reusable flat (x, z) scratch objects so per-frame combat maths allocates
  // nothing. `meleeSlots` holds one slot per guard plus one for the captain.
  const heroFlat = useMemo<Vec2>(() => ({ x: 0, z: 0 }), [])
  const scratchFlat = useMemo<Vec2>(() => ({ x: 0, z: 0 }), [])
  const meleeSlots = useMemo(
    () => enemies.current.map(() => ({ x: 0, z: 0 })),
    [],
  )
  const meleeCandidates = useMemo<(Vec2 | null)[]>(
    () => enemies.current.map(() => null),
    [],
  )
  const bossCandidates = useMemo<(Vec2 | null)[]>(() => [null], [])
  const bossSlot = useMemo<Vec2>(() => ({ x: 0, z: 0 }), [])
  // Reusable 3D scratch points for arrow spawn/aim, so a volley allocates nothing.
  const arrowSource = useMemo(() => ({ x: 0, y: 0, z: 0 }), [])
  const arrowAim = useMemo(() => ({ x: 0, y: 0, z: 0 }), [])

  /**
   * Fire every feedback channel for one combat beat: shake, camera punch,
   * hit-stop, sparks and the HUD banner. Keeping it in one place is what stops
   * the juice drifting out of sync with the resolution that caused it.
   */
  const registerImpact = useCallback(
    (
      kind: GuardOutcome | StrikeKind | 'kill',
      x: number,
      y: number,
      z: number,
      impact: number,
      color: THREE.Color,
      count: number,
    ) => {
      cameraShake.current = Math.max(
        cameraShake.current,
        (0.08 + impact * 0.22) * motionScale,
      )
      cameraPunch.current = Math.max(
        cameraPunch.current,
        impact * 0.32 * motionScale,
      )
      hitstop.current = Math.max(hitstop.current, HITSTOP[kind])
      sparks.current?.burst(x, y, z, color, count, 1.4 + impact * 3.4)
      if (kind !== 'kill' && kind !== 'normal') {
        feedbackId.current += 1
        feedbackKind.current = kind
      }
    },
    [motionScale],
  )

  /** Shove `position` directly away from the hero, respecting world collision. */
  const knockBack = useCallback(
    (position: THREE.Vector3, distance: number) => {
      const dx = position.x - heroFlat.x
      const dz = position.z - heroFlat.z
      const length = Math.hypot(dx, dz)
      if (length < 1e-4) {
        return
      }
      const nx = position.x + (dx / length) * distance
      const nz = position.z + (dz / length) * distance
      if (!isBlocked(nx, nz, position.y + 0.85, modifiers.sideGateOpen)) {
        position.x = nx
        position.z = nz
      }
    },
    [heroFlat, modifiers.sideGateOpen],
  )

  /**
   * Apply one resolved incoming blow — damage, counters, audio and feedback.
   * Shared by every source (guard swing, captain strike, arrow) so the roster
   * cannot drift into inconsistent answers to the same guard stance.
   */
  const applyIncoming = useCallback(
    (
      result: GuardResolution,
      source: { x: number; y: number; z: number },
      onStagger?: (staggerTime: number) => void,
    ) => {
      if (result.damage > 0) {
        hurtAnimation.current = 0.34
        health.current = Math.max(0, health.current - result.damage)
      }
      if (result.staggerTime > 0) {
        parries.current += 1
        riposteHint.current = result.riposteTime
        if (result.outcome === 'perfect-parry') {
          perfectParries.current += 1
        }
        onStagger?.(result.staggerTime)
      }
      onSound(
        result.outcome === 'hit'
          ? 'hurt'
          : result.outcome === 'guard-break'
            ? 'guard-break'
            : result.outcome === 'block'
              ? 'block'
              : result.outcome,
      )
      registerImpact(
        result.outcome,
        (playerPosition.current.x + source.x) / 2,
        playerPosition.current.y + 0.55,
        (playerPosition.current.z + source.z) / 2,
        result.impact,
        result.outcome === 'perfect-parry'
          ? sparkColors.perfect
          : result.outcome === 'parry'
            ? sparkColors.steel
            : result.outcome === 'guard-break'
              ? sparkColors.broken
              : result.outcome === 'block'
                ? sparkColors.block
                : sparkColors.blood,
        result.outcome === 'perfect-parry'
          ? 22
          : result.outcome === 'parry'
            ? 15
            : 8,
      )
    },
    [onSound, registerImpact, sparkColors],
  )

  const emitResult = useCallback(
    (success: boolean) => {
      if (completionSent.current) {
        return
      }
      completionSent.current = true
      if (!success) {
        onSound('defeat')
      }
      onComplete({
        success,
        healthRemaining: health.current,
        maxHealth: modifiers.maxHealth,
        guardsDefeated: guardsDefeated.current,
        objectivesSecured:
          modifiers.securedObjectives + collectedObjectives.current.size,
        requiredObjectives: modifiers.requiredObjectives,
        elapsedSeconds: elapsedSeconds.current,
        healingUsed: healingUsed.current,
        routeLabel: modifiers.routeLabel,
      })
    },
    [modifiers, onComplete, onSound],
  )

  useFrame((_, delta) => {
    const hero = heroRef.current
    const controls = controlsRef.current
    if (!hero || !controls || paused || completionSent.current) {
      return
    }

    // Hit-stop: a heavy beat drops the whole simulation into a hard slow for a
    // fraction of a second so impacts land with weight. It is measured in real
    // time (rawStep); `step` is the dilated clock every other system reads.
    const rawStep = Math.min(delta, 0.05)
    hitstop.current = Math.max(0, hitstop.current - rawStep)
    const step = hitstop.current > 0 ? rawStep * HITSTOP_TIME_SCALE : rawStep
    timeScale.current = hitstop.current > 0 ? HITSTOP_TIME_SCALE : 1
    cameraShake.current = Math.max(0, cameraShake.current - rawStep * 1.8)
    cameraPunch.current = Math.max(0, cameraPunch.current - rawStep * 3.4)
    riposteHint.current = Math.max(0, riposteHint.current - rawStep)
    elapsedSeconds.current += step
    attackCooldown.current = Math.max(0, attackCooldown.current - step)
    attackAnimation.current = Math.max(0, attackAnimation.current - step)
    hurtAnimation.current = Math.max(0, hurtAnimation.current - step)
    healCooldown.current = Math.max(0, healCooldown.current - step)
    footstepTimer.current = Math.max(0, footstepTimer.current - step)
    landedTimer.current = Math.max(0, landedTimer.current - step)

    // The guard runs on the real clock: a timing mechanic must never be
    // stretched by the hit-stop it just caused.
    updateGuardStance(stance.current, controls.guard, MISSION_COMBAT, rawStep)
    heroMotion.current.guarding = stance.current.raised
    heroFlat.x = playerPosition.current.x
    heroFlat.z = playerPosition.current.z

    moveDirection.set(
      Number(controls.right) - Number(controls.left),
      0,
      Number(controls.backward) - Number(controls.forward),
    )
    if (moveDirection.lengthSq() > 0) {
      moveDirection.normalize()
      const currentFloor = floorHeightAt(
        playerPosition.current.x,
        playerPosition.current.z,
      )
      candidate.copy(playerPosition.current).addScaledVector(
        moveDirection,
        modifiers.moveSpeed *
          (stance.current.raised ? MISSION_COMBAT.guardMoveScale : 1) *
          step,
      )
      const candidateFloor = floorHeightAt(candidate.x, candidate.z)
      const climbingTooHigh =
        grounded.current && candidateFloor - currentFloor > 0.58
      const blocked = isBlocked(
        candidate.x,
        candidate.z,
        playerPosition.current.y,
        modifiers.sideGateOpen,
      )
      if (!blocked && !climbingTooHigh) {
        playerPosition.current.x = candidate.x
        playerPosition.current.z = candidate.z
        if (candidateFloor < currentFloor - 0.4 && grounded.current) {
          grounded.current = false
        }
      }
      hero.rotation.y = Math.atan2(moveDirection.x, moveDirection.z)
      if (grounded.current && footstepTimer.current <= 0) {
        onSound('step')
        footstepTimer.current = 0.31
      }
    }
    heroMotion.current.moving = moveDirection.lengthSq() > 0

    // Soft lock-on: with the guard up Chandragupta squares onto the nearest
    // live threat, so a stationary block or parry is aimed at what is actually
    // swinging — and the guard's frontal arc stays a real, readable decision.
    if (stance.current.raised) {
      let lockX = 0
      let lockZ = 0
      let lockDistance = Number.POSITIVE_INFINITY
      for (const enemy of enemies.current) {
        if (!enemy.alive) {
          continue
        }
        const distance = Math.hypot(
          enemy.position.x - heroFlat.x,
          enemy.position.z - heroFlat.z,
        )
        if (distance < lockDistance && distance <= 6.5) {
          lockDistance = distance
          lockX = enemy.position.x
          lockZ = enemy.position.z
        }
      }
      if (bossAlive.current) {
        const distance = Math.hypot(
          bossPosition.current.x - heroFlat.x,
          bossPosition.current.z - heroFlat.z,
        )
        if (distance < lockDistance && distance <= 8) {
          lockDistance = distance
          lockX = bossPosition.current.x
          lockZ = bossPosition.current.z
        }
      }
      if (lockDistance < Number.POSITIVE_INFINITY) {
        const target = Math.atan2(lockX - heroFlat.x, lockZ - heroFlat.z)
        let deltaYaw = target - hero.rotation.y
        while (deltaYaw > Math.PI) {
          deltaYaw -= Math.PI * 2
        }
        while (deltaYaw < -Math.PI) {
          deltaYaw += Math.PI * 2
        }
        hero.rotation.y += deltaYaw * (1 - Math.exp(-13 * rawStep))
      }
    }

    if (controls.jump && grounded.current && !jumpLatch.current) {
      verticalVelocity.current = modifiers.jumpForce
      grounded.current = false
      jumpLatch.current = true
      onSound('jump')
    }
    if (!controls.jump) {
      jumpLatch.current = false
    }

    const floor = floorHeightAt(
      playerPosition.current.x,
      playerPosition.current.z,
    )
    if (!grounded.current) {
      verticalVelocity.current -= 18.5 * step
      playerPosition.current.y += verticalVelocity.current * step
      if (playerPosition.current.y <= floor + 0.85) {
        playerPosition.current.y = floor + 0.85
        verticalVelocity.current = 0
        grounded.current = true
        landedTimer.current = 0.2
      }
    } else {
      playerPosition.current.y = floor + 0.85
    }

    if (controls.attack && attackCooldown.current <= 0) {
      attackCooldown.current = 0.42
      attackAnimation.current = 0.34
      onSound('sword')

      // Honest targeting: only what is in reach AND inside the swing arc can be
      // hit, and the hero turns onto whatever the swing actually lands on.
      for (let index = 0; index < enemies.current.length; index += 1) {
        const enemy = enemies.current[index]
        if (enemy.alive) {
          meleeSlots[index].x = enemy.position.x
          meleeSlots[index].z = enemy.position.z
          meleeCandidates[index] = meleeSlots[index]
        } else {
          meleeCandidates[index] = null
        }
      }
      const guardTarget = selectMeleeTarget(
        hero.rotation.y,
        heroFlat,
        meleeCandidates,
        MISSION_COMBAT,
      )

      let bossTarget: MeleeTarget | null = null
      if (bossAlive.current) {
        bossSlot.x = bossPosition.current.x
        bossSlot.z = bossPosition.current.z
        bossCandidates[0] = bossSlot
        bossTarget = selectMeleeTarget(
          hero.rotation.y,
          heroFlat,
          bossCandidates,
          MISSION_COMBAT,
          BOSS_STRIKE_REACH,
        )
      }

      const bossFirst =
        bossTarget !== null &&
        (guardTarget === null || bossTarget.distance < guardTarget.distance)
      if (bossFirst && bossTarget) {
        hero.rotation.y = bossTarget.yaw
      } else if (guardTarget) {
        hero.rotation.y = guardTarget.yaw
      }

      const swingGuard = () => {
        if (!guardTarget) {
          return
        }
        const enemy = enemies.current[guardTarget.index]
        if (!enemy?.alive) {
          return
        }
        // The shieldbearer answers with the player's own mechanic: a long, narrow
        // buckler covers his front, so a frontal swing is deflected and only a
        // flank — or the window after his own blow — gets through.
        scratchFlat.x = heroFlat.x
        scratchFlat.z = heroFlat.z
        const deflects =
          enemy.guarding &&
          enemy.archetype.behaviour.ownGuard &&
          isWithinArc(
            enemyGroups.current.get(enemy.id)?.rotation.y ?? 0,
            enemy.position,
            scratchFlat,
            enemy.archetype.behaviour.guardArc,
          )
        const strike = resolveOutgoingStrike(
          stance.current,
          {
            baseDamage: modifiers.attackDamage,
            targetVulnerable: enemy.stagger > 0,
            targetDeflects: deflects,
          },
          MISSION_COMBAT,
        )
        if (strike.kind === 'deflected') {
          attackCooldown.current = Math.max(
            attackCooldown.current,
            strike.recoil,
          )
          onSound('deflect')
          registerImpact(
            'deflected',
            enemy.position.x,
            enemy.position.y + 1.15,
            enemy.position.z,
            strike.impact,
            sparkColors.block,
            12,
          )
          return
        }
        enemy.hp -= strike.damage
        knockBack(enemy.position, 0.18 + strike.impact * 0.3)
        onSound(strike.consumedRiposte ? 'riposte' : 'impact')
        registerImpact(
          strike.kind,
          enemy.position.x,
          enemy.position.y + 1.2,
          enemy.position.z,
          strike.impact,
          sparkColors.blood,
          strike.consumedRiposte ? 16 : 9,
        )
        if (enemy.hp <= 0) {
          enemy.alive = false
          enemy.defeatTimer = 0.9
          enemy.stagger = 0
          enemy.guarding = false
          guardsDefeated.current += 1
          onSound('defeat')
          registerImpact(
            'kill',
            enemy.position.x,
            enemy.position.y + 1.1,
            enemy.position.z,
            0.7,
            sparkColors.blood,
            18,
          )
        }
      }

      // The captain shares the same swing: hit it if it is in reach, with a
      // damage bonus while it is in its post-lunge vulnerable recovery.
      const swingBoss = () => {
        if (!bossTarget || !bossAlive.current) {
          return
        }
        const strike = resolveOutgoingStrike(
          stance.current,
          {
            baseDamage: modifiers.attackDamage,
            targetVulnerable:
              bossMotion.current.vulnerable || bossStagger.current > 0,
          },
          MISSION_COMBAT,
        )
        bossHp.current -= strike.damage
        bossHitFlash.current = 0.12
        onSound(strike.consumedRiposte ? 'riposte' : 'impact')
        registerImpact(
          strike.kind,
          bossPosition.current.x,
          bossPosition.current.y + 1.6,
          bossPosition.current.z,
          strike.impact,
          sparkColors.blood,
          strike.consumedRiposte ? 20 : 11,
        )
        if (bossHp.current <= 0) {
          bossHp.current = 0
          bossAlive.current = false
          bossDefeatTimer.current = 1.4
          bossStagger.current = 0
          onSound('defeat')
          registerImpact(
            'kill',
            bossPosition.current.x,
            bossPosition.current.y + 1.5,
            bossPosition.current.z,
            1,
            sparkColors.steel,
            26,
          )
        }
      }

      if (bossFirst) {
        swingBoss()
        swingGuard()
      } else {
        swingGuard()
        swingBoss()
      }
    }

    if (
      controls.heal &&
      healCooldown.current <= 0 &&
      healingCharges.current > 0 &&
      health.current < modifiers.maxHealth
    ) {
      healCooldown.current = 0.6
      healingCharges.current -= 1
      healingUsed.current += 1
      health.current = Math.min(modifiers.maxHealth, health.current + 42)
      onSound('heal')
    }

    const heroNoise = playerNoiseLevel({
      moving: heroMotion.current.moving,
      attacking: attackAnimation.current > 0,
      airborne: !grounded.current,
      landed: landedTimer.current > 0,
    })
    let anyAlerted = false
    let anySuspicious = false
    let threatName: string | null = null
    let threatDistance = Number.POSITIVE_INFINITY

    for (const enemy of enemies.current) {
      const group = enemyGroups.current.get(enemy.id)
      const healthBar = enemyHealthBars.current.get(enemy.id)
      const motion = enemyMotions.current.get(enemy.id)
      if (!group) {
        continue
      }
      group.visible = enemy.alive || enemy.defeatTimer > 0
      if (!enemy.alive) {
        if (motion) {
          motion.defeated = true
          motion.attacking = false
          motion.windup = false
          motion.alert = 'calm'
        }
        enemy.defeatTimer = Math.max(0, enemy.defeatTimer - step)
        continue
      }

      const wasWindup = motion?.windup ?? false
      const behaviour = enemy.archetype.behaviour
      const perception = enemy.archetype.perception
      const staggered = enemy.stagger > 0
      if (staggered) {
        enemy.stagger = Math.max(0, enemy.stagger - step)
        // A parried guard is frozen mid-recovery: no perception, no swing, and
        // it cannot immediately re-attack when it recovers.
        enemy.brain.windupTimer = 0
        enemy.brain.cooldownTimer = Math.max(
          enemy.brain.cooldownTimer,
          perception.attackCooldown * 0.5,
        )
      }
      const intent = staggered
        ? STAGGERED_GUARD_INTENT
        : updateGuardBrain(
            enemy.brain,
            {
              guard: { x: enemy.position.x, z: enemy.position.z },
              facingYaw: group.rotation.y,
              player: {
                x: playerPosition.current.x,
                z: playerPosition.current.z,
              },
              playerNoise: heroNoise,
              healthFraction: clamp01(enemy.hp / enemy.maxHp),
            },
            perception,
            step,
            {
              ownGuard: behaviour.ownGuard,
              guardRecovery: behaviour.guardRecovery,
              minRange: behaviour.minRange,
            },
          )
      enemy.guarding = intent.guarding

      if (!staggered) {
        if (intent.alert === 'alerted') {
          anyAlerted = true
        } else if (intent.alert === 'suspicious') {
          anySuspicious = true
        }
      } else {
        anyAlerted = true
      }

      // Name the nearest live threat so the roster teaches itself in play.
      if (intent.alert !== 'calm') {
        const distance = Math.hypot(
          enemy.position.x - heroFlat.x,
          enemy.position.z - heroFlat.z,
        )
        if (distance < threatDistance) {
          threatDistance = distance
          threatName = enemy.archetype.presentation.displayName
        }
      }

      let moved = false
      if (intent.moveTarget && intent.speed > 0) {
        toPlayer.set(
          intent.moveTarget.x - enemy.position.x,
          0,
          intent.moveTarget.z - enemy.position.z,
        )
        const travel = toPlayer.length()
        if (travel > 0.04) {
          toPlayer.divideScalar(travel)
          candidate
            .copy(enemy.position)
            .addScaledVector(toPlayer, intent.speed * step)
          if (
            !isBlocked(
              candidate.x,
              candidate.z,
              enemy.position.y + 0.85,
              modifiers.sideGateOpen,
            )
          ) {
            enemy.position.x = candidate.x
            enemy.position.z = candidate.z
            moved = true
          }
        }
      }

      // A telegraphed strike only connects if the player is still in reach, so
      // retreating during the wind-up dodges the blow. Anything that does reach
      // is then answered by the guard stance: parry, block, or take it in full.
      // A javelineer steps into its thrust, so retreat alone will not save you;
      // an archer looses an arrow instead of swinging.
      if (intent.strike) {
        if (behaviour.ranged) {
          arrowSource.x = enemy.position.x
          arrowSource.y = enemy.position.y + 1.25
          arrowSource.z = enemy.position.z
          arrowAim.x = playerPosition.current.x
          arrowAim.y = playerPosition.current.y + 0.15
          arrowAim.z = playerPosition.current.z
          fireArrow(
            arrows.current,
            arrowSource,
            arrowAim,
            behaviour.projectileSpeed,
            behaviour.damage,
          )
          onSound('arrow-release')
        } else {
          if (behaviour.stepIn > 0) {
            // Commit the thrust forward so backing out of range is not a free
            // answer to a javelineer.
            const dx = playerPosition.current.x - enemy.position.x
            const dz = playerPosition.current.z - enemy.position.z
            const length = Math.hypot(dx, dz) || 1
            const nx = enemy.position.x + (dx / length) * behaviour.stepIn
            const nz = enemy.position.z + (dz / length) * behaviour.stepIn
            if (
              !isBlocked(nx, nz, enemy.position.y + 0.85, modifiers.sideGateOpen)
            ) {
              enemy.position.x = nx
              enemy.position.z = nz
            }
          }
          const reach = Math.hypot(
            playerPosition.current.x - enemy.position.x,
            playerPosition.current.z - enemy.position.z,
          )
          if (reach <= perception.attackRange + 0.25) {
            scratchFlat.x = enemy.position.x
            scratchFlat.z = enemy.position.z
            const result = resolveIncomingAttack(
              stance.current,
              {
                damage: behaviour.damage,
                heavy: behaviour.heavy,
                frontal: isWithinArc(
                  hero.rotation.y,
                  heroFlat,
                  scratchFlat,
                  MISSION_COMBAT.guardArc,
                ),
              },
              MISSION_COMBAT,
            )
            applyIncoming(result, enemy.position, (stagger) => {
              enemy.stagger = stagger
              enemy.brain.windupTimer = 0
              knockBack(enemy.position, 0.55)
            })
          }
        }
      }
      if (intent.windup && !wasWindup) {
        onSound('sword')
      }

      if (intent.faceTarget) {
        const faceX = intent.faceTarget.x - enemy.position.x
        const faceZ = intent.faceTarget.z - enemy.position.z
        if (Math.abs(faceX) + Math.abs(faceZ) > 0.001) {
          group.rotation.y = Math.atan2(faceX, faceZ)
        }
      }

      enemy.position.y = floorHeightAt(enemy.position.x, enemy.position.z)
      group.position.set(enemy.position.x, enemy.position.y, enemy.position.z)

      if (motion) {
        motion.moving = moved
        motion.attacking = intent.windup
        motion.windup = intent.windup
        motion.alert = intent.alert
        motion.defeated = false
        motion.staggered = enemy.stagger > 0
        motion.guarding = enemy.guarding
      }

      if (healthBar) {
        const ratio = clamp01(enemy.hp / enemy.maxHp)
        healthBar.scale.x = ratio
        healthBar.position.x = -0.41 + (ratio * 0.82) / 2
      }
    }

    // Keep guards from stacking so flanking reads clearly on screen. Iterate
    // the existing array directly (no per-frame allocation) and skip the dead.
    const guards = enemies.current
    for (let i = 0; i < guards.length; i += 1) {
      const a = guards[i]
      if (!a.alive) {
        continue
      }
      for (let j = i + 1; j < guards.length; j += 1) {
        const b = guards[j]
        if (!b.alive) {
          continue
        }
        const dx = b.position.x - a.position.x
        const dz = b.position.z - a.position.z
        const gap = Math.hypot(dx, dz)
        const minGap = 1.15
        if (gap > 0.0001 && gap < minGap) {
          const push = ((minGap - gap) / 2) * 0.6
          const nx = dx / gap
          const nz = dz / gap
          const ax = a.position.x - nx * push
          const az = a.position.z - nz * push
          const bx = b.position.x + nx * push
          const bz = b.position.z + nz * push
          if (!isBlocked(ax, az, a.position.y + 0.85, modifiers.sideGateOpen)) {
            a.position.x = ax
            a.position.z = az
          }
          if (!isBlocked(bx, bz, b.position.y + 0.85, modifiers.sideGateOpen)) {
            b.position.x = bx
            b.position.z = bz
          }
        }
      }
    }

    // The Nanda captain: a phased arena boss between the wall and the gate.
    const bossGroupObj = bossGroup.current
    let bossEngagedNow = false
    bossHitFlash.current = Math.max(0, bossHitFlash.current - step)
    if (bossGroupObj) {
      bossGroupObj.visible = bossAlive.current || bossDefeatTimer.current > 0
      if (!bossAlive.current) {
        bossMotion.current.defeated = true
        bossMotion.current.windup = false
        bossMotion.current.lunging = false
        bossMotion.current.vulnerable = false
        bossMotion.current.moving = false
        bossMotion.current.staggered = false
        bossDefeatTimer.current = Math.max(0, bossDefeatTimer.current - step)
        bossGroupObj.position.set(
          bossPosition.current.x,
          bossPosition.current.y,
          bossPosition.current.z,
        )
      } else {
        const wasBossWindup =
          bossMotion.current.windup || bossMotion.current.lunging
        const bossIntent = updateBossBrain(
          bossBrain.current,
          {
            boss: { x: bossPosition.current.x, z: bossPosition.current.z },
            player: {
              x: playerPosition.current.x,
              z: playerPosition.current.z,
            },
            healthFraction: clamp01(bossHp.current / MISSION_BOSS.maxHealth),
            damaged: bossHitFlash.current > 0,
          },
          MISSION_BOSS.config,
          step,
        )
        bossEngagedNow = bossIntent.engaged

        if (bossIntent.moveTarget && bossIntent.speed > 0) {
          toPlayer.set(
            bossIntent.moveTarget.x - bossPosition.current.x,
            0,
            bossIntent.moveTarget.z - bossPosition.current.z,
          )
          const travel = toPlayer.length()
          if (travel > 0.04) {
            toPlayer.divideScalar(travel)
            candidate
              .copy(bossPosition.current)
              .addScaledVector(toPlayer, bossIntent.speed * step)
            if (
              !isBlocked(
                candidate.x,
                candidate.z,
                bossPosition.current.y + 0.85,
                modifiers.sideGateOpen,
              )
            ) {
              bossPosition.current.x = candidate.x
              bossPosition.current.z = candidate.z
            }
          }
        }

        if (bossIntent.strike && bossIntent.damage > 0) {
          const reach = Math.hypot(
            playerPosition.current.x - bossPosition.current.x,
            playerPosition.current.z - bossPosition.current.z,
          )
          if (reach <= MISSION_BOSS.config.lungeRange + 0.4) {
            scratchFlat.x = bossPosition.current.x
            scratchFlat.z = bossPosition.current.z
            const result = resolveIncomingAttack(
              stance.current,
              {
                damage: bossIntent.damage,
                heavy: bossIntent.lunging,
                frontal: isWithinArc(
                  hero.rotation.y,
                  heroFlat,
                  scratchFlat,
                  MISSION_COMBAT.guardArc,
                ),
              },
              MISSION_COMBAT,
            )
            if (result.damage > 0) {
              hurtAnimation.current = 0.36
            }
            applyIncoming(result, bossPosition.current, (staggerTime) => {
              // Parrying the captain forces it straight into the recovery it
              // normally only enters after a lunge — the existing punish window,
              // now something the player can create on demand.
              bossStagger.current = staggerTime
              bossBrain.current.state = 'recover'
              bossBrain.current.timer = staggerTime
              bossBrain.current.lungeCharging = false
              bossBrain.current.lungeDir = null
              bossBrain.current.cooldownTimer = Math.max(
                bossBrain.current.cooldownTimer,
                staggerTime * 0.6,
              )
              knockBack(bossPosition.current, 0.5)
            })
          }
        }
        const nowWindup = bossIntent.windup || bossIntent.lunging
        if (nowWindup && !wasBossWindup) {
          onSound('sword')
        }

        if (bossIntent.faceTarget) {
          const fx = bossIntent.faceTarget.x - bossPosition.current.x
          const fz = bossIntent.faceTarget.z - bossPosition.current.z
          if (Math.abs(fx) + Math.abs(fz) > 0.001) {
            bossGroupObj.rotation.y = Math.atan2(fx, fz)
          }
        }

        bossPosition.current.y = floorHeightAt(
          bossPosition.current.x,
          bossPosition.current.z,
        )
        bossGroupObj.position.set(
          bossPosition.current.x,
          bossPosition.current.y,
          bossPosition.current.z,
        )

        bossMotion.current.windup = bossIntent.windup
        bossMotion.current.lunging = bossIntent.lunging
        bossMotion.current.vulnerable = bossIntent.vulnerable
        bossMotion.current.phase = bossIntent.phase
        bossMotion.current.defeated = false
        bossStagger.current = Math.max(0, bossStagger.current - step)
        bossMotion.current.staggered = bossStagger.current > 0
      }

      const bossBar = bossHealthBar.current
      if (bossBar) {
        const ratio = clamp01(bossHp.current / MISSION_BOSS.maxHealth)
        bossBar.scale.x = ratio
        bossBar.position.x = -0.75 + (ratio * 1.5) / 2
      }
    }

    // Arrows in flight. A timed guard deflects the shaft outright; otherwise the
    // same stance resolution as any other blow decides what it does to you.
    const pool = arrows.current
    arrowAim.x = playerPosition.current.x
    arrowAim.y = playerPosition.current.y + 0.25
    arrowAim.z = playerPosition.current.z
    for (let i = 0; i < ARROW_POOL; i += 1) {
      if (pool.life[i] <= 0) {
        continue
      }
      advanceArrow(pool, i, step)

      if (arrowHits(pool, i, arrowAim)) {
        scratchFlat.x = pool.x[i]
        scratchFlat.z = pool.z[i]
        const result = resolveIncomingAttack(
          stance.current,
          {
            damage: pool.damage[i],
            frontal: isWithinArc(
              hero.rotation.y,
              heroFlat,
              scratchFlat,
              MISSION_COMBAT.guardArc,
            ),
          },
          MISSION_COMBAT,
        )
        arrowSource.x = pool.x[i]
        arrowSource.y = pool.y[i]
        arrowSource.z = pool.z[i]
        applyIncoming(result, arrowSource)
        retireArrow(pool, i)
        continue
      }

      const floor = floorHeightAt(pool.x[i], pool.z[i])
      if (
        pool.life[i] <= 0 ||
        pool.y[i] <= floor + 0.05 ||
        isBlocked(pool.x[i], pool.z[i], pool.y[i], modifiers.sideGateOpen)
      ) {
        retireArrow(pool, i)
      }
    }

    objectivePositions.forEach((position, index) => {      if (collectedObjectives.current.has(index)) {
        return
      }
      const marker = objectiveGroups.current.get(index)
      if (
        isObjectiveInRange(
          { x: position.x, y: position.y, z: position.z },
          {
            x: playerPosition.current.x,
            y: playerPosition.current.y,
            z: playerPosition.current.z,
          },
          MISSION_OBJECTIVES.collection,
        )
      ) {
        collectedObjectives.current.add(index)
        onSound('objective')
        if (marker) {
          marker.visible = false
        }
      }
    })

    hero.position.copy(playerPosition.current)
    heroMotion.current.attacking = attackAnimation.current > 0
    heroMotion.current.airborne = !grounded.current
    heroMotion.current.hurt = hurtAnimation.current > 0
    const objectivesSecured =
      modifiers.securedObjectives + collectedObjectives.current.size
    const gateDistance = Math.hypot(
      playerPosition.current.x,
      playerPosition.current.z + 12.4,
    )
    // Gate 13: the completion decision is a pure predicate reading the
    // definition's exit anchor + policy (see evaluateExitCompletion's truth
    // table). It resolves a single frame; completionSent stays the once-only
    // arbiter, and a same-frame success suppresses a same-frame death.
    const completion = evaluateExitCompletion(MISSION_COMPLETION, MISSION_EXIT, {
      objectivesSecured,
      requiredObjectives: modifiers.requiredObjectives,
      bossAlive: bossAlive.current,
      player: {
        x: playerPosition.current.x,
        z: playerPosition.current.z,
      },
      interactPressed: controls.interact,
      interactWasPressed: interactLatch.current,
      zeroHealth: health.current <= 0,
    })
    if (completion === 'success') {
      onSound('gate')
      cameraShake.current = 0.24
      emitResult(true)
    } else if (completion === 'failure') {
      emitResult(false)
    }
    interactLatch.current = controls.interact

    hudClock.current += step
    if (hudClock.current >= 0.12) {
      hudClock.current = 0
      const bossThreat = bossAlive.current && bossEngagedNow
      // Combat prompts outrank navigation prompts: while a blade is in the air
      // the player needs to be told what to do about it, not where to walk.
      const prompt =
        stance.current.brokenFor > 0
          ? MISSION_PROMPTS.guardBroken
          : riposteHint.current > 0 && stance.current.riposteFor > 0
            ? MISSION_PROMPTS.riposte
            : bossThreat
              ? bossMotion.current.vulnerable || bossMotion.current.staggered
                ? MISSION_PROMPTS.bossVulnerable
                : MISSION_PROMPTS.bossEngaged
              : anyAlerted
                ? MISSION_PROMPTS.spotted
                : anySuspicious
                  ? MISSION_PROMPTS.heard
                  : bossAlive.current &&
                      objectivesSecured >= modifiers.requiredObjectives
                    ? MISSION_PROMPTS.bossGate
                    : gateDistance <= 2.4
                      ? objectivesSecured >= modifiers.requiredObjectives
                        ? MISSION_PROMPTS.atGateReady
                        : MISSION_PROMPTS.atGateLocked
                      : controls.heal &&
                          healingCharges.current === 0 &&
                          health.current < modifiers.maxHealth
                        ? MISSION_PROMPTS.noHeals
                        : MISSION_PROMPTS.default
      onHudChange({
        health: health.current,
        maxHealth: modifiers.maxHealth,
        guardsDefeated: guardsDefeated.current,
        enemyCount: modifiers.enemyCount,
        objectivesSecured,
        requiredObjectives: modifiers.requiredObjectives,
        healingCharges: healingCharges.current,
        healingUsed: healingUsed.current,
        elapsedSeconds: Math.round(elapsedSeconds.current),
        prompt,
        bossActive: bossAlive.current && bossEngagedNow,
        bossHealth: bossHp.current,
        bossMaxHealth: MISSION_BOSS.maxHealth,
        bossPhase: bossMotion.current.phase,
        bossDefeated: !bossAlive.current,
        resolve: stance.current.resolve,
        guarding: stance.current.raised,
        guardBroken: stance.current.brokenFor > 0,
        riposteReady: stance.current.riposteFor > 0,
        parries: parries.current,
        perfectParries: perfectParries.current,
        threat:
          bossAlive.current && bossEngagedNow
            ? MISSION_BOSS.displayName
            : threatName,
        feedback: { id: feedbackId.current, kind: feedbackKind.current },
      })
    }
  })

  return (
    <>
      <color attach="background" args={[colors.background]} />
      <fog attach="fog" args={[colors.background, 18, 45]} />
      <hemisphereLight
        args={[colors.warning, colors.wallDark, 1.55]}
      />
      <directionalLight
        castShadow
        position={[9, 15, 11]}
        intensity={2.9}
        shadow-mapSize-width={MISSION_BUDGETS.shadowMapSize}
        shadow-mapSize-height={MISSION_BUDGETS.shadowMapSize}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight
        position={[-2, 7, -15]}
        intensity={1.7}
        color="#a9c2ea"
      />
      <mesh position={[0, 8, -28]}>
        <planeGeometry args={[62, 34]} />
        <meshStandardMaterial color={colors.groundSoft} roughness={1} />
      </mesh>
      <PataliputraDistrict
        colors={colors}
        sideGateOpen={modifiers.sideGateOpen}
      />
      <OpenAssetProps colors={colors} />
      <TorchLights colors={colors} />
      <HeroFigure
        colors={colors}
        heroRef={heroRef}
        motionRef={heroMotion}
        timeScaleRef={timeScale}
      />
      <CameraRig target={heroRef} shakeRef={cameraShake} punchRef={cameraPunch} />
      <ImpactSparks apiRef={sparks} />
      <ArrowVolley arrowsRef={arrows} colors={colors} />
      {enemies.current.map((enemy) => (
        <GuardFigure
          key={enemy.id}
          colors={colors}
          groupRef={(group) => {
            if (group) {
              enemyGroups.current.set(enemy.id, group)
            } else {
              enemyGroups.current.delete(enemy.id)
            }
          }}
          healthRef={(mesh) => {
            if (mesh) {
              enemyHealthBars.current.set(enemy.id, mesh)
            } else {
              enemyHealthBars.current.delete(enemy.id)
            }
          }}
          motion={
            enemyMotions.current.get(enemy.id) ?? {
              moving: false,
              attacking: false,
              defeated: false,
              alert: 'calm',
              windup: false,
              staggered: false,
              guarding: false,
              archetype: enemy.archetype.id,
            }
          }
          timeScaleRef={timeScale}
          archetype={enemy.archetype}
        />
      ))}
      {objectivePositions.map((position, index) => (
        <ObjectiveMarker
          key={index}
          colors={colors}
          position={position}
          revealed={modifiers.revealObjectives}
          markerRef={(group) => {
            if (group) {
              objectiveGroups.current.set(index, group)
            } else {
              objectiveGroups.current.delete(index)
            }
          }}
        />
      ))}
      <BossFigure
        colors={colors}
        groupRef={(group) => {
          bossGroup.current = group
        }}
        healthRef={(mesh) => {
          bossHealthBar.current = mesh
        }}
        motion={bossMotion.current}
        timeScaleRef={timeScale}
      />
      <mesh position={[0, 0.75, -12.4]}>
        <boxGeometry args={[0.55, 1.5, 0.55]} />
        <meshStandardMaterial color={colors.success} metalness={0.25} />
      </mesh>
      <mesh position={[0, 2.4, -12.4]}>
        <torusGeometry args={[0.42, 0.08, 8, 16]} />
        <meshStandardMaterial color={colors.warning} />
      </mesh>
    </>
  )
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

export default function NandaMission(props: NandaMissionProps) {
  useKeyboardControls(props.controlsRef, props.onAudioStart)

  return (
    <div className="nanda-canvas" data-reset-token={props.resetToken}>
      <Canvas
        key={props.resetToken}
        shadows
        camera={{ position: [0, 4.8, 19], fov: 58, near: 0.1, far: 80 }}
        dpr={[MISSION_BUDGETS.dpr[0], MISSION_BUDGETS.dpr[1]]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <MissionScene {...props} />
      </Canvas>
    </div>
  )
}
