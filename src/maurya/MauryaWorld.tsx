import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from '@react-three/fiber'
import * as THREE from 'three'
import type { CampaignState, WarResult } from './types'

export type WorldFocus =
  | 'capital'
  | 'farm'
  | 'market'
  | 'barracks'
  | 'fort'
  | 'army'
  | 'council'

type WorldColors = {
  background: string
  ground: string
  river: string
  earth: string
  wood: string
  stone: string
  accent: string
  enemy: string
  surface: string
}

type MauryaWorldProps = {
  state: CampaignState
  focus: WorldFocus
  onFocus: (focus: WorldFocus) => void
  lowTier: boolean
  mode: 'world' | 'battle'
  battlePaused: boolean
  onBattleFinished: () => void
}

const useWorldColors = (): WorldColors =>
  useMemo(() => {
    const styles = getComputedStyle(document.documentElement)
    const color = (name: string) => styles.getPropertyValue(name).trim()
    return {
      background: color('--cp-bg-elevated'),
      ground: color('--cp-success'),
      river: color('--cp-link'),
      earth: color('--cp-warning'),
      wood: color('--cp-text-muted'),
      stone: color('--cp-border-strong'),
      accent: color('--cp-accent'),
      enemy: color('--cp-text'),
      surface: color('--cp-surface'),
    }
  }, [])

const focusTargets: Record<
  WorldFocus,
  { position: THREE.Vector3; lookAt: THREE.Vector3 }
> = {
  capital: {
    position: new THREE.Vector3(8.5, 8, 9),
    lookAt: new THREE.Vector3(2.2, 0, 0),
  },
  farm: {
    position: new THREE.Vector3(-1, 6, 7),
    lookAt: new THREE.Vector3(-3.8, 0, 2.8),
  },
  market: {
    position: new THREE.Vector3(7, 5.5, 7),
    lookAt: new THREE.Vector3(4.8, 0, 2.6),
  },
  barracks: {
    position: new THREE.Vector3(8, 5.5, 4),
    lookAt: new THREE.Vector3(4.8, 0, -2.8),
  },
  fort: {
    position: new THREE.Vector3(-4, 6.5, 5),
    lookAt: new THREE.Vector3(-6, 0, -2),
  },
  army: {
    position: new THREE.Vector3(1, 5.5, 8),
    lookAt: new THREE.Vector3(-0.5, 0, -3.6),
  },
  council: {
    position: new THREE.Vector3(6.5, 4.2, 5.2),
    lookAt: new THREE.Vector3(3.2, 0.5, 1.2),
  },
}

function CameraRig({ focus }: { focus: WorldFocus }) {
  const { camera, invalidate } = useThree()
  const lookAt = useRef(new THREE.Vector3(1, 0, 0))
  const moving = useRef(true)

  useEffect(() => {
    moving.current = true
    invalidate()
  }, [focus, invalidate])

  useFrame(() => {
    if (!moving.current) {
      return
    }
    const target = focusTargets[focus]
    camera.position.lerp(target.position, 0.085)
    lookAt.current.lerp(target.lookAt, 0.095)
    camera.lookAt(lookAt.current)
    const settled =
      camera.position.distanceTo(target.position) < 0.035 &&
      lookAt.current.distanceTo(target.lookAt) < 0.035
    moving.current = !settled
    if (!settled) {
      invalidate()
    }
  })

  return null
}

function TreeField({ colors, lowTier }: { colors: WorldColors; lowTier: boolean }) {
  const trunks = useRef<THREE.InstancedMesh>(null)
  const crowns = useRef<THREE.InstancedMesh>(null)
  const positions = useMemo(() => {
    const count = lowTier ? 18 : 32
    return Array.from({ length: count }, (_, index) => {
      const side = index % 2 === 0 ? -1 : 1
      return new THREE.Vector3(
        side * (6.2 + ((index * 1.7) % 2.1)),
        0,
        -5.2 + ((index * 2.37) % 10.5),
      )
    })
  }, [lowTier])

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    positions.forEach((position, index) => {
      dummy.position.set(position.x, 0.35, position.z)
      dummy.scale.set(1, 1 + (index % 3) * 0.16, 1)
      dummy.updateMatrix()
      trunks.current?.setMatrixAt(index, dummy.matrix)
      dummy.position.y = 1.05
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      crowns.current?.setMatrixAt(index, dummy.matrix)
    })
    if (trunks.current) {
      trunks.current.instanceMatrix.needsUpdate = true
    }
    if (crowns.current) {
      crowns.current.instanceMatrix.needsUpdate = true
    }
  }, [positions])

  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, positions.length]}>
        <cylinderGeometry args={[0.09, 0.13, 0.7, 6]} />
        <meshStandardMaterial color={colors.wood} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, positions.length]}>
        <coneGeometry args={[0.48, 1.2, 7]} />
        <meshStandardMaterial color={colors.ground} />
      </instancedMesh>
    </group>
  )
}

