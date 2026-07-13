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
import {
  type NandaMissionControls,
  type NandaMissionHud,
} from './missionTypes'
import type { MissionModifiers, MissionResult } from './types'

type NandaMissionProps = {
  controlsRef: RefObject<NandaMissionControls>
  modifiers: MissionModifiers
  paused: boolean
  resetToken: number
  onHudChange: (hud: NandaMissionHud) => void
  onComplete: (result: MissionResult) => void
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
  attackCooldown: number
}

type HeroMotion = {
  moving: boolean
  attacking: boolean
  airborne: boolean
}

const readWorldColors = (): WorldColors => {
  const styles = getComputedStyle(document.documentElement)
  const read = (name: string) => styles.getPropertyValue(name).trim()
  return {
    background: read('--cp-bg'),
    ground: read('--cp-surface'),
    groundSoft: read('--cp-surface-soft'),
    wall: read('--cp-border-strong'),
    wallDark: read('--cp-text-muted'),
    text: read('--cp-text'),
    muted: read('--cp-text-soft'),
    accent: read('--cp-accent'),
    accentHover: read('--cp-accent-hover'),
    success: read('--cp-success'),
    danger: read('--cp-danger'),
    warning: read('--cp-warning'),
    water: read('--cp-link'),
  }
}

const floorHeightAt = (x: number, z: number) => {
  const onNorthRoof = x >= -9 && x <= -6 && z >= -8 && z <= -1.1
  const onSouthRoof = x >= -9 && x <= -6 && z >= 1.1 && z <= 8
  if (onNorthRoof || onSouthRoof) {
    return 2.4
  }
  const onRamp = x >= -6 && x <= -3.5 && z >= 4 && z <= 8
  if (onRamp) {
    return ((-x - 3.5) / 2.5) * 2.4
  }
  return 0
}

const isBlocked = (
  x: number,
  z: number,
  playerY: number,
  sideGateOpen: boolean,
) => {
  if (x < -9.6 || x > 9.6 || z < -15.2 || z > 15.2) {
    return true
  }
  if (Math.abs(z) < 0.62 && playerY < 2.2) {
    const throughSideGate = sideGateOpen && x >= 5.9 && x <= 8.1
    const overRoof = x >= -9.2 && x <= -5.8
    return !throughSideGate && !overRoof
  }
  return false
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

function useKeyboardControls(controlsRef: RefObject<NandaMissionControls>) {
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
  }, [controlsRef])
}

