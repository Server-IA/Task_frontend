import { renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SORT, sanitizeSort, SORT_OPTIONS } from './constants'
import { useIssueFilters } from './useIssueFilters'

describe('sanitizeSort', () => {
  it('deja pasar los órdenes de la lista y cambia lo demás por el manual', () => {
    for (const option of SORT_OPTIONS) expect(sanitizeSort(option.value)).toBe(option.value)
    expect(sanitizeSort('-createdAt')).toBe(DEFAULT_SORT)
    expect(sanitizeSort('title;drop')).toBe(DEFAULT_SORT)
    expect(sanitizeSort(null)).toBe(DEFAULT_SORT)
    expect(sanitizeSort(undefined)).toBe(DEFAULT_SORT)
  })

  it('un orden desconocido en la URL no llega a la lista de tareas', () => {
    const wrapper = ({ children }) => createElement(MemoryRouter, { initialEntries: ['/x?sort=-createdAt'] }, children)
    const { result } = renderHook(() => useIssueFilters(), { wrapper })
    expect(result.current.sort).toBe(DEFAULT_SORT)
  })
})