function River({ colors }: { colors: WorldColors }) {
  return (
    <group position={[-2.4, 0.035, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, -0.09]}>
        <planeGeometry args={[2.2, 15]} />
        <meshStandardMaterial
          color={colors.river}
          roughness={0.32}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[0.65, 0.01, 3.8]} rotation={[-Math.PI / 2, 0, 0.24]}>
        <planeGeometry args={[1.6, 5]} />
        <meshStandardMaterial color={colors.river} />
      </mesh>
    </group>
  )
}

function Palisade({ colors }: { colors: WorldColors }) {
  const posts = useMemo(() => {
    const values: Array<[number, number]> = []
    for (let x = -2.5; x <= 2.5; x += 0.5) {
      values.push([x, -1.65], [x, 1.65])
    }
    for (let z = -1.15; z <= 1.15; z += 0.5) {
      values.push([-2.75, z], [2.75, z])
    }
    return values
  }, [])

  return (
    <group>
      {posts.map(([x, z], index) => (
        <mesh key={`${x}-${z}-${index}`} position={[x, 0.48, z]}>
          <cylinderGeometry args={[0.1, 0.12, 0.95, 6]} />
          <meshStandardMaterial color={colors.wood} />
        </mesh>
      ))}
    </group>
  )
}

function Capital({
  colors,
  selected,
  onFocus,
}: {
  colors: WorldColors
  selected: boolean
  onFocus: () => void
}) {
  return (
    <group
      position={[2.5, 0, 0]}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        onFocus()
      }}
    >
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[5.7, 0.16, 3.5]} />
        <meshStandardMaterial color={colors.earth} />
      </mesh>
      <Palisade colors={colors} />
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[1.8, 1.25, 1.2]} />
        <meshStandardMaterial color={colors.surface} />
      </mesh>
      <mesh position={[0, 1.62, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.2, 0.65, 4]} />
        <meshStandardMaterial color={colors.accent} />
      </mesh>
      <mesh position={[-1.55, 0.48, 0.55]}>
        <boxGeometry args={[1.1, 0.8, 0.75]} />
        <meshStandardMaterial color={colors.surface} />
      </mesh>
      <mesh position={[1.5, 0.48, -0.6]}>
        <boxGeometry args={[1.1, 0.8, 0.75]} />
        <meshStandardMaterial color={colors.surface} />
      </mesh>
      {selected ? (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.05, 3.2, 48]} />
          <meshBasicMaterial color={colors.accent} />
        </mesh>
      ) : null}
    </group>
  )
}

function Farm({
  level,
  colors,
  selected,
  onFocus,
}: {
  level: number
  colors: WorldColors
  selected: boolean
  onFocus: () => void
}) {
  return (
    <group
      position={[-4.2, 0, 2.6]}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        onFocus()
      }}
    >
      {Array.from({ length: Math.max(1, level * 3) }, (_, index) => (
        <mesh
          key={index}
          position={[(index % 3) * 0.55, 0.08, Math.floor(index / 3) * 0.5]}
        >
          <boxGeometry args={[0.42, 0.16, 0.36]} />
          <meshStandardMaterial color={colors.earth} />
        </mesh>
      ))}
      <mesh position={[0.55, 0.42, -0.45]}>
        <coneGeometry args={[0.42, 0.75, 6]} />
        <meshStandardMaterial color={colors.surface} />
      </mesh>
      {selected ? (
        <mesh position={[0.55, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.25, 1.38, 36]} />
          <meshBasicMaterial color={colors.accent} />
        </mesh>
      ) : null}
    </group>
  )
}

