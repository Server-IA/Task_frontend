import { describe, expect, it } from 'vitest'
import { countByPriority, countByProject } from './breakdown'

describe('reparto de Mi trabajo', () => {
  const issues = [
    { id: '1', projectId: 'web', priority: 'HIGH' },
    { id: '2', projectId: 'app', priority: 'URGENT', project: { id: 'app', name: 'App' } },
    { id: '3', projectId: 'web', priority: 'NONE' },
    { id: '4', projectId: 'web' },
  ]

  it('cuenta por proyecto, de más a menos, con el proyecto cargado si lo hay', () => {
    const web = { id: 'web', name: 'Web', color: 'TEAL' }
    expect(countByProject(issues, new Map([['web', web]]))).toEqual([
      { projectId: 'web', project: web, name: 'Web', count: 3 },
      { projectId: 'app', project: { id: 'app', name: 'App' }, name: 'App', count: 1 },
    ])
    expect(countByProject([], new Map())).toEqual([])
  })

  it('cuenta por prioridad en el orden de urgente a sin prioridad, sin las vacías', () => {
    expect(countByPriority(issues)).toEqual([
      { priority: 'URGENT', label: 'Urgente', count: 1 },
      { priority: 'HIGH', label: 'Alta', count: 1 },
      { priority: 'NONE', label: 'Sin prioridad', count: 2 },
    ])
  })
})
