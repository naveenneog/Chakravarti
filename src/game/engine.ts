import { kalingaScenario, positionKey } from './scenario'
import type {
  BattleResult,
  BattleState,
  Faction,
  Position,
  Scenario,
  Terrain,
  Unit,
} from './types'

const PLAYER_FACTION: Faction = 'maurya'
const ENEMY_FACTION: Faction = 'kalinga'

const cloneUnit = (unit: Unit): Unit => ({
  ...unit,
  position: { ...unit.position },
})

export const createBattleState = (
  scenario: Scenario = kalingaScenario,
): BattleState => ({
  scenario,
  turn: 1,
  phase: 'player',
  result: null,
  selectedUnitId: null,
  humanCost: 0,
  units: scenario.units.map(cloneUnit),
  log: ['The Mauryan turn begins. Select a unit, then tap a highlighted tile.'],
})

export const distance = (a: Position, b: Position) =>
  Math.abs(a.row - b.row) + Math.abs(a.col - b.col)

export const terrainAt = (scenario: Scenario, position: Position): Terrain =>
  scenario.terrain[positionKey(position.row, position.col)] ?? 'plain'

export const movementCost = (unit: Unit, terrain: Terrain) => {
  if (terrain === 'plain' || terrain === 'village') {
    return 1
  }

  if (terrain === 'river') {
    return unit.kind === 'elephant' ? 3 : 2
  }

  if (unit.kind === 'cavalry') {
    return 3
  }

  return 2
}

const inBounds = (scenario: Scenario, position: Position) =>
  position.row >= 0 &&
  position.col >= 0 &&
  position.row < scenario.rows &&
  position.col < scenario.cols

const neighbors = (position: Position): Position[] => [
  { row: position.row - 1, col: position.col },
  { row: position.row + 1, col: position.col },
  { row: position.row, col: position.col - 1 },
  { row: position.row, col: position.col + 1 },
]

const livingUnits = (state: BattleState) =>
  state.units.filter((unit) => unit.hp > 0)

const occupiedKeys = (state: BattleState, exceptUnitId?: string) =>
  new Set(
    livingUnits(state)
      .filter((unit) => unit.id !== exceptUnitId)
      .map((unit) => positionKey(unit.position.row, unit.position.col)),
  )

export const getReachableCells = (
  state: BattleState,
  unitId: string,
): Position[] => {
  const unit = state.units.find((candidate) => candidate.id === unitId)
  if (!unit || unit.hp <= 0 || unit.moved) {
    return []
  }

  const startKey = positionKey(unit.position.row, unit.position.col)
  const occupied = occupiedKeys(state, unit.id)
  const costs = new Map<string, number>([[startKey, 0]])
  const frontier: Array<{ position: Position; cost: number }> = [
    { position: unit.position, cost: 0 },
  ]

  while (frontier.length > 0) {
    frontier.sort((left, right) => left.cost - right.cost)
    const current = frontier.shift()
    if (!current) {
      break
    }

    for (const next of neighbors(current.position)) {
      const key = positionKey(next.row, next.col)
      if (!inBounds(state.scenario, next) || occupied.has(key)) {
        continue
      }

      const nextCost =
        current.cost + movementCost(unit, terrainAt(state.scenario, next))
      const knownCost = costs.get(key)
      if (nextCost > unit.move || (knownCost !== undefined && knownCost <= nextCost)) {
        continue
      }

      costs.set(key, nextCost)
      frontier.push({ position: next, cost: nextCost })
    }
  }

  return Array.from(costs.keys())
    .filter((key) => key !== startKey)
    .map((key) => {
      const [row, col] = key.split(':').map(Number)
      return { row, col }
    })
}

export const getAttackableUnitIds = (
  state: BattleState,
  unitId: string,
): string[] => {
  const attacker = state.units.find((unit) => unit.id === unitId)
  if (!attacker || attacker.hp <= 0 || attacker.acted) {
    return []
  }

  return state.units
    .filter(
      (target) =>
        target.hp > 0 &&
        target.faction !== attacker.faction &&
        distance(attacker.position, target.position) <= attacker.range,
    )
    .map((target) => target.id)
}