function Market({
  level,
  colors,
  selected,
  onFocus,
}: {
  level: number
  colors: WorldColors
  selected: boolean
  onFocus: () => void
}) {
  return (
    <group
      position={[5.1, 0, 2.7]}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        onFocus()
      }}
    >
      {Array.from({ length: Math.max(1, level * 2) }, (_, index) => (
        <group key={index} position={[(index % 2) * 0.8, 0, 0]}>
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[0.65, 0.7, 0.65]} />
            <meshStandardMaterial color={colors.surface} />
          </mesh>
          <mesh position={[0, 0.82, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.52, 0.4, 4]} />
            <meshStandardMaterial color={colors.accent} />
          </mesh>
        </group>
      ))}
      {selected ? (
        <mesh position={[0.35, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.05, 1.18, 36]} />
          <meshBasicMaterial color={colors.accent} />
        </mesh>
      ) : null}
    </group>
  )
}

function Barracks({
  level,
  colors,
  selected,
  onFocus,
}: {
  level: number
  colors: WorldColors
  selected: boolean
  onFocus: () => void
}) {
  return (
    <group
      position={[4.9, 0, -2.8]}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        onFocus()
      }}
    >
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[1.75 + level * 0.35, 0.9, 1.1]} />
        <meshStandardMaterial color={colors.wood} />
      </mesh>
      <mesh position={[0, 1.05, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.05 + level * 0.15, 0.5, 4]} />
        <meshStandardMaterial color={colors.accent} />
      </mesh>
      {selected ? (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.45, 1.58, 36]} />
          <meshBasicMaterial color={colors.accent} />
        </mesh>
      ) : null}
    </group>
  )
}

function Fort({
  level,
  colors,
  selected,
  onFocus,
}: {
  level: number
  colors: WorldColors
  selected: boolean
  onFocus: () => void
}) {
  return (
    <group
      position={[-6, 0, -2.1]}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        onFocus()
      }}
    >
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.5 + level * 0.3, 0.84, 1.35]} />
        <meshStandardMaterial color={colors.stone} />
      </mesh>
      {[
        [-0.75, -0.68],
        [0.75, -0.68],
        [-0.75, 0.68],
        [0.75, 0.68],
      ].map(([x, z], index) => (
        <mesh key={index} position={[x, 0.75, z]}>
          <cylinderGeometry args={[0.24, 0.28, 1.5, 8]} />
          <meshStandardMaterial color={colors.wood} />
        </mesh>
      ))}
      {selected ? (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.45, 1.58, 36]} />
          <meshBasicMaterial color={colors.accent} />
        </mesh>
      ) : null}
    </group>
  )
}

function HeroFigure({
  role,
  position,
  colors,
  selected,
  onFocus,
}: {
  role: 'chandragupta' | 'kautilya'
  position: [number, number, number]
  colors: WorldColors
  selected: boolean
  onFocus: () => void
}) {
  const isKautilya = role === 'kautilya'
  return (
    <group
      position={position}
      scale={selected ? 1.14 : 1}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        onFocus()
      }}
    >
      <mesh position={[0, 0.52, 0]}>
        <cylinderGeometry args={[0.22, 0.3, 0.85, 8]} />
        <meshStandardMaterial color={isKautilya ? colors.earth : colors.accent} />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <sphereGeometry args={[0.24, 12, 12]} />
        <meshStandardMaterial color={colors.surface} />
      </mesh>
      <mesh position={[0, 1.38, 0]} rotation={[0, 0, isKautilya ? 0 : Math.PI]}>
        <coneGeometry args={[isKautilya ? 0.12 : 0.3, 0.35, 8]} />
        <meshStandardMaterial color={isKautilya ? colors.wood : colors.accent} />
      </mesh>
      {isKautilya ? (
        <mesh position={[0.34, 0.63, 0]} rotation={[0, 0, 0.08]}>
          <cylinderGeometry args={[0.025, 0.025, 1.35, 6]} />
          <meshStandardMaterial color={colors.wood} />
        </mesh>
      ) : null}
    </group>
  )
}

