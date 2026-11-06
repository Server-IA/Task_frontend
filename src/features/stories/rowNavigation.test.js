import { describe, expect, it } from 'vitest'
import { nextRowIndex } from './rowNavigation'

describe('j/k en la lista de historias', () => {
  it('sin una fila con el foco, la primera j va a la primera historia (no a la segunda)', () => {
    expect(nextRowIndex({ current: 0, step: 1, count: 4, onRow: false })).toBe(0)
  })

  it('con una fila con el foco, baja y sube sin salirse de la lista', () => {
    expect(nextRowIndex({ current: 0, step: 1, count: 4, onRow: true })).toBe(1)
    expect(nextRowIndex({ current: 3, step: 1, count: 4, onRow: true })).toBe(3)
    expect(nextRowIndex({ current: 0, step: -1, count: 4, onRow: true })).toBe(0)
  })

  it('si la lista se acortó (filtro), vuelve a la última fila que existe', () => {
    expect(nextRowIndex({ current: 5, step: 1, count: 2, onRow: false })).toBe(1)
    expect(nextRowIndex({ current: 0, step: 1, count: 0, onRow: false })).toBe(0)
  })
})
