import {
  getAttackableUnitIds,
  getReachableCells,
  terrainAt,
} from '../game/engine'
import { positionKey } from '../game/scenario'
import type { BattleState, Position, Terrain, UnitKind } from '../game/types'

type BattleBoardProps = {
  state: BattleState
  onSelect: (unitId: string) => void
  onMove: (position: Position) => void
  onAttack: (unitId: string) => void
}

const terrainLabel: Record<Terrain, string> = {
  plain: '',
  forest: 'F',
  hill: 'H',
  river: 'R',
  village: 'V',
}

const unitLabel: Record<UnitKind, string> = {
  commander: 'C',
  infantry: 'I',
  archer: 'A',
  cavalry: 'H',
  elephant: 'E',
  militia: 'M',
}

export function BattleBoard({
  state,
  onSelect,
  onMove,
  onAttack,
}: BattleBoardProps) {
  const selected = state.selectedUnitId
    ? state.units.find((unit) => unit.id === state.selectedUnitId)
    : null
  const reachable = new Set(
    selected
      ? getReachableCells(state, selected.id).map((position) =>
          positionKey(position.row, position.col),
        )
      : [],
  )
  const attackable = new Set(
    selected ? getAttackableUnitIds(state, selected.id) : [],
  )

  const cells = Array.from(
    { length: state.scenario.rows * state.scenario.cols },
    (_, index) => ({
      row: Math.floor(index / state.scenario.cols),
      col: index % state.scenario.cols,
    }),
  )

  return (
    <div
      className="board-grid"
      role="grid"
      aria-label="Kalinga tactical battlefield"
    >
      {cells.map((position) => {
        const key = positionKey(position.row, position.col)
        const terrain = terrainAt(state.scenario, position)
        const unit = state.units.find(
          (candidate) =>
            candidate.hp > 0 &&
            candidate.position.row === position.row &&
            candidate.position.col === position.col,
        )
        const isSelected = unit?.id === state.selectedUnitId
        const isAttackable = unit ? attackable.has(unit.id) : false
        const isReachable = !unit && reachable.has(key)
        const label = unit
          ? `${unit.name}, ${unit.hp} of ${unit.maxHp} strength, ${terrain}`
          : `${terrain} tile, row ${position.row + 1}, column ${position.col + 1}`

        const handleClick = () => {
          if (unit && isAttackable) {
            onAttack(unit.id)
            return
          }
          if (isReachable) {
            onMove(position)
            return
          }
          if (unit?.faction === 'maurya') {
            onSelect(unit.id)
          }
        }

        return (
          <button
            className={[
              'board-cell',
              isSelected ? 'selected' : '',
              isAttackable ? 'attackable' : '',
              isReachable ? 'reachable' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            data-terrain={terrain}
            key={key}
            onClick={handleClick}
            type="button"
            role="gridcell"
            aria-label={label}
          >
            <span className="terrain-mark" aria-hidden="true">
              {terrainLabel[terrain]}
            </span>
            {unit ? (
              <span
                className={[
                  'unit-token',
                  unit.faction,
                  unit.moved && unit.acted ? 'exhausted' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                title={unit.name}
              >
                {unitLabel[unit.kind]}
                <span className="health-pips">{unit.hp}</span>
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
