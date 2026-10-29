import { describe, expect, it } from 'vitest'
import { PROJECT_COLOR_KEYS, projectColorLabel, suggestProjectColor } from './projectColors'

describe('colores de proyecto', () => {
  it('las claves son las del backend, en su orden', () => {
    expect(PROJECT_COLOR_KEYS).toEqual(['TEAL', 'AMBER', 'BLUE', 'PINK', 'VIOLET', 'ORANGE', 'GREEN'])
  })

  it('sugiere el menos usado del workspace y, entre empatados, el primero de la paleta', () => {
    expect(suggestProjectColor([])).toBe('TEAL')
    expect(suggestProjectColor(undefined)).toBe('TEAL')
    expect(suggestProjectColor([{ color: 'TEAL' }, { color: 'AMBER' }])).toBe('BLUE')
    expect(suggestProjectColor([{ color: 'GREEN' }, { color: 'AMBER' }])).toBe('TEAL')
    // Toda la paleta usada y el turquesa dos veces: sigue el ámbar
    const all = PROJECT_COLOR_KEYS.map((color) => ({ color }))
    expect(suggestProjectColor([...all, { color: 'TEAL' }])).toBe('AMBER')
  })

  it('ignora colores que no son de la paleta', () => {
    expect(suggestProjectColor([{ color: null }, { color: '#2EC4A0' }, { color: 'TEAL' }])).toBe('AMBER')
    expect(projectColorLabel('VIOLET')).toBe('Violeta')
    expect(projectColorLabel('#FFF')).toBe('')
  })
})
