import { describe, expect, it } from 'vitest'
import {
  applyViewToParams,
  canEditView,
  clearViewParams,
  diffViewFilters,
  moveView,
  reorderableGroups,
  summarizeViewFilters,
  toViewFilters,
} from './savedViews'

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
      { key: 'agrupar', value: 'por estado' },
      { key: 'orden', value: 'fecha límite' },
    ])
    expect(summarizeViewFilters({ view: 'board' }, meta)).toEqual([
      { key: 'filtros', value: 'ninguno (todas las tareas)' },
      { key: 'vista', value: 'tablero' },
    ])
    // Por prioridad, el backend desempata por fecha límite
    expect(summarizeViewFilters({ view: 'list', sort: 'priorityRank,asc' }, meta).at(-1)).toEqual({
      key: 'orden',
      value: 'prioridad, luego fecha',
    })
  })

  it('guarda ciclo, módulo, bloqueadas y agrupación solo si están puestos', () => {
    expect(toViewFilters({ filters: empty, view: 'list', sort: 'sortOrder,asc', groupBy: 'state' })).toMatchObject({
      cycle: null,
      module: null,
      blocked: null,
      groupBy: null,
    })
    expect(
      toViewFilters({
        filters: { ...empty, cycle: 'c1', module: 'm1', blocked: true },
        view: 'list',
        sort: 'sortOrder,asc',
        groupBy: 'assignee',
      }),
    ).toMatchObject({ cycle: 'c1', module: 'm1', blocked: true, groupBy: 'assignee' })
  })

  it('marca cambiados el ciclo, el módulo, las bloqueadas y la agrupación (esta solo en la lista)', () => {
    const saved = { state: [], cycle: 'c1', module: null, blocked: null, groupBy: 'assignee', view: 'list' }
    const same = toViewFilters({ filters: { ...empty, cycle: 'c1' }, view: 'list', sort: 'sortOrder,asc', groupBy: 'assignee' })
    expect(diffViewFilters(saved, same)).toEqual([])
    const other = toViewFilters({ filters: { ...empty, module: 'm1', blocked: true }, view: 'list', sort: 'sortOrder,asc', groupBy: 'state' })
    expect(diffViewFilters(saved, other)).toEqual(['cycle', 'module', 'blocked', 'groupBy'])
    // En el tablero la agrupación no cuenta (siempre va por estado)
    expect(diffViewFilters({ ...saved, view: 'board' }, { ...same, view: 'board', groupBy: null })).toEqual([])
  })

  it('aplicar una vista pone ciclo, módulo, bloqueadas y agrupación; «Todas» los quita', () => {
    const next = applyViewToParams(new URLSearchParams('blocked=true&groupBy=label&cycle=viejo'), {
      id: 'v2',
      filters: { cycle: 'c1', module: 'm1', blocked: true, groupBy: 'assignee', view: 'list' },
    })
    expect(next.get('cycle')).toBe('c1')
    expect(next.get('module')).toBe('m1')
    expect(next.get('blocked')).toBe('true')
    expect(next.get('groupBy')).toBe('assignee')
    const plain = applyViewToParams(next, { id: 'v3', filters: { groupBy: null, blocked: null } })
    expect(plain.get('cycle')).toBeNull()
    expect(plain.get('blocked')).toBeNull()
    expect(plain.get('groupBy')).toBeNull()
    expect(clearViewParams(next).toString()).toBe('view=list')
  })

  it('resume ciclo, módulo, bloqueadas y agrupación', () => {
    const meta = { states: [], users: [], labels: [], cycles: [{ id: 'c1', name: 'Sprint 1' }], modules: [{ id: 'm1', name: 'Pagos' }] }
    expect(summarizeViewFilters({ cycle: 'c1', module: 'm1', blocked: true, groupBy: 'assignee', view: 'list' }, meta)).toEqual([
      { key: 'ciclo', value: 'Sprint 1' },
      { key: 'módulo', value: 'Pagos' },
      { key: 'bloqueo', value: 'solo bloqueadas' },
      { key: 'vista', value: 'lista' },
      { key: 'agrupar', value: 'por asignado' },
      { key: 'orden', value: 'manual' },
    ])
  })

  it('ordenar: compartidas solo el project manager, personales cada uno', () => {
    const views = [
      { id: 's1', shared: true, mine: true },
      { id: 's2', shared: true, mine: false },
      { id: 'p1', shared: false, mine: true },
    ]
    expect(reorderableGroups(views, true)).toMatchObject({ canShared: true, canPersonal: false })
    expect(reorderableGroups(views, false)).toMatchObject({ canShared: false, canPersonal: false })
    expect(reorderableGroups([...views, { id: 'p2', shared: false, mine: true }], false)).toMatchObject({
      canShared: false,
      canPersonal: true,
    })
  })

  it('mover una vista cambia solo su grupo y arma el cuerpo de PUT /views/order', () => {
    const views = [
      { id: 's1', shared: true },
      { id: 's2', shared: true },
      { id: 'p1', shared: false },
      { id: 'p2', shared: false },
      { id: 'p3', shared: false },
    ]
    expect(moveView(views, 'p3', 0)).toEqual({
      views: [views[0], views[1], views[4], views[2], views[3]],
      body: { personal: ['p3', 'p1', 'p2'] },
    })
    expect(moveView(views, 's1', 5)).toEqual({ views: [views[1], views[0], ...views.slice(2)], body: { shared: ['s2', 's1'] } })
    expect(moveView(views, 'p1', 0)).toBeNull()
    expect(moveView(views, 'nada', 0)).toBeNull()
  })

  it('permisos: compartidas el project manager, personales su dueño', () => {
    expect(canEditView({ shared: true, mine: true }, false)).toBe(false)
    expect(canEditView({ shared: true, mine: false }, true)).toBe(true)
    expect(canEditView({ shared: false, mine: true }, false)).toBe(true)
    expect(canEditView({ shared: false, mine: false }, true)).toBe(false)
  })
})