function CameraRig({ target }: { target: RefObject<THREE.Group | null> }) {
  const { camera } = useThree()
  const desired = useMemo(() => new THREE.Vector3(), [])
  const lookAt = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const player = target.current
    if (!player) {
      return
    }
    desired.set(
      player.position.x,
      player.position.y + 4.15,
      player.position.z + 6.25,
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
  const cityPosts = Array.from({ length: 11 }, (_, index) => -10 + index * 2)
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
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
    './models/cc0/kenney-nature/tree_oak.glb',
  ).scene
  const bushSource = useLoader(
    GLTFLoader,
    './models/cc0/kenney-nature/plant_bushLarge.glb',
  ).scene
  const jarSource = useLoader(
    GLTFLoader,
    './models/nanda/mauryan-storage-jar.glb',
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

function HeroFigure({
  colors,
  heroRef,
  motionRef,
}: {
  colors: WorldColors
  heroRef: RefObject<THREE.Group | null>
  motionRef: RefObject<HeroMotion>
}) {
  const bodyRef = useRef<THREE.Group>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const leftLegRef = useRef<THREE.Group>(null)
  const rightLegRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const motion = motionRef.current
    const body = bodyRef.current
    const leftArm = leftArmRef.current
    const rightArm = rightArmRef.current
    const leftLeg = leftLegRef.current
    const rightLeg = rightLegRef.current
    if (!motion || !body || !leftArm || !rightArm || !leftLeg || !rightLeg) {
      return
    }
    const stride = motion.moving
      ? Math.sin(clock.elapsedTime * 10.5) * 0.72
      : Math.sin(clock.elapsedTime * 2.2) * 0.05
    leftLeg.rotation.x = stride
    rightLeg.rotation.x = -stride
    leftArm.rotation.x = -stride * 0.7
    rightArm.rotation.x = motion.attacking
      ? -1.8 + Math.sin(clock.elapsedTime * 28) * 0.5
      : stride * 0.7
    rightArm.rotation.z = motion.attacking ? -0.75 : -0.08
    body.position.y = motion.airborne
      ? 0.08
      : motion.moving
        ? Math.abs(Math.sin(clock.elapsedTime * 10.5)) * 0.07
        : 0
    body.rotation.z = motion.moving ? Math.sin(clock.elapsedTime * 10.5) * 0.025 : 0
  })

  return (
    <group ref={heroRef}>
      <group ref={bodyRef}>
        <mesh position={[0, 0.82, 0]}>
          <boxGeometry args={[0.78, 0.92, 0.42]} />
          <meshStandardMaterial color={colors.accent} roughness={0.82} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <coneGeometry args={[0.52, 0.95, 6]} />
          <meshStandardMaterial color={colors.accentHover} roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.48, 0]}>
          <sphereGeometry args={[0.31, 14, 12]} />
          <meshStandardMaterial color={colors.warning} roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.69, -0.02]} scale={[1.02, 0.5, 1.02]}>
          <sphereGeometry args={[0.32, 12, 8]} />
          <meshStandardMaterial color={colors.text} roughness={0.95} />
        </mesh>
        <mesh position={[0.22, 1.76, -0.08]} rotation={[0, 0, -0.65]}>
          <coneGeometry args={[0.12, 0.42, 8]} />
          <meshStandardMaterial color={colors.text} roughness={0.95} />
        </mesh>
        <mesh position={[-0.16, 0.9, 0.27]} rotation={[0.12, 0, 0.12]}>
          <boxGeometry args={[0.2, 1.28, 0.08]} />
          <meshStandardMaterial color={colors.groundSoft} roughness={0.88} />
        </mesh>
        <group ref={leftArmRef} position={[-0.49, 1.16, 0]}>
          <mesh position={[0, -0.38, 0]}>
            <capsuleGeometry args={[0.11, 0.58, 4, 8]} />
            <meshStandardMaterial color={colors.warning} roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.74, 0]}>
            <sphereGeometry args={[0.12, 8, 6]} />
            <meshStandardMaterial color={colors.warning} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.49, 1.16, 0]}>
          <mesh position={[0, -0.38, 0]}>
            <capsuleGeometry args={[0.11, 0.58, 4, 8]} />
            <meshStandardMaterial color={colors.warning} roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.76, 0]}>
            <sphereGeometry args={[0.12, 8, 6]} />
            <meshStandardMaterial color={colors.warning} />
          </mesh>
          <mesh position={[0, -1.15, 0]} rotation={[0, 0, 0.08]}>
            <boxGeometry args={[0.08, 0.9, 0.1]} />
            <meshStandardMaterial
              color={colors.text}
              metalness={0.55}
              roughness={0.35}
            />
          </mesh>
          <mesh position={[0, -0.7, 0]}>
            <boxGeometry args={[0.35, 0.08, 0.13]} />
            <meshStandardMaterial color={colors.warning} metalness={0.25} />
          </mesh>
        </group>
        <group ref={leftLegRef} position={[-0.2, 0.05, 0]}>
          <mesh position={[0, -0.43, 0]}>
            <capsuleGeometry args={[0.13, 0.62, 4, 8]} />
            <meshStandardMaterial color={colors.warning} roughness={0.92} />
          </mesh>
          <mesh position={[0, -0.82, -0.08]}>
            <boxGeometry args={[0.25, 0.12, 0.42]} />
            <meshStandardMaterial color={colors.wallDark} roughness={0.95} />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[0.2, 0.05, 0]}>
          <mesh position={[0, -0.43, 0]}>
            <capsuleGeometry args={[0.13, 0.62, 4, 8]} />
            <meshStandardMaterial color={colors.warning} roughness={0.92} />
          </mesh>
          <mesh position={[0, -0.82, -0.08]}>
            <boxGeometry args={[0.25, 0.12, 0.42]} />
            <meshStandardMaterial color={colors.wallDark} roughness={0.95} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

