import { describe, expect, it } from 'vitest'
import {
  attackWithSelectedUnit,
  createBattleState,
  endPlayerTurn,
  getReachableCells,
  moveSelectedUnit,
  movementCost,
  selectUnit,
} from './engine'
import type { Unit } from './types'

describe('Kalinga battle engine', () => {
  it('creates the historical scenario with both armies ready', () => {
    const state = createBattleState()

    expect(state.turn).toBe(1)
    expect(state.phase).toBe('player')
    expect(state.units.filter((unit) => unit.faction === 'maurya')).toHaveLength(5)
    expect(state.units.filter((unit) => unit.faction === 'kalinga')).toHaveLength(5)
  })

  it('uses higher movement costs for rough terrain', () => {
    const infantry = createBattleState().units.find(
      (unit) => unit.kind === 'infantry',
    ) as Unit
    const elephant = createBattleState().units.find(
      (unit) => unit.kind === 'elephant',
    ) as Unit

    expect(movementCost(infantry, 'plain')).toBe(1)
    expect(movementCost(infantry, 'river')).toBe(2)
    expect(movementCost(elephant, 'river')).toBe(3)
  })

  it('never marks an occupied tile as reachable', () => {
    const state = createBattleState()
    const reachable = getReachableCells(state, 'm-elephant')

    expect(reachable).not.toContainEqual({ row: 7, col: 3 })
    expect(reachable).not.toContainEqual({ row: 7, col: 1 })
  })

  it('moves a selected unit once per turn', () => {
    const selected = selectUnit(createBattleState(), 'm-infantry')
    const moved = moveSelectedUnit(selected, { row: 5, col: 4 })
    const ignored = moveSelectedUnit(moved, { row: 4, col: 4 })

    expect(
      moved.units.find((unit) => unit.id === 'm-infantry')?.position,
    ).toEqual({ row: 5, col: 4 })
    expect(ignored).toBe(moved)
  })

  it('records combat as human cost and ends when the command standard falls', () => {
    const initial = createBattleState()
    const prepared = {
      ...initial,
      units: initial.units.map((unit) => {
        if (unit.id === 'm-infantry') {
          return { ...unit, position: { row: 1, col: 3 }, attack: 10 }
        }
        if (unit.id === 'k-commander') {
          return { ...unit, hp: 1 }
        }
        return unit
      }),
    }
    const selected = selectUnit(prepared, 'm-infantry')
    const resolved = attackWithSelectedUnit(selected, 'k-commander')

    expect(resolved.humanCost).toBeGreaterThan(0)
    expect(resolved.result).toBe('maurya-victory')
    expect(resolved.phase).toBe('complete')
  })

  it('runs a deterministic enemy response and advances the turn', () => {
    const next = endPlayerTurn(createBattleState())

    expect(next.turn).toBe(2)
    expect(next.phase).toBe('player')
    expect(next.log.some((entry) => entry.includes('Kalinga'))).toBe(true)
  })
})
