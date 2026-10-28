import { describe, expect, it } from 'vitest'
import { hasValue, splitFilters } from './filterMenu'

const empty = { state: [], priority: [], assignee: [], label: [], search: '', cycle: undefined, module: undefined, blocked: undefined }

describe('«+ filtro»', () => {
  it('sin vista guardada: los cuatro de siempre a la vista y ciclo, módulo y bloqueadas en el menú', () => {
    expect(splitFilters({ filters: empty, hasCycles: true, hasModules: true })).toEqual({
      pills: ['state', 'priority', 'assignee', 'label'],
      menu: ['cycle', 'module', 'blocked'],
    })
  })

  it('un filtro del menú con valor pasa a la barra', () => {
    const filters = { ...empty, cycle: 'c1', blocked: true }
    expect(splitFilters({ filters, hasCycles: true, hasModules: true })).toEqual({
      pills: ['state', 'priority', 'assignee', 'label', 'cycle', 'blocked'],
      menu: ['module'],
    })
  })

  it('con una vista guardada solo se ven los que tienen valor o cambiaron', () => {
    const filters = { ...empty, priority: ['URGENT'], cycle: 'c1' }
    expect(splitFilters({ filters, compact: true, hasCycles: true, changed: ['label'] })).toEqual({
      pills: ['priority', 'label', 'cycle'],
      menu: ['state', 'assignee', 'blocked'],
    })
  })

  it('sin ciclos ni módulos no los ofrece (salvo que uno siga puesto) y respeta hideState', () => {
    expect(splitFilters({ filters: empty, hideState: true }).menu).toEqual(['blocked'])
    expect(splitFilters({ filters: { ...empty, module: 'borrado' } }).pills).toContain('module')
  })

  it('reconoce cuándo un filtro tiene valor', () => {
    expect(hasValue(empty, 'state')).toBe(false)
    expect(hasValue({ state: ['s'] }, 'state')).toBe(true)
    expect(hasValue({ blocked: true }, 'blocked')).toBe(true)
    expect(hasValue({ cycle: undefined }, 'cycle')).toBe(false)
  })
})
