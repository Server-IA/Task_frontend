import { describe, expect, it } from 'vitest'
import { diffLines } from './diffLines'

const changed = (lines) => lines.filter((line) => line.changed).map((line) => line.text)

describe('diffLines', () => {
  it('marca en cada lado las líneas que el otro no tiene', () => {
    const theirs = ['## Pasos', '- [ ] Uno', '- [x] Dos', 'Final'].join('\n')
    const mine = ['## Pasos', '- [ ] Uno', '- [ ] Tres', 'Final'].join('\n')
    const diff = diffLines(theirs, mine)
    expect(changed(diff.left)).toEqual(['- [x] Dos'])
    expect(changed(diff.right)).toEqual(['- [ ] Tres'])
    expect(diff.same).toBe(false)
  })

  it('una línea agregada en medio no marca las demás', () => {
    const diff = diffLines('a\nb\nc', 'a\nnueva\nb\nc')
    expect(changed(diff.left)).toEqual([])
    expect(changed(diff.right)).toEqual(['nueva'])
  })

  it('líneas movidas: solo las que no están en el mismo orden', () => {
    const diff = diffLines('uno\ndos\ntres', 'tres\nuno\ndos')
    expect(changed(diff.left)).toEqual(['tres'])
    expect(changed(diff.right)).toEqual(['tres'])
  })

  it('textos iguales y vacíos', () => {
    expect(diffLines('igual', 'igual')).toMatchObject({ same: true, left: [{ text: 'igual', changed: false }] })
    expect(changed(diffLines('', 'algo').right)).toEqual(['algo'])
  })
})
