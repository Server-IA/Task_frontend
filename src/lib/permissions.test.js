import { describe, expect, it } from 'vitest'
import { canDeleteIssue } from './permissions'

describe('canDeleteIssue', () => {
  const mine = { type: 'TASK', createdBy: { id: 'u1' } }

  it('el project manager elimina cualquier tarea, también historias', () => {
    expect(canDeleteIssue('OWNER', { ...mine, createdBy: { id: 'otro' } }, 'u1')).toBe(true)
    expect(canDeleteIssue('OWNER', { ...mine, type: 'STORY' }, 'u1')).toBe(true)
  })

  it('un miembro elimina las tareas y bugs que creó, pero no una historia', () => {
    expect(canDeleteIssue('MEMBER', mine, 'u1')).toBe(true)
    expect(canDeleteIssue('MEMBER', { ...mine, type: 'BUG' }, 'u1')).toBe(true)
    expect(canDeleteIssue('MEMBER', { ...mine, type: 'STORY' }, 'u1')).toBe(false)
    expect(canDeleteIssue('MEMBER', { ...mine, createdBy: { id: 'otro' } }, 'u1')).toBe(false)
  })
})
