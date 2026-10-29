import { describe, expect, it } from 'vitest'
import { flattenUniquePages, nextCursorParam } from './pagination'

describe('nextCursorParam', () => {
  it('sigue con el nextCursor de la última página y para cuando es null', () => {
    expect(nextCursorParam({ content: [], nextCursor: '2026-10-29T12:00:00Z,3f1c' })).toBe('2026-10-29T12:00:00Z,3f1c')
    expect(nextCursorParam({ content: [], nextCursor: null })).toBeUndefined()
    expect(nextCursorParam({ content: [] })).toBeUndefined()
  })
})

describe('flattenUniquePages', () => {
  it('une las páginas en orden', () => {
    const data = { pages: [{ content: [{ id: 'a' }, { id: 'b' }] }, { content: [{ id: 'c' }] }] }
    expect(flattenUniquePages(data).map((item) => item.id)).toEqual(['a', 'b', 'c'])
  })

  it('un elemento que llega en dos páginas (algo nuevo corrió el offset) sale una sola vez', () => {
    const data = { pages: [{ content: [{ id: 'a' }, { id: 'b' }] }, { content: [{ id: 'b' }, { id: 'c' }] }] }
    expect(flattenUniquePages(data).map((item) => item.id)).toEqual(['a', 'b', 'c'])
  })

  it('sin datos devuelve una lista vacía', () => {
    expect(flattenUniquePages(undefined)).toEqual([])
    expect(flattenUniquePages({ pages: [{}] })).toEqual([])
  })
})
