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
  GUARD_PERCEPTION,
  createGuardBrain,
  playerNoiseLevel,
  updateGuardBrain,
  type GuardAlert,
  type GuardBrain,
  type Vec2,
} from './guardAi'
import {
  BOSS_CONFIG,
  BOSS_MAX_HEALTH,
  createBossBrain,
  updateBossBrain,
  type BossBrain,
  type BossPhase,
} from './bossAi'
import type { MissionModifiers, MissionResult } from './types'
import { floorHeightAt, isBlocked } from './missionGeometry'
import { timberGateDefinition } from './timberGateDefinition'

// Gate 5 of the mission-definition migration: model/prop asset paths come from
// the definition (single source of truth) rather than hardcoded strings.
const MISSION_ASSETS = timberGateDefinition.presentation.assets
// Gate 6: HUD prompt strings come from the definition's presentation copy.
const MISSION_PROMPTS = timberGateDefinition.presentation.copy.prompts

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
  alive: boolean
  defeatTimer: number
  brain: GuardBrain
}

type HeroMotion = {
  moving: boolean
  attacking: boolean
  airborne: boolean
  hurt: boolean
}

type GuardMotion = {
  moving: boolean
  attacking: boolean
  defeated: boolean
  alert: GuardAlert
  windup: boolean
}

