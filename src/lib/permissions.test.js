import { describe, expect, it } from 'vitest'
import { can, canDeleteComment, canDeleteFile, canDeleteIssue, myRoleName, roleNameOf } from './permissions'

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

describe('canDeleteFile', () => {
  const file = { id: 'f1', uploadedBy: { id: 'ana' } }

  it('quien subió el archivo o el project manager', () => {
    expect(canDeleteFile('MEMBER', file, 'ana')).toBe(true)
    expect(canDeleteFile('OWNER', file, 'luis')).toBe(true)
  })

  it('otro miembro no, ni sin sesión', () => {
    expect(canDeleteFile('MEMBER', file, 'luis')).toBe(false)
    expect(canDeleteFile('MEMBER', file, undefined)).toBe(false)
    expect(canDeleteFile('MEMBER', { ...file, uploadedBy: null }, 'ana')).toBe(false)
  })
})

describe('permisos del rol', () => {
  const leader = { myRole: 'MEMBER', myRoleName: 'Líder', myPermissions: ['CYCLE_CREATE', 'ISSUE_DELETE_ANY'] }

  it('el project manager puede todo, tenga o no la lista', () => {
    expect(can({ myRole: 'OWNER' }, 'ROLE_MANAGE')).toBe(true)
    expect(can({ myRole: 'OWNER', myPermissions: [] }, 'PROJECT_DELETE')).toBe(true)
  })

  it('un rol creado tiene solo sus permisos', () => {
    expect(can(leader, 'CYCLE_CREATE')).toBe(true)
    expect(can(leader, 'ISSUE_CREATE')).toBe(false)
  })

  it('sin la lista (backend anterior a los roles), un miembro tiene lo de fábrica', () => {
    expect(can({ myRole: 'MEMBER' }, 'ISSUE_CREATE')).toBe(true)
    expect(can({ myRole: 'MEMBER' }, 'CYCLE_CREATE')).toBe(false)
    expect(can('MEMBER', 'COMMENT_CREATE')).toBe(true)
  })

  it('sin workspace o sin rol, nada', () => {
    expect(can(undefined, 'ISSUE_CREATE')).toBe(false)
    expect(can({}, 'ISSUE_CREATE')).toBe(false)
  })

  it('eliminar tareas, comentarios y adjuntos de otros va por su permiso', () => {
    const task = { type: 'TASK', createdBy: { id: 'otro' } }
    expect(canDeleteIssue(leader, task, 'yo')).toBe(true)
    // Sin «eliminar sus propias tareas» ni «cualquiera», ni la suya
    expect(canDeleteIssue({ myRole: 'MEMBER', myPermissions: [] }, { ...task, createdBy: { id: 'yo' } }, 'yo')).toBe(false)
    expect(canDeleteIssue(leader, { ...task, type: 'STORY' }, 'yo')).toBe(false)
    expect(canDeleteComment(leader, { author: { id: 'otro' } }, 'yo')).toBe(false)
    expect(canDeleteComment({ myRole: 'MEMBER', myPermissions: ['COMMENT_DELETE_ANY'] }, { author: { id: 'otro' } }, 'yo')).toBe(true)
    expect(canDeleteComment(leader, { author: { id: 'yo' } }, 'yo')).toBe(true)
  })

  it('nombra el rol propio y el de un miembro', () => {
    expect(myRoleName(leader)).toBe('Líder')
    expect(myRoleName({ myRole: 'OWNER' })).toBe('Project manager')
    expect(roleNameOf({ role: 'MEMBER', roleName: 'Invitado' })).toBe('Invitado')
    expect(roleNameOf({ role: 'MEMBER' })).toBe('Miembro')
  })
})