export const selectUnit = (
  state: BattleState,
  unitId: string,
): BattleState => {
  const unit = state.units.find((candidate) => candidate.id === unitId)
  if (
    state.phase !== 'player' ||
    !unit ||
    unit.hp <= 0 ||
    unit.faction !== PLAYER_FACTION
  ) {
    return state
  }

  return {
    ...state,
    selectedUnitId: unitId,
  }
}

export const moveSelectedUnit = (
  state: BattleState,
  position: Position,
): BattleState => {
  if (state.phase !== 'player' || !state.selectedUnitId) {
    return state
  }

  const selected = state.units.find(
    (unit) => unit.id === state.selectedUnitId,
  )
  const reachable = getReachableCells(state, state.selectedUnitId)
  const isReachable = reachable.some(
    (cell) => cell.row === position.row && cell.col === position.col,
  )

  if (!selected || selected.faction !== PLAYER_FACTION || !isReachable) {
    return state
  }

  return {
    ...state,
    units: state.units.map((unit) =>
      unit.id === selected.id
        ? { ...unit, position: { ...position }, moved: true }
        : unit,
    ),
    log: [...state.log, `${selected.name} advances.`],
  }
}

const terrainDefense = (
  state: BattleState,
  attacker: Unit,
  defender: Unit,
) => {
  const terrain = terrainAt(state.scenario, defender.position)
  if (terrain === 'hill' || terrain === 'village') {
    return 1
  }
  if (terrain === 'forest' && attacker.range > 1) {
    return 1
  }
  return 0
}

const matchupBonus = (attacker: Unit, defender: Unit) => {
  if (attacker.kind === 'elephant' && defender.kind === 'infantry') {
    return 1
  }
  if (attacker.kind === 'cavalry' && defender.kind === 'archer') {
    return 1
  }
  if (attacker.kind === 'archer' && defender.kind === 'elephant') {
    return -1
  }
  return 0
}

const battleResult = (units: Unit[]): BattleResult | null => {
  const mauryaCommanderAlive = units.some(
    (unit) =>
      unit.faction === PLAYER_FACTION &&
      unit.kind === 'commander' &&
      unit.hp > 0,
  )
  const kalingaCommanderAlive = units.some(
    (unit) =>
      unit.faction === ENEMY_FACTION &&
      unit.kind === 'commander' &&
      unit.hp > 0,
  )
  const mauryaAlive = units.some(
    (unit) => unit.faction === PLAYER_FACTION && unit.hp > 0,
  )
  const kalingaAlive = units.some(
    (unit) => unit.faction === ENEMY_FACTION && unit.hp > 0,
  )

  if (!kalingaCommanderAlive || !kalingaAlive) {
    return 'maurya-victory'
  }
  if (!mauryaCommanderAlive || !mauryaAlive) {
    return 'kalinga-victory'
  }
  return null
}

const resolveAttack = (
  state: BattleState,
  attackerId: string,
  targetId: string,
): BattleState => {
  const attacker = state.units.find((unit) => unit.id === attackerId)
  const defender = state.units.find((unit) => unit.id === targetId)
  if (!attacker || !defender) {
    return state
  }

  const damage = Math.max(
    1,
    attacker.attack +
      matchupBonus(attacker, defender) -
      defender.armor -
      terrainDefense(state, attacker, defender),
  )
  const remainingHp = Math.max(0, defender.hp - damage)
  const updatedUnits = state.units.map((unit) => {
    if (unit.id === attacker.id) {
      return { ...unit, acted: true }
    }
    if (unit.id === defender.id) {
      return { ...unit, hp: remainingHp }
    }
    return unit
  })
  const result = battleResult(updatedUnits)
  const outcome =
    remainingHp === 0
      ? `${attacker.name} defeats ${defender.name}.`
      : `${attacker.name} strikes ${defender.name} for ${damage}.`

  return {
    ...state,
    units: updatedUnits,
    humanCost: state.humanCost + damage,
    phase: result ? 'complete' : state.phase,
    result,
    log: [...state.log, outcome],
  }
}