function GuardFigure({
  colors,
  groupRef,
  healthRef,
}: {
  colors: WorldColors
  groupRef: (group: THREE.Group | null) => void
  healthRef: (mesh: THREE.Mesh | null) => void
}) {
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.68, 0.9, 0.4]} />
        <meshStandardMaterial color={colors.danger} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <coneGeometry args={[0.46, 0.85, 6]} />
        <meshStandardMaterial color={colors.wallDark} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.58, 0]}>
        <sphereGeometry args={[0.3, 10, 8]} />
        <meshStandardMaterial color={colors.warning} roughness={0.9} />
      </mesh>
      <mesh position={[-0.48, 0.95, 0]} rotation={[0, 0, 0.16]}>
        <boxGeometry args={[0.12, 1.15, 0.12]} />
        <meshStandardMaterial color={colors.text} />
      </mesh>
      <mesh position={[-0.2, 0.2, 0]}>
        <capsuleGeometry args={[0.12, 0.55, 4, 8]} />
        <meshStandardMaterial color={colors.warning} />
      </mesh>
      <mesh position={[0.2, 0.2, 0]}>
        <capsuleGeometry args={[0.12, 0.55, 4, 8]} />
        <meshStandardMaterial color={colors.warning} />
      </mesh>
      <mesh position={[0, 2.25, 0]}>
        <boxGeometry args={[0.82, 0.1, 0.1]} />
        <meshStandardMaterial color={colors.wallDark} />
      </mesh>
      <mesh ref={healthRef} position={[-0.41, 2.25, 0.03]}>
        <boxGeometry args={[0.82, 0.11, 0.12]} />
        <meshBasicMaterial color={colors.success} />
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
}: Omit<NandaMissionProps, 'resetToken'>) {
  const colors = useMemo(readWorldColors, [])
  const heroRef = useRef<THREE.Group>(null)
  const heroMotion = useRef<HeroMotion>({
    moving: false,
    attacking: false,
    airborne: false,
  })
  const enemyGroups = useRef(new Map<string, THREE.Group>())
  const enemyHealthBars = useRef(new Map<string, THREE.Mesh>())
  const objectiveGroups = useRef(new Map<number, THREE.Group>())
  const enemies = useRef<EnemyRuntime[]>(
    enemyStarts.slice(0, modifiers.enemyCount).map((position, index) => ({
      id: `nanda-guard-${index + 1}`,
      position: position.clone(),
      hp: modifiers.enemyHealth,
      alive: true,
      attackCooldown: 0.4 + index * 0.08,
    })),
  )
  const playerPosition = useRef(new THREE.Vector3(0, 0.85, 13.4))
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
    [modifiers, onComplete],
  )

  useFrame((_, delta) => {
    const hero = heroRef.current
    const controls = controlsRef.current
    if (!hero || !controls || paused || completionSent.current) {
      return
    }

    const step = Math.min(delta, 0.05)
    elapsedSeconds.current += step
    attackCooldown.current = Math.max(0, attackCooldown.current - step)
    attackAnimation.current = Math.max(0, attackAnimation.current - step)
    healCooldown.current = Math.max(0, healCooldown.current - step)

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
    }
    heroMotion.current.moving = moveDirection.lengthSq() > 0

    if (controls.jump && grounded.current && !jumpLatch.current) {
      verticalVelocity.current = modifiers.jumpForce
      grounded.current = false
      jumpLatch.current = true
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
      }
    } else {
      playerPosition.current.y = floor + 0.85
    }

    if (controls.attack && attackCooldown.current <= 0) {
      attackCooldown.current = 0.42
      attackAnimation.current = 0.34
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
        if (nearest.hp <= 0) {
          nearest.alive = false
          guardsDefeated.current += 1
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
    }

    for (const enemy of enemies.current) {
      const group = enemyGroups.current.get(enemy.id)
      const healthBar = enemyHealthBars.current.get(enemy.id)
      if (!group) {
        continue
      }
      group.visible = enemy.alive
      if (!enemy.alive) {
        continue
      }
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - step)
      toPlayer.copy(playerPosition.current).sub(enemy.position)
      const distance = toPlayer.length()
      if (distance < 8.2 && distance > 1.35) {
        toPlayer.y = 0
        toPlayer.normalize()
        candidate.copy(enemy.position).addScaledVector(toPlayer, 2.05 * step)
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
        }
      } else if (distance <= 1.55 && enemy.attackCooldown <= 0) {
        enemy.attackCooldown = 0.95
        health.current = Math.max(0, health.current - 9)
      }
      enemy.position.y = floorHeightAt(enemy.position.x, enemy.position.z)
      group.position.set(
        enemy.position.x,
        enemy.position.y,
        enemy.position.z,
      )
      group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z)
      if (healthBar) {
        const ratio = clamp01(enemy.hp / modifiers.enemyHealth)
        healthBar.scale.x = ratio
        healthBar.position.x = -0.41 + (ratio * 0.82) / 2
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
        if (marker) {
          marker.visible = false
        }
      }
    })

    hero.position.copy(playerPosition.current)
    heroMotion.current.attacking = attackAnimation.current > 0
    heroMotion.current.airborne = !grounded.current

    const objectivesSecured =
      modifiers.securedObjectives + collectedObjectives.current.size
    const gateDistance = Math.hypot(
      playerPosition.current.x,
      playerPosition.current.z + 12.4,
    )
    const readyAtGate =
      objectivesSecured >= modifiers.requiredObjectives && gateDistance <= 2.4
    if (controls.interact && !interactLatch.current && readyAtGate) {
      emitResult(true)
    }
    interactLatch.current = controls.interact

    if (health.current <= 0) {
      emitResult(false)
    }

    hudClock.current += step
    if (hudClock.current >= 0.12) {
      hudClock.current = 0
      const prompt =
        gateDistance <= 2.4
          ? objectivesSecured >= modifiers.requiredObjectives
            ? 'Open the timber gate'
            : 'Secure the dispatches before opening the gate'
          : controls.heal &&
              healingCharges.current === 0 &&
              health.current < modifiers.maxHealth
            ? 'No recovery charges remain'
            : 'Reach the marked dispatches, then the northern gate'
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
      })
    }
  })

  return (
    <>
      <color attach="background" args={[colors.background]} />
      <fog attach="fog" args={[colors.background, 16, 37]} />
      <ambientLight intensity={1.45} />
      <directionalLight position={[8, 14, 10]} intensity={2.1} />
      <directionalLight position={[-8, 6, -10]} intensity={0.65} />
      <PataliputraDistrict
        colors={colors}
        sideGateOpen={modifiers.sideGateOpen}
      />
      <OpenAssetProps colors={colors} />
      <HeroFigure
        colors={colors}
        heroRef={heroRef}
        motionRef={heroMotion}
      />
      <CameraRig target={heroRef} />
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
  useKeyboardControls(props.controlsRef)

  return (
    <div className="nanda-canvas" data-reset-token={props.resetToken}>
      <Canvas
        key={props.resetToken}
        camera={{ position: [0, 4.8, 19], fov: 58, near: 0.1, far: 80 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <MissionScene {...props} />
      </Canvas>
    </div>
  )
}