type BossMotion = {
  moving: boolean
  windup: boolean
  lunging: boolean
  vulnerable: boolean
  defeated: boolean
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

const enemyStarts = [
  new THREE.Vector3(0, 0, 6),
  new THREE.Vector3(5.5, 0, 3),
  new THREE.Vector3(-4, 0, -3),
  new THREE.Vector3(5.5, 0, -6),
  new THREE.Vector3(-3, 0, -10),
  new THREE.Vector3(2.8, 0, -12),
]

const objectivePositions = [
  new THREE.Vector3(-7.5, 2.65, 3.4),
  new THREE.Vector3(6.4, 0.25, -5.1),
]

// Hand-tuned patrol loops near each guard's post, kept clear of the gate line
// (|z| < 0.62) so patrolling guards never wedge themselves against the wall.
const patrolRoutes: Vec2[][] = [
  [{ x: 0, z: 6 }, { x: 3.2, z: 8.6 }, { x: -2.6, z: 8 }],
  [{ x: 5.5, z: 3 }, { x: 7.6, z: 6.6 }, { x: 4, z: 1.4 }],
  [{ x: -4, z: -3 }, { x: -6.6, z: -1.4 }, { x: -3, z: -6 }],
  [{ x: 5.5, z: -6 }, { x: 7.6, z: -9 }, { x: 3.6, z: -4 }],
  [{ x: -3, z: -10 }, { x: -6, z: -12 }, { x: -1.6, z: -8 }],
  [{ x: 2.8, z: -12 }, { x: 5, z: -13.4 }, { x: 0.6, z: -10 }],
]

const patrolRouteFor = (index: number, start: THREE.Vector3): Vec2[] =>
  patrolRoutes[index] ?? [{ x: start.x, z: start.z }]

// The Nanda captain holds the ground between the wall and the northern gate.
const bossStart = new THREE.Vector3(0, 0, -9)

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
}: {
  target: RefObject<THREE.Group | null>
  shakeRef: RefObject<number>
}) {
  const { camera } = useThree()
  const desired = useMemo(() => new THREE.Vector3(), [])
  const lookAt = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const player = target.current
    if (!player) {
      return
    }
    desired.set(
      player.position.x +
        Math.sin(performance.now() * 0.055) * (shakeRef.current ?? 0),
      player.position.y +
        4.15 +
        Math.cos(performance.now() * 0.07) * (shakeRef.current ?? 0) * 0.45,
      player.position.z +
        6.25 +
        Math.sin(performance.now() * 0.045) * (shakeRef.current ?? 0) * 0.65,
    )
    camera.position.lerp(desired, 1 - Math.exp(-6 * delta))
    lookAt.set(
      player.position.x,
      player.position.y + 1.05,
      player.position.z - 2.8,
    )
    camera.lookAt(lookAt)
  })

  return null
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
) => {
  const actor = cloneSkeleton(source)
  const roleColors =
    role === 'hero'
      ? CHARACTER_PALETTE.hero
      : role === 'captain'
        ? CHARACTER_PALETTE.captain
        : CHARACTER_PALETTE.guard
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
}: {
  colors: WorldColors
  heroRef: RefObject<THREE.Group | null>
  motionRef: RefObject<HeroMotion>
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
    mixer.update(delta)
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
}: {
  colors: WorldColors
  groupRef: (group: THREE.Group | null) => void
  healthRef: (mesh: THREE.Mesh | null) => void
  motion: GuardMotion
}) {
  const localRef = useRef<THREE.Group>(null)
  const lastPosition = useRef(new THREE.Vector3())
  const gltf = useLoader(
    GLTFLoader,
    MISSION_ASSETS.guardModel,
  )
  const actor = useMemo(
    () => themedCharacterClone(gltf.scene, colors, 'guard'),
    [colors, gltf.scene],
  )
  const mixer = useMemo(() => new THREE.AnimationMixer(actor), [actor])
  const actions = useMemo(
    () => animationActions(mixer, gltf.animations),
    [gltf.animations, mixer],
  )
  const activeAction = useRef<THREE.AnimationAction | null>(null)
  const indicatorRef = useRef<THREE.Mesh>(null)
  const indicatorMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const pulse = useRef(0)

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
    mixer.update(delta)

    const indicator = indicatorRef.current
    if (indicator) {
      if (motion.defeated || motion.alert === 'calm') {
        indicator.visible = false
      } else {
        indicator.visible = true
        pulse.current += delta * (motion.alert === 'alerted' ? 9 : 4)
        const scale =
          0.15 +
          Math.sin(pulse.current) * 0.03 +
          (motion.windup ? 0.06 : 0)
        indicator.scale.setScalar(scale)
        indicatorMaterial.current?.color.set(
          motion.alert === 'alerted' ? colors.danger : colors.warning,
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
      <primitive
        object={actor}
        scale={0.6}
      />
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
}: {
  colors: WorldColors
  groupRef: (group: THREE.Group | null) => void
  healthRef: (mesh: THREE.Mesh | null) => void
  motion: BossMotion
}) {
  const localRef = useRef<THREE.Group>(null)
  const lastPosition = useRef(new THREE.Vector3())
  const auraRef = useRef<THREE.Mesh>(null)
  const auraMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const telegraphRef = useRef<THREE.Mesh>(null)
  const telegraphMaterial = useRef<THREE.MeshBasicMaterial>(null)
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
    mixer.update(delta)

    pulse.current += delta * (motion.phase >= 3 ? 8 : motion.phase === 2 ? 5.5 : 3.5)
    const aura = auraRef.current
    if (aura) {
      aura.visible = !motion.defeated
      const base = 1 + Math.sin(pulse.current) * 0.06
      aura.scale.setScalar(base + (motion.vulnerable ? 0.18 : 0))
      auraMaterial.current?.color.set(
        motion.vulnerable ? colors.success : phaseColor(motion.phase),
      )
      if (auraMaterial.current) {
        auraMaterial.current.opacity = motion.vulnerable ? 0.5 : 0.28
      }
    }
    const telegraph = telegraphRef.current
    if (telegraph) {
      const active = (motion.windup || motion.lunging) && !motion.defeated
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
      <primitive object={actor} scale={1.12} />
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
  })
  const cameraShake = useRef(0)
  const enemyGroups = useRef(new Map<string, THREE.Group>())
  const enemyHealthBars = useRef(new Map<string, THREE.Mesh>())
  const objectiveGroups = useRef(new Map<number, THREE.Group>())
  const enemies = useRef<EnemyRuntime[]>(
    enemyStarts.slice(0, modifiers.enemyCount).map((position, index) => ({
      id: `nanda-guard-${index + 1}`,
      position: position.clone(),
      hp: modifiers.enemyHealth,
      alive: true,
      defeatTimer: 0,
      brain: createGuardBrain(
        `nanda-guard-${index + 1}`,
        { x: position.x, z: position.z },
        patrolRouteFor(index, position),
        index % 2 === 0 ? 1 : -1,
      ),
    })),
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
        },
      ]),
    ),
  )
  const playerPosition = useRef(new THREE.Vector3(0, 0.85, 13.4))
  const bossGroup = useRef<THREE.Group | null>(null)
  const bossHealthBar = useRef<THREE.Mesh | null>(null)
  const bossBrain = useRef<BossBrain>(createBossBrain('nanda-captain'))
  const bossPosition = useRef(bossStart.clone())
  const bossHp = useRef(BOSS_MAX_HEALTH)
  const bossAlive = useRef(true)
  const bossDefeatTimer = useRef(0)
  const bossHitFlash = useRef(0)
  const bossMotion = useRef<BossMotion>({
    moving: false,
    windup: false,
    lunging: false,
    vulnerable: false,
    defeated: false,
    phase: 1,
  })
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

    const step = Math.min(delta, 0.05)
    cameraShake.current = Math.max(0, cameraShake.current - step * 1.8)
    elapsedSeconds.current += step
    attackCooldown.current = Math.max(0, attackCooldown.current - step)
    attackAnimation.current = Math.max(0, attackAnimation.current - step)
    hurtAnimation.current = Math.max(0, hurtAnimation.current - step)
    healCooldown.current = Math.max(0, healCooldown.current - step)
    footstepTimer.current = Math.max(0, footstepTimer.current - step)
    landedTimer.current = Math.max(0, landedTimer.current - step)

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
        modifiers.moveSpeed * step,
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
      let nearest: EnemyRuntime | undefined
      let nearestDistance = Number.POSITIVE_INFINITY
      for (const enemy of enemies.current) {
        if (!enemy.alive) {
          continue
        }
        const distance = enemy.position.distanceTo(playerPosition.current)
        if (distance < nearestDistance) {
          nearest = enemy
          nearestDistance = distance
        }
      }
      if (nearest && nearestDistance <= 2.25) {
        nearest.hp -= modifiers.attackDamage
        onSound('impact')
        cameraShake.current = Math.max(cameraShake.current, 0.1)
        if (nearest.hp <= 0) {
          nearest.alive = false
          nearest.defeatTimer = 0.9
          guardsDefeated.current += 1
          onSound('defeat')
        }
      }

      // The captain shares the same swing: hit it if it is in reach, with a
      // damage bonus while it is in its post-lunge vulnerable recovery.
      if (bossAlive.current) {
        const bossReach = Math.hypot(
          bossPosition.current.x - playerPosition.current.x,
          bossPosition.current.z - playerPosition.current.z,
        )
        if (bossReach <= 2.6) {
          const bonus = bossMotion.current.vulnerable ? 1.8 : 1
          bossHp.current -= modifiers.attackDamage * bonus
          bossHitFlash.current = 0.12
          onSound('impact')
          cameraShake.current = Math.max(cameraShake.current, 0.12)
          if (bossHp.current <= 0) {
            bossHp.current = 0
            bossAlive.current = false
            bossDefeatTimer.current = 1.4
            onSound('defeat')
          }
        }
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
      const intent = updateGuardBrain(
        enemy.brain,
        {
          guard: { x: enemy.position.x, z: enemy.position.z },
          facingYaw: group.rotation.y,
          player: {
            x: playerPosition.current.x,
            z: playerPosition.current.z,
          },
          playerNoise: heroNoise,
          healthFraction: clamp01(enemy.hp / modifiers.enemyHealth),
        },
        GUARD_PERCEPTION,
        step,
      )

      if (intent.alert === 'alerted') {
        anyAlerted = true
      } else if (intent.alert === 'suspicious') {
        anySuspicious = true
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
      // retreating during the wind-up dodges the blow.
      if (intent.strike) {
        const reach = Math.hypot(
          playerPosition.current.x - enemy.position.x,
          playerPosition.current.z - enemy.position.z,
        )
        if (reach <= GUARD_PERCEPTION.attackRange + 0.25) {
          hurtAnimation.current = 0.32
          health.current = Math.max(0, health.current - 9)
          onSound('hurt')
          cameraShake.current = Math.max(cameraShake.current, 0.17)
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
      }

      if (healthBar) {
        const ratio = clamp01(enemy.hp / modifiers.enemyHealth)
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
            healthFraction: clamp01(bossHp.current / BOSS_MAX_HEALTH),
            damaged: bossHitFlash.current > 0,
          },
          BOSS_CONFIG,
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
          if (reach <= BOSS_CONFIG.lungeRange + 0.4) {
            hurtAnimation.current = 0.36
            health.current = Math.max(0, health.current - bossIntent.damage)
            onSound('hurt')
            cameraShake.current = Math.max(
              cameraShake.current,
              bossIntent.lunging ? 0.3 : 0.22,
            )
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
      }

      const bossBar = bossHealthBar.current
      if (bossBar) {
        const ratio = clamp01(bossHp.current / BOSS_MAX_HEALTH)
        bossBar.scale.x = ratio
        bossBar.position.x = -0.75 + (ratio * 1.5) / 2
      }
    }

    objectivePositions.forEach((position, index) => {
      if (collectedObjectives.current.has(index)) {
        return
      }
      const marker = objectiveGroups.current.get(index)
      if (
        position.distanceTo(playerPosition.current) <= 1.35 ||
        (Math.abs(position.x - playerPosition.current.x) <= 1.2 &&
          Math.abs(position.z - playerPosition.current.z) <= 1.2 &&
          Math.abs(position.y - playerPosition.current.y) <= 1.8)
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
    const readyAtGate =
      objectivesSecured >= modifiers.requiredObjectives &&
      !bossAlive.current &&
      gateDistance <= 2.4
    if (controls.interact && !interactLatch.current && readyAtGate) {
      onSound('gate')
      cameraShake.current = 0.24
      emitResult(true)
    }
    interactLatch.current = controls.interact

    if (health.current <= 0) {
      emitResult(false)
    }

    hudClock.current += step
    if (hudClock.current >= 0.12) {
      hudClock.current = 0
      const bossThreat = bossAlive.current && bossEngagedNow
      const prompt =
        bossThreat
          ? bossMotion.current.vulnerable
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
        bossMaxHealth: BOSS_MAX_HEALTH,
        bossPhase: bossMotion.current.phase,
        bossDefeated: !bossAlive.current,
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
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
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
      />
      <CameraRig target={heroRef} shakeRef={cameraShake} />
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
            }
          }
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
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <MissionScene {...props} />
      </Canvas>
    </div>
  )
}
