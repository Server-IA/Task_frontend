import { describe, expect, it } from 'vitest'
import { applyViewToParams, canEditView, clearViewParams, diffViewFilters, summarizeViewFilters, toViewFilters } from './savedViews'

const empty = { state: [], priority: [], assignee: [], label: [], search: '' }

describe('vistas guardadas', () => {
  it('lo que hay en la URL coincide con la vista aunque cambie el orden de los valores', () => {
    const saved = { state: ['a', 'b'], priority: ['HIGH'], assignee: [], label: [], search: 'login', view: 'list', sort: 'dueDate,asc' }
    const current = toViewFilters({
      filters: { ...empty, state: ['b', 'a'], priority: ['HIGH'], search: ' login ' },
      view: 'list',
      sort: 'dueDate,asc',
    })
    expect(diffViewFilters(saved, current)).toEqual([])
  })

  it('marca qué cambió', () => {
    const saved = { state: ['a'], priority: [], assignee: [], label: [], search: null, view: 'list', sort: null }
    const current = toViewFilters({ filters: { ...empty, state: ['a', 'c'], label: ['x'] }, view: 'board', sort: 'title,asc' })
    expect(diffViewFilters(saved, current)).toEqual(['state', 'label', 'view'])
    // En lista sí cuenta el orden (sin orden guardado = manual)
    expect(diffViewFilters(saved, { ...current, state: ['a'], label: [], view: 'list' })).toEqual(['sort'])
  })

  it('una vista sin «view» guardada no se marca como cambiada por la vista', () => {
    expect(diffViewFilters({ state: [] }, toViewFilters({ filters: empty, view: 'board', sort: 'sortOrder,asc' }))).toEqual([])
  })

  it('aplicar una vista reemplaza los filtros y conserva la tarea abierta', () => {
    const previous = new URLSearchParams('state=viejo&search=x&page=3&issue=42&view=board')
    const next = applyViewToParams(previous, {
      id: 'v1',
      filters: { state: ['s1', 's2'], priority: ['URGENT'], search: 'bug', view: 'list', sort: 'dueDate,asc' },
    })
    expect(next.getAll('state')).toEqual(['s1', 's2'])
    expect(next.getAll('priority')).toEqual(['URGENT'])
    expect(next.get('search')).toBe('bug')
    expect(next.get('view')).toBe('list')
    expect(next.get('sort')).toBe('dueDate,asc')
    expect(next.get('page')).toBeNull()
    expect(next.get('issue')).toBe('42')
    expect(next.get('savedView')).toBe('v1')
  })

  it('«Todas» quita la vista, los filtros y el orden', () => {
    const next = clearViewParams(new URLSearchParams('state=a&sort=title,asc&savedView=v1&view=board&issue=7'))
    expect(next.toString()).toBe('view=board&issue=7')
  })

  it('resume los filtros con nombres legibles', () => {
    const meta = {
      states: [{ id: 's1', name: 'Por hacer' }],
      users: [{ id: 'u1', fullName: 'Luis Muñoz' }],
      labels: [{ id: 'l1', name: 'bug' }],
    }
    expect(
      summarizeViewFilters({ state: ['s1'], priority: ['HIGH'], assignee: ['u1'], label: ['l1'], view: 'list', sort: 'dueDate,asc' }, meta),
    ).toEqual([
      { key: 'estado', value: 'Por hacer' },
      { key: 'prioridad', value: 'Alta' },
      { key: 'asignado', value: 'Luis Muñoz' },
      { key: 'etiqueta', value: 'bug' },
      { key: 'vista', value: 'lista' },
      { key: 'orden', value: 'fecha límite' },
    ])
    expect(summarizeViewFilters({ view: 'board' }, meta)).toEqual([
      { key: 'filtros', value: 'ninguno (todas las tareas)' },
      { key: 'vista', value: 'tablero' },
    ])
  })

  it('permisos: compartidas el project manager, personales su dueño', () => {
    expect(canEditView({ shared: true, mine: true }, false)).toBe(false)
    expect(canEditView({ shared: true, mine: false }, true)).toBe(true)
    expect(canEditView({ shared: false, mine: true }, false)).toBe(true)
    expect(canEditView({ shared: false, mine: false }, true)).toBe(false)
  })
})