export const attackWithSelectedUnit = (
  state: BattleState,
  targetId: string,
): BattleState => {
  if (state.phase !== 'player' || !state.selectedUnitId) {
    return state
  }

  const selected = state.units.find(
    (unit) => unit.id === state.selectedUnitId,
  )
  if (
    !selected ||
    selected.faction !== PLAYER_FACTION ||
    !getAttackableUnitIds(state, selected.id).includes(targetId)
  ) {
    return state
  }

  return resolveAttack(state, selected.id, targetId)
}

const nearestTarget = (unit: Unit, targets: Unit[]) =>
  [...targets].sort(
    (left, right) =>
      distance(unit.position, left.position) -
      distance(unit.position, right.position),
  )[0]

const runEnemyTurn = (initialState: BattleState): BattleState => {
  let state = initialState
  const enemyIds = state.units
    .filter((unit) => unit.faction === ENEMY_FACTION && unit.hp > 0)
    .map((unit) => unit.id)

  for (const enemyId of enemyIds) {
    if (state.result) {
      break
    }

    let enemy = state.units.find((unit) => unit.id === enemyId)
    if (!enemy || enemy.hp <= 0) {
      continue
    }

    let targets = state.units.filter(
      (unit) => unit.faction === PLAYER_FACTION && unit.hp > 0,
    )
    let attackable = targets.filter(
      (target) => distance(enemy!.position, target.position) <= enemy!.range,
    )

    if (attackable.length === 0) {
      const target = nearestTarget(enemy, targets)
      if (target) {
        const reachable = getReachableCells(state, enemy.id)
        const destination = [...reachable].sort(
          (left, right) =>
            distance(left, target.position) - distance(right, target.position),
        )[0]

        if (
          destination &&
          distance(destination, target.position) <
            distance(enemy.position, target.position)
        ) {
          state = {
            ...state,
            units: state.units.map((unit) =>
              unit.id === enemyId
                ? {
                    ...unit,
                    position: { ...destination },
                    moved: true,
                  }
                : unit,
            ),
            log: [...state.log, `${enemy.name} repositions.`],
          }
        }
      }
    }

    enemy = state.units.find((unit) => unit.id === enemyId)
    targets = state.units.filter(
      (unit) => unit.faction === PLAYER_FACTION && unit.hp > 0,
    )
    attackable = targets
      .filter(
        (target) =>
          enemy &&
          distance(enemy.position, target.position) <= enemy.range,
      )
      .sort((left, right) => left.hp - right.hp)

    if (enemy && attackable[0]) {
      state = resolveAttack(state, enemy.id, attackable[0].id)
    }
  }

  return state
}

const resetFaction = (units: Unit[], faction: Faction) =>
  units.map((unit) =>
    unit.faction === faction ? { ...unit, moved: false, acted: false } : unit,
  )

export const endPlayerTurn = (state: BattleState): BattleState => {
  if (state.phase !== 'player' || state.result) {
    return state
  }

  const enemyReady: BattleState = {
    ...state,
    phase: 'enemy',
    selectedUnitId: null,
    units: resetFaction(state.units, ENEMY_FACTION),
    log: [...state.log, 'Kalinga forces answer the advance.'],
  }
  const afterEnemy = runEnemyTurn(enemyReady)
  if (afterEnemy.result) {
    return afterEnemy
  }

  if (state.turn >= state.scenario.maxTurns) {
    return {
      ...afterEnemy,
      phase: 'complete',
      result: 'stalemate',
      log: [...afterEnemy.log, 'The eighth turn ends with the field contested.'],
    }
  }

  return {
    ...afterEnemy,
    turn: state.turn + 1,
    phase: 'player',
    selectedUnitId: null,
    units: resetFaction(afterEnemy.units, PLAYER_FACTION),
    log: [
      ...afterEnemy.log,
      `Turn ${state.turn + 1}: the Mauryan command acts.`,
    ],
  }
}