function ArmyCamp({
  state,
  colors,
  selected,
  onFocus,
}: {
  state: CampaignState
  colors: WorldColors
  selected: boolean
  onFocus: () => void
}) {
  const visibleUnits = Math.min(
    18,
    Object.values(state.army).reduce((total, value) => total + value, 0) * 2,
  )
  return (
    <group
      position={[-0.4, 0, -3.8]}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        onFocus()
      }}
    >
      {Array.from({ length: visibleUnits }, (_, index) => (
        <mesh
          key={index}
          position={[
            (index % 6) * 0.32 - 0.8,
            0.25,
            Math.floor(index / 6) * 0.38,
          ]}
        >
          <boxGeometry args={[0.18, 0.5, 0.18]} />
          <meshStandardMaterial color={colors.accent} />
        </mesh>
      ))}
      {Array.from({ length: Math.min(3, state.army.elephants) }, (_, index) => (
        <group key={`elephant-${index}`} position={[1.35 + index * 0.55, 0, 0.25]}>
          <mesh position={[0, 0.42, 0]}>
            <boxGeometry args={[0.52, 0.65, 0.75]} />
            <meshStandardMaterial color={colors.stone} />
          </mesh>
          <mesh position={[0, 0.72, -0.43]}>
            <sphereGeometry args={[0.25, 8, 8]} />
            <meshStandardMaterial color={colors.stone} />
          </mesh>
        </group>
      ))}
      <mesh position={[0.45, 0.45, -0.9]}>
        <coneGeometry args={[0.65, 0.9, 4]} />
        <meshStandardMaterial color={colors.surface} />
      </mesh>
      {selected ? (
        <mesh position={[0.3, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.05, 2.2, 40]} />
          <meshBasicMaterial color={colors.accent} />
        </mesh>
      ) : null}
    </group>
  )
}

function WorldScene({
  state,
  focus,
  onFocus,
  lowTier,
  colors,
}: {
  state: CampaignState
  focus: WorldFocus
  onFocus: (focus: WorldFocus) => void
  lowTier: boolean
  colors: WorldColors
}) {
  return (
    <>
      <color attach="background" args={[colors.background]} />
      <ambientLight intensity={1.65} />
      <directionalLight
        position={[6, 10, 5]}
        intensity={2.2}
        castShadow={!lowTier}
      />
      <CameraRig focus={focus} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={!lowTier}>
        <planeGeometry args={[18, 14, 1, 1]} />
        <meshStandardMaterial color={colors.ground} roughness={0.95} />
      </mesh>
      <River colors={colors} />
      <TreeField colors={colors} lowTier={lowTier} />
      <Capital
        colors={colors}
        selected={focus === 'capital'}
        onFocus={() => onFocus('capital')}
      />
      <Farm
        level={state.buildings.farm}
        colors={colors}
        selected={focus === 'farm'}
        onFocus={() => onFocus('farm')}
      />
      <Market
        level={state.buildings.market}
        colors={colors}
        selected={focus === 'market'}
        onFocus={() => onFocus('market')}
      />
      <Barracks
        level={state.buildings.barracks}
        colors={colors}
        selected={focus === 'barracks'}
        onFocus={() => onFocus('barracks')}
      />
      <Fort
        level={state.buildings.fort}
        colors={colors}
        selected={focus === 'fort'}
        onFocus={() => onFocus('fort')}
      />
      <ArmyCamp
        state={state}
        colors={colors}
        selected={focus === 'army'}
        onFocus={() => onFocus('army')}
      />
      <HeroFigure
        role="chandragupta"
        position={[3.05, 0, 1.18]}
        colors={colors}
        selected={focus === 'council'}
        onFocus={() => onFocus('council')}
      />
      <HeroFigure
        role="kautilya"
        position={[3.55, 0, 1.1]}
        colors={colors}
        selected={focus === 'council'}
        onFocus={() => onFocus('council')}
      />
    </>
  )
}

const formationPositions = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    x: (index % 6) * 0.48 - 1.2,
    z: Math.floor(index / 6) * 0.55,
  }))

