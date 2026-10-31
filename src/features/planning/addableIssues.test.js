import { describe, expect, it } from 'vitest'
import { addableIssues } from './addableIssues'

const issue = (id, group) => ({ id, state: { group } })

describe('addableIssues', () => {
  const issues = [
    issue('todo', 'UNSTARTED'),
    issue('doing', 'STARTED'),
    issue('done', 'COMPLETED'),
    issue('cancelled', 'CANCELLED'),
    issue('already', 'BACKLOG'),
  ]

  it('en un ciclo deja fuera lo terminado, lo cancelado y lo que ya está', () => {
    expect(addableIssues(issues, new Set(['already']), 'cycles').map((item) => item.id)).toEqual(['todo', 'doing'])
  })

  it('en un módulo solo deja fuera lo que ya está', () => {
    expect(addableIssues(issues, new Set(['already']), 'modules').map((item) => item.id)).toEqual([
      'todo',
      'doing',
      'done',
      'cancelled',
    ])
  })
})
