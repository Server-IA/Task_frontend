import { describe, expect, it } from 'vitest'
import { dndAnnouncements, quoted, sortableAnnouncements } from './dndAnnouncements'

describe('anuncios del arrastre', () => {
  const label = (id) => ({ a: 'la vista «Bugs»', b: 'la vista «Sprint»' })[id]

  it('en una lista, dicen la posición', () => {
    const announcements = sortableAnnouncements(['a', 'b'], label)
    expect(announcements.onDragStart({ active: { id: 'a' } })).toBe('Levantaste la vista «Bugs».')
    expect(announcements.onDragOver({ active: { id: 'a' }, over: { id: 'b' } })).toBe('la vista «Bugs» está en la posición 2 de 2.')
    expect(announcements.onDragEnd({ active: { id: 'a' }, over: { id: 'b' } })).toBe('Soltaste la vista «Bugs» en la posición 2 de 2.')
    expect(announcements.onDragCancel({ active: { id: 'a' } })).toBe('Cancelaste el arrastre. la vista «Bugs» volvió a su lugar.')
  })

  it('sin un lugar donde soltar, lo dicen sin inventar uno', () => {
    const announcements = dndAnnouncements({ itemLabel: label, placeLabel: () => null })
    expect(announcements.onDragOver({ active: { id: 'b' }, over: null })).toBe('la vista «Sprint» ya no está sobre un lugar donde soltarlo.')
    expect(announcements.onDragEnd({ active: { id: 'b' }, over: null })).toBe('Soltaste la vista «Sprint».')
  })

  it('las comillas recortan un texto largo', () => {
    expect(quoted('x'.repeat(70), 10)).toBe(`«${'x'.repeat(9)}…»`)
  })
})