function BattleScene({
  state,
  paused,
  onFinished,
  colors,
}: {
  state: CampaignState
  paused: boolean
  onFinished: () => void
  colors: WorldColors
}) {
  const player = useRef<THREE.InstancedMesh>(null)
  const enemy = useRef<THREE.InstancedMesh>(null)
  const progress = useRef(0)
  const completed = useRef(false)
  const { invalidate } = useThree()
  const playerCount = Math.min(
    24,
    Math.max(
      10,
      Object.values(state.army).reduce((total, value) => total + value, 0) * 3,
    ),
  )
  const enemyCount = Math.min(26, Math.max(12, state.threat * 3))
  const playerPositions = useMemo(
    () => formationPositions(playerCount),
    [playerCount],
  )
  const enemyPositions = useMemo(
    () => formationPositions(enemyCount),
    [enemyCount],
  )

  const updateInstances = (
    mesh: THREE.InstancedMesh | null,
    positions: readonly { x: number; z: number }[],
    side: 'player' | 'enemy',
    value: number,
    result: WarResult,
  ) => {
    if (!mesh) {
      return
    }
    const dummy = new THREE.Object3D()
    const direction = side === 'player' ? 1 : -1
    const approach = Math.min(1, value / 0.62)
    const startZ = direction * 4.8
    let centerZ = THREE.MathUtils.lerp(startZ, direction * 0.75, approach)
    if (value > 0.68) {
      const retreat = (value - 0.68) / 0.32
      const playerLoses = result === 'setback'
      const retreats =
        (side === 'player' && playerLoses) ||
        (side === 'enemy' && !playerLoses)
      if (retreats) {
        centerZ += direction * retreat * 4.2
      }
    }
    positions.forEach((position, index) => {
      dummy.position.set(
        side === 'player' ? position.x : -position.x,
        0.28,
        centerZ + position.z * direction,
      )
      dummy.rotation.y = side === 'player' ? Math.PI : 0
      const pulse = value > 0.48 && value < 0.72 && index % 3 === 0 ? 1.25 : 1
      dummy.scale.set(1, pulse, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }

  useLayoutEffect(() => {
    const result = state.warResult ?? 'costly-victory'
    updateInstances(player.current, playerPositions, 'player', 0, result)
    updateInstances(enemy.current, enemyPositions, 'enemy', 0, result)
    invalidate()
  }, [enemyPositions, invalidate, playerPositions, state.warResult])

  useFrame((_, delta) => {
    if (paused || completed.current || !state.warResult) {
      return
    }
    progress.current = Math.min(1, progress.current + delta / 11)
    updateInstances(
      player.current,
      playerPositions,
      'player',
      progress.current,
      state.warResult,
    )
    updateInstances(
      enemy.current,
      enemyPositions,
      'enemy',
      progress.current,
      state.warResult,
    )
    if (progress.current >= 1) {
      completed.current = true
      onFinished()
      return
    }
    invalidate()
  })

  return (
    <>
      <color attach="background" args={[colors.background]} />
      <ambientLight intensity={1.8} />
      <directionalLight position={[4, 9, 6]} intensity={2.4} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial color={colors.earth} roughness={1} />
      </mesh>
      <instancedMesh ref={player} args={[undefined, undefined, playerCount]}>
        <boxGeometry args={[0.25, 0.56, 0.25]} />
        <meshStandardMaterial color={colors.accent} />
      </instancedMesh>
      <instancedMesh ref={enemy} args={[undefined, undefined, enemyCount]}>
        <boxGeometry args={[0.25, 0.56, 0.25]} />
        <meshStandardMaterial color={colors.enemy} />
      </instancedMesh>
      <mesh position={[-3.7, 0.8, 4.5]}>
        <boxGeometry args={[0.12, 1.6, 0.12]} />
        <meshStandardMaterial color={colors.wood} />
      </mesh>
      <mesh position={[-3.7, 1.42, 4.5]}>
        <planeGeometry args={[0.8, 0.48]} />
        <meshBasicMaterial color={colors.accent} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[3.7, 0.8, -4.5]}>
        <boxGeometry args={[0.12, 1.6, 0.12]} />
        <meshStandardMaterial color={colors.wood} />
      </mesh>
      <mesh position={[3.7, 1.42, -4.5]}>
        <planeGeometry args={[0.8, 0.48]} />
        <meshBasicMaterial color={colors.enemy} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

export function MauryaWorld({
  state,
  focus,
  onFocus,
  lowTier,
  mode,
  battlePaused,
  onBattleFinished,
}: MauryaWorldProps) {
  const colors = useWorldColors()
  return (
    <Canvas
      dpr={lowTier ? 1 : [1, 1.5]}
      frameloop="demand"
      shadows={!lowTier}
      camera={{ position: [8.5, 8, 9], fov: 46, near: 0.1, far: 80 }}
      gl={{
        antialias: !lowTier,
        powerPreference: 'high-performance',
      }}
    >
      {mode === 'battle' ? (
        <BattleScene
          state={state}
          paused={battlePaused}
          onFinished={onBattleFinished}
          colors={colors}
        />
      ) : (
        <WorldScene
          state={state}
          focus={focus}
          onFocus={onFocus}
          lowTier={lowTier}
          colors={colors}
        />
      )}
    </Canvas>
  )
}
