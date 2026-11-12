import { describe, expect, it } from 'vitest'
import {
  allPermissionKeys,
  assignableRoles,
  blankRole,
  coversRole,
  groupState,
  invitationRoleId,
  memberRoleBody,
  orderedPermissions,
  roleKeyOf,
  samePermissions,
  toggleGroup,
  togglePermission,
} from './roles'

const issues = {
  key: 'ISSUES',
  label: 'Tareas',
  permissions: [
    { key: 'ISSUE_CREATE', label: 'Crear' },
    { key: 'ISSUE_EDIT', label: 'Editar' },
    { key: 'ISSUE_DELETE_ANY', label: 'Eliminar' },
  ],
}
const cycles = { key: 'CYCLES', label: 'Ciclos', permissions: [{ key: 'CYCLE_CREATE', label: 'Crear ciclos' }] }
const groups = [issues, cycles]

const manager = { key: 'MANAGER', id: null, kind: 'MANAGER', name: 'Project manager', permissions: allPermissionKeys(groups) }
const member = { key: 'MEMBER', id: null, kind: 'MEMBER', name: 'Miembro', permissions: ['ISSUE_CREATE', 'ISSUE_EDIT'] }
const leader = { key: 'r1', id: 'r1', kind: 'CUSTOM', name: 'Líder', permissions: ['ISSUE_EDIT', 'CYCLE_CREATE'] }
const guest = { key: 'r2', id: 'r2', kind: 'CUSTOM', name: 'Invitado', permissions: [] }
const roles = [manager, member, leader, guest]

describe('roles: selector', () => {
  it('la clave de un miembro es MANAGER, MEMBER o el id de su rol', () => {
    expect(roleKeyOf({ role: 'OWNER', roleId: null })).toBe('MANAGER')
    expect(roleKeyOf({ role: 'MEMBER', roleId: null })).toBe('MEMBER')
    expect(roleKeyOf({ role: 'MEMBER', roleId: 'r1' })).toBe('r1')
  })

  it('arma el cuerpo para cambiar el rol', () => {
    expect(memberRoleBody('MANAGER')).toEqual({ role: 'OWNER', roleId: null })
    expect(memberRoleBody('MEMBER')).toEqual({ role: 'MEMBER', roleId: null })
    expect(memberRoleBody('r1')).toEqual({ role: 'MEMBER', roleId: 'r1' })
  })

  it('una invitación nunca lleva project manager', () => {
    expect(invitationRoleId('MEMBER')).toBeNull()
    expect(invitationRoleId('MANAGER')).toBeNull()
    expect(invitationRoleId('r2')).toBe('r2')
  })
})

describe('roles: permisos por módulo', () => {
  it('dice si un módulo está todo marcado, a medias o nada', () => {
    expect(groupState(issues, new Set())).toBe('none')
    expect(groupState(issues, new Set(['ISSUE_EDIT']))).toBe('some')
    expect(groupState(issues, new Set(['ISSUE_CREATE', 'ISSUE_EDIT', 'ISSUE_DELETE_ANY']))).toBe('all')
  })

  it('marca y desmarca el módulo completo sin tocar los demás', () => {
    const all = toggleGroup(issues, new Set(['CYCLE_CREATE']), true)
    expect([...all].sort()).toEqual(['CYCLE_CREATE', 'ISSUE_CREATE', 'ISSUE_DELETE_ANY', 'ISSUE_EDIT'])
    expect([...toggleGroup(issues, all, false)]).toEqual(['CYCLE_CREATE'])
  })

  it('el módulo completo no incluye los permisos que la persona no puede dar', () => {
    const grantable = (key) => key !== 'ISSUE_DELETE_ANY'
    expect([...toggleGroup(issues, new Set(), true, grantable)].sort()).toEqual(['ISSUE_CREATE', 'ISSUE_EDIT'])
    // Y al desmarcar, uno que ya estaba y no puede tocar se queda
    expect([...toggleGroup(issues, new Set(['ISSUE_DELETE_ANY', 'ISSUE_EDIT']), false, grantable)]).toEqual(['ISSUE_DELETE_ANY'])
  })

  it('marca un permiso suelto y ordena como el catálogo', () => {
    const selected = togglePermission(togglePermission(new Set(), 'CYCLE_CREATE'), 'ISSUE_CREATE')
    expect(orderedPermissions(groups, selected)).toEqual(['ISSUE_CREATE', 'CYCLE_CREATE'])
    expect([...togglePermission(selected, 'CYCLE_CREATE')]).toEqual(['ISSUE_CREATE'])
  })

  it('compara dos listas sin importar el orden', () => {
    expect(samePermissions(['a', 'b'], ['b', 'a'])).toBe(true)
    expect(samePermissions(['a'], ['a', 'b'])).toBe(false)
    expect(samePermissions([], [])).toBe(true)
  })
})

describe('roles: quién puede asignar qué', () => {
  const pm = { myRole: 'OWNER', myPermissions: allPermissionKeys(groups) }
  const admin = { myRole: 'MEMBER', myPermissions: ['ISSUE_EDIT', 'CYCLE_CREATE'] }

  it('el project manager asigna cualquier rol', () => {
    expect(assignableRoles(roles, pm)).toEqual(roles)
    expect(assignableRoles(roles, pm, { includeManager: false })).toEqual([member, leader, guest])
  })

  it('quien no lo es solo asigna roles que no tengan más permisos que el suyo, y nunca project manager', () => {
    // «Miembro» tiene ISSUE_CREATE, que a esta persona le falta
    expect(assignableRoles(roles, admin)).toEqual([leader, guest])
    expect(coversRole(admin, member)).toBe(false)
    expect(coversRole(admin, leader)).toBe(true)
    expect(coversRole(admin, manager)).toBe(false)
  })

  it('un rol nuevo empieza con los permisos de «Miembro»', () => {
    expect(blankRole(roles)).toMatchObject({ key: 'new', id: null, kind: 'CUSTOM', name: '', permissions: member.permissions })
  })

  it('…sin los que quien lo crea no puede dar (quedarían marcados sin poder quitarse)', () => {
    expect(blankRole(roles, (permission) => permission !== 'ISSUE_CREATE').permissions).toEqual(['ISSUE_EDIT'])
  })
})
