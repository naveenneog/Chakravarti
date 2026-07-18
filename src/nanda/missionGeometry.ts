/**
 * Pure mission geometry for The Timber Gate — terrain height and collision.
 *
 * Extracted verbatim from NandaMission.tsx so it can be characterization-tested
 * without three.js. Behaviour must not change: these functions are pinned by
 * missionGeometry.test.ts. When the mission becomes data-driven, a chapter's
 * ActionMissionDefinition can supply its own geometry, but The Timber Gate keeps
 * exactly these rules.
 *
 * Invariants to preserve:
 * - Two rooftops at height 2.4 over x in [-9,-6], z in [-8,-1.1] and [1.1,8].
 * - A ramp up to the north roof over x in [-6,-3.5], z in [4,8].
 * - Play bounds x in [-9.6,9.6], z in [-15.2,15.2].
 * - The wall runs along the gate line |z| < 0.62 and blocks a grounded hero
 *   (playerY < 2.2) except through the side gate (x in [5.9,8.1] when open) or
 *   over the roof (x in [-9.2,-5.8]).
 */

export const floorHeightAt = (x: number, z: number): number => {
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

export const isBlocked = (
  x: number,
  z: number,
  playerY: number,
  sideGateOpen: boolean,
): boolean => {
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
