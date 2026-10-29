import { describe, expect, it } from 'vitest'
import { flattenUniquePages } from './pagination'

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
