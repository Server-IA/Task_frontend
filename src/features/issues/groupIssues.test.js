import { describe, expect, it } from 'vitest'
import { groupIssues } from './groupIssues'

const todo = { id: 's-todo', name: 'Por hacer' }
const doing = { id: 's-doing', name: 'En curso' }
const ana = { id: 'u-ana', fullName: 'Ana' }
const luis = { id: 'u-luis', fullName: 'Luis Muñoz' }
const bug = { id: 'l-bug', name: 'bug' }
const ux = { id: 'l-ux', name: 'ux' }
const meta = { states: [todo, doing], users: [luis, ana], labels: [ux, bug] }

const issue = (id, extra) => ({ id, state: todo, priority: 'NONE', assignees: [], labels: [], ...extra })
const ids = (groups) => groups.map((group) => [group.label, group.issues.map((item) => item.id)])

describe('agrupar la lista', () => {
  it('por estado, en el orden de las columnas', () => {
    const groups = groupIssues([issue('1', { state: doing }), issue('2'), issue('3', { state: doing })], 'state', meta)
    expect(ids(groups)).toEqual([
      ['Por hacer', ['2']],
      ['En curso', ['1', '3']],
    ])
    expect(groups[0]).toMatchObject({ kind: 'state', state: todo })
  })

  it('por prioridad, de urgente a sin prioridad', () => {
    const groups = groupIssues([issue('1'), issue('2', { priority: 'LOW' }), issue('3', { priority: 'URGENT' })], 'priority', meta)
    expect(ids(groups)).toEqual([
      ['Urgente', ['3']],
      ['Baja', ['2']],
      ['Sin prioridad', ['1']],
    ])
  })

  it('por asignado: una tarea va con cada persona y las sin asignar al final', () => {
    const groups = groupIssues(
      [issue('1', { assignees: [luis, ana] }), issue('2'), issue('3', { assignees: [luis] })],
      'assignee',
      meta,
    )
    expect(ids(groups)).toEqual([
      ['Ana', ['1']],
      ['Luis Muñoz', ['1', '3']],
      ['Sin asignar', ['2']],
    ])
    expect(groups[2]).toMatchObject({ kind: 'assignee', user: null })
  })

  it('por etiqueta, en el orden del proyecto y sin etiqueta al final', () => {
    const groups = groupIssues([issue('1', { labels: [bug, ux] }), issue('2'), issue('3', { labels: [bug] })], 'label', meta)
    expect(ids(groups)).toEqual([
      ['ux', ['1']],
      ['bug', ['1', '3']],
      ['Sin etiqueta', ['2']],
    ])
  })

  it('un grupo que no está en el proyecto (persona que salió) va antes de «sin asignar»', () => {
    const ex = { id: 'u-ex', fullName: 'Zoe' }
    const groups = groupIssues([issue('1', { assignees: [ex] }), issue('2'), issue('3', { assignees: [ana] })], 'assignee', meta)
    expect(groups.map((group) => group.label)).toEqual(['Ana', 'Zoe', 'Sin asignar'])
  })
})
