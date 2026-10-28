import { describe, expect, it } from 'vitest'
import {
  dropIndex,
  formatCriterion,
  itemsOfKind,
  moveChecklistItem,
  parseCriterion,
  summarizeChecklist,
} from './checklistMath'

const items = [
  { id: 'c1', kind: 'CRITERION', text: 'A', done: true, position: 0 },
  { id: 'c2', kind: 'CRITERION', text: 'B', done: false, position: 1 },
  { id: 'k1', kind: 'CHECK', text: 'Uno', done: true, position: 0 },
  { id: 'k2', kind: 'CHECK', text: 'Dos', done: false, position: 1 },
  { id: 'k3', kind: 'CHECK', text: 'Tres', done: true, position: 2 },
]
const order = (list, kind) => itemsOfKind(list, kind).map((item) => item.id)

describe('checklist', () => {
  it('cuenta criterios y pasos por separado', () => {
    expect(summarizeChecklist(items)).toEqual({ criteriaTotal: 2, criteriaDone: 1, checklistTotal: 3, checklistDone: 2 })
    expect(summarizeChecklist([])).toEqual({ criteriaTotal: 0, criteriaDone: 0, checklistTotal: 0, checklistDone: 0 })
  })

  it('mover renumera solo los de su tipo y devuelve la posición nueva', () => {
    const down = moveChecklistItem(items, 'k1', 2)
    expect(down.position).toBe(2)
    expect(order(down.items, 'CHECK')).toEqual(['k2', 'k3', 'k1'])
    expect(down.items.filter((item) => item.kind === 'CHECK').map((item) => item.position).sort()).toEqual([0, 1, 2])
    expect(order(down.items, 'CRITERION')).toEqual(['c1', 'c2'])

    const up = moveChecklistItem(items, 'k3', 0)
    expect(order(up.items, 'CHECK')).toEqual(['k3', 'k1', 'k2'])
  })

  it('no hace nada si queda igual y no se sale de los límites', () => {
    expect(moveChecklistItem(items, 'k2', 1)).toBeNull()
    expect(moveChecklistItem(items, 'c1', -3)).toBeNull()
    expect(moveChecklistItem(items, 'c1', 99).position).toBe(1)
    expect(moveChecklistItem(items, 'nada', 0)).toBeNull()
  })

  it('al soltar sobre otro elemento toma su índice, solo dentro del mismo tipo', () => {
    expect(dropIndex(items, 'k1', 'k3')).toBe(2)
    expect(dropIndex(items, 'k3', 'k1')).toBe(0)
    expect(dropIndex(items, 'k1', 'c2')).toBeNull()
  })

  it('reconoce criterios «Dado …, cuando …, entonces …»', () => {
    expect(parseCriterion('Dado los pasos, cuando se repiten, entonces el error ya no ocurre')).toEqual({
      given: 'los pasos',
      when: 'se repiten',
      then: 'el error ya no ocurre',
    })
    expect(parseCriterion('dado que soy usuario cuando entro entonces veo mi panel')).toEqual({
      given: 'que soy usuario',
      when: 'entro',
      then: 'veo mi panel',
    })
    expect(parseCriterion('El botón se ve en modo oscuro')).toBeNull()
    expect(formatCriterion({ given: ' un correo registrado ', when: 'pido el enlace', then: 'lo recibo' })).toBe(
      'Dado un correo registrado, cuando pido el enlace, entonces lo recibo',
    )
  })
})
