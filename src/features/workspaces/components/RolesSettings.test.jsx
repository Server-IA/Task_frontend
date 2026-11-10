import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { RolesSettings } from './RolesSettings'

const saveRole = vi.fn()
const deleteRole = vi.fn()
let roles

vi.mock('../hooks', () => ({
  useRoles: () => ({ data: roles, isLoading: false }),
  usePermissionCatalog: () => ({ data: { groups }, isLoading: false }),
  useSaveRole: () => ({ mutate: saveRole, isPending: false }),
  useDeleteRole: () => ({ mutate: deleteRole, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const groups = [
  {
    key: 'ISSUES',
    label: 'Tareas',
    permissions: [
      { key: 'ISSUE_CREATE', label: 'Crear tareas y bugs', description: 'Crear tareas.' },
      { key: 'ISSUE_EDIT', label: 'Editar tareas', description: 'Editar.' },
      { key: 'ISSUE_DELETE_ANY', label: 'Eliminar cualquier tarea', description: 'Borrar.' },
    ],
  },
  { key: 'CYCLES', label: 'Ciclos', permissions: [{ key: 'CYCLE_CREATE', label: 'Crear ciclos', description: 'Crear ciclos.' }] },
]
const all = ['ISSUE_CREATE', 'ISSUE_EDIT', 'ISSUE_DELETE_ANY', 'CYCLE_CREATE']
const manager = { key: 'MANAGER', id: null, kind: 'MANAGER', name: 'Project manager', description: 'Todo.', permissions: all, memberCount: 1 }
const member = { key: 'MEMBER', id: null, kind: 'MEMBER', name: 'Miembro', description: 'El de entrada.', permissions: ['ISSUE_CREATE'], memberCount: 2 }
const leader = { key: 'r1', id: 'r1', kind: 'CUSTOM', name: 'Líder', description: 'Coordina', permissions: ['ISSUE_EDIT'], memberCount: 3 }

const pm = { slug: 'acme', myRole: 'OWNER', myPermissions: all }

beforeEach(() => {
  roles = [manager, member, leader]
  saveRole.mockReset()
  deleteRole.mockReset()
})

describe('RolesSettings', () => {
  it('el project manager aparece con todo marcado y sin poder cambiarse', () => {
    render(<RolesSettings workspace={pm} />)
    expect(screen.getByText(/siempre tiene todos los permisos y no se edita/)).toBeInTheDocument()
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).toBeChecked()
      expect(box).toBeDisabled()
    }
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
  })

  it('crea un rol con nombre y un módulo completo marcado', async () => {
    render(<RolesSettings workspace={pm} />)
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo rol' }))
    // Empieza con los permisos de «Miembro»
    expect(screen.getByRole('checkbox', { name: 'Crear tareas y bugs' })).toBeChecked()

    await userEvent.type(screen.getByRole('textbox', { name: 'Nombre del rol' }), 'Desarrollador')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Todo el módulo Tareas' }))
    await userEvent.click(screen.getByRole('button', { name: 'Crear rol' }))

    expect(saveRole).toHaveBeenCalledTimes(1)
    expect(saveRole.mock.calls[0][0]).toMatchObject({
      name: 'Desarrollador',
      description: '',
      permissions: ['ISSUE_CREATE', 'ISSUE_EDIT', 'ISSUE_DELETE_ANY'],
    })
    expect(saveRole.mock.calls[0][0].role).toMatchObject({ kind: 'CUSTOM', id: null })
  })

  it('sin nombre no se puede crear', async () => {
    render(<RolesSettings workspace={pm} />)
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo rol' }))
    expect(screen.getByRole('button', { name: 'Crear rol' })).toBeDisabled()
  })

  it('cambia los permisos de «Miembro» (el nombre no se edita) y muestra el 409 del nombre en su campo', async () => {
    render(<RolesSettings workspace={pm} />)
    await userEvent.click(screen.getByRole('button', { name: /Miembro/ }))
    expect(screen.queryByRole('textbox', { name: 'Nombre del rol' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Crear ciclos' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(saveRole.mock.calls[0][0]).toMatchObject({ role: member, permissions: ['ISSUE_CREATE', 'CYCLE_CREATE'] })

    // Un rol creado con un nombre repetido
    await userEvent.click(screen.getByRole('button', { name: /Líder/ }))
    saveRole.mockImplementation((_values, { onError }) => onError({ status: 409, message: 'Ya hay un rol llamado «Miembro»' }))
    const name = screen.getByRole('textbox', { name: 'Nombre del rol' })
    await userEvent.clear(name)
    await userEvent.type(name, 'Miembro')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya hay un rol llamado «Miembro»')
  })

  it('elimina un rol creado avisando cuántas personas pasan a «Miembro»', async () => {
    deleteRole.mockImplementation((_id, { onSuccess }) => onSuccess())
    render(<RolesSettings workspace={pm} />)
    await userEvent.click(screen.getByRole('button', { name: /Líder/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar rol' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('3 personas pasarán al rol «Miembro»')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar rol' }))
    await waitFor(() => expect(deleteRole).toHaveBeenCalledWith('r1', expect.anything()))
  })

  it('sin el permiso de gestionar roles solo se pueden ver', async () => {
    render(<RolesSettings workspace={{ slug: 'acme', myRole: 'MEMBER', myPermissions: ['ISSUE_CREATE'] }} />)
    expect(screen.queryByRole('button', { name: 'Nuevo rol' })).not.toBeInTheDocument()
    expect(screen.getByText(/Solo quien gestiona roles/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Líder/ }))
    for (const box of screen.getAllByRole('checkbox')) expect(box).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Eliminar rol' })).not.toBeInTheDocument()
  })

  it('quien gestiona roles sin ser project manager no marca permisos que no tiene ni edita un rol con más permisos', async () => {
    const admin = { slug: 'acme', myRole: 'MEMBER', myPermissions: ['ISSUE_EDIT', 'CYCLE_CREATE', 'ROLE_MANAGE'] }
    render(<RolesSettings workspace={admin} />)

    // «Líder» (ISSUE_EDIT) cabe en sus permisos: lo edita, pero no puede marcar lo que le falta
    await userEvent.click(screen.getByRole('button', { name: /Líder/ }))
    expect(screen.getByRole('checkbox', { name: 'Crear ciclos' })).toBeEnabled()
    expect(screen.getByRole('checkbox', { name: 'Eliminar cualquier tarea' })).toBeDisabled()

    // «Miembro» tiene ISSUE_CREATE, que a esta persona le falta: solo lectura, con su aviso
    await userEvent.click(screen.getByRole('button', { name: /Miembro/ }))
    expect(screen.getByText(/tiene permisos que el tuyo no tiene/)).toBeInTheDocument()
    for (const box of screen.getAllByRole('checkbox')) expect(box).toBeDisabled()
  })
})
