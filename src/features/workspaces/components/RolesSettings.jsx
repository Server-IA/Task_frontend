import { useId, useMemo, useState } from 'react'
import { Lock, Plus, ShieldCheck, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { LockNote } from '@/components/common/LockNote'
import { ErrorState } from '@/components/common/States'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { can, isManager } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useDeleteRole, usePermissionCatalog, useRoles, useSaveRole } from '../hooks'
import {
  allPermissionKeys,
  blankRole,
  coversRole,
  groupState,
  orderedPermissions,
  ROLE_DESCRIPTION_MAX,
  ROLE_NAME_MAX,
  samePermissions,
  toggleGroup,
  togglePermission,
} from '../roles'

const KIND_HINT = { MANAGER: 'de fábrica · todo', MEMBER: 'de fábrica', CUSTOM: 'propio' }

/**
 * Roles del workspace: a la izquierda la lista (project manager, «Miembro» y los creados) y a la derecha los permisos
 * del rol elegido, por módulo, con una casilla para marcar el módulo completo. Los ve cualquier miembro; los crea y
 * edita quien tiene el permiso de gestionar roles (y solo con los permisos que su propio rol tiene).
 * @param {{ workspace: import('@/api/types').WorkspaceResponse }} props
 */
export function RolesSettings({ workspace }) {
  const { data: roles, isLoading, error, refetch } = useRoles(workspace.slug)
  const catalog = usePermissionCatalog()
  const canManage = can(workspace, 'ROLE_MANAGE')
  // Clave del rol elegido; 'new' mientras se crea uno
  const [selectedKey, setSelectedKey] = useState(null)
  const groups = catalog.data?.groups ?? []
  const total = allPermissionKeys(groups).length

  if (isLoading || catalog.isLoading) return <CenteredSpinner />
  if (error || catalog.error) return <ErrorState error={error ?? catalog.error} onRetry={error ? refetch : catalog.refetch} />
  if (!roles) return null

  const creating = selectedKey === 'new'
  const selected = creating ? blankRole(roles) : (roles.find((role) => role.key === selectedKey) ?? roles[0])

  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <section aria-label="Roles" className="tf-panel flex flex-col gap-3 px-4.5 py-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold">Roles</h2>
          {canManage && (
            <Button size="sm" variant={creating ? 'secondary' : 'default'} onClick={() => setSelectedKey('new')}>
              <Plus strokeWidth={2.5} />
              Nuevo rol
            </Button>
          )}
        </div>
        <p className="text-[13px] text-muted-foreground">
          Quien crea el workspace es project manager. Los demás entran como «Miembro» o con el rol que les des al invitarlos.
        </p>
        <ul className="flex flex-col gap-1">
          {roles.map((role) => {
            const active = !creating && role.key === selected.key
            return (
              <li key={role.key}>
                <button
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => setSelectedKey(role.key)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl border border-transparent px-3 py-2 text-left transition-colors duration-150 outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring',
                    active && 'border-accent-text/40 bg-accent-soft hover:bg-accent-soft',
                  )}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">{role.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {KIND_HINT[role.kind]} · {role.permissions.length} de {total}
                    </span>
                  </span>
                  <span
                    className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground"
                    title={`${role.memberCount} ${role.memberCount === 1 ? 'persona' : 'personas'} con este rol`}
                  >
                    <Users className="size-3" aria-hidden="true" />
                    {role.memberCount}
                  </span>
                </button>
              </li>
            )
          })}
          {creating && (
            <li className="flex items-center gap-2.5 rounded-xl border border-dashed border-accent-text/50 bg-accent-soft px-3 py-2 text-sm font-semibold text-accent-text">
              Rol nuevo
            </li>
          )}
        </ul>
        {!canManage && <LockNote>Solo quien gestiona roles puede crearlos o cambiarlos.</LockNote>}
      </section>

      <RoleEditor
        // Cada rol empieza con sus propios datos (y un rol recién guardado, con los del servidor)
        key={`${selected.key}:${selected.permissions.join(',')}:${selected.name}:${selected.description ?? ''}`}
        workspace={workspace}
        role={selected}
        groups={groups}
        canManage={canManage}
        onSaved={(saved) => setSelectedKey(saved.key)}
        onDeleted={() => setSelectedKey(null)}
        onCancelNew={() => setSelectedKey(null)}
      />
    </div>
  )
}

function RoleEditor({ workspace, role, groups, canManage, onSaved, onDeleted, onCancelNew }) {
  const save = useSaveRole(workspace.slug)
  const remove = useDeleteRole(workspace.slug)
  const nameId = useId()
  const descriptionId = useId()
  const [name, setName] = useState(role.name)
  const [description, setDescription] = useState(role.description ?? '')
  const [selected, setSelected] = useState(() => new Set(role.permissions))
  const [nameError, setNameError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isNew = !role.id && role.kind === 'CUSTOM'
  const manager = isManager(workspace.myRole)
  // El project manager no se edita; los demás, solo si se gestionan roles y el rol no tiene más permisos que uno
  const editable = role.kind !== 'MANAGER' && canManage && (isNew || coversRole(workspace, role))
  // Quien no es project manager solo da permisos que su propio rol tiene
  const grantable = (permission) => manager || can(workspace, permission)
  const total = allPermissionKeys(groups).length
  const permissions = useMemo(() => orderedPermissions(groups, selected), [groups, selected])

  const trimmedName = name.trim()
  const dirty =
    isNew ||
    !samePermissions(permissions, role.permissions) ||
    (role.kind === 'CUSTOM' && (trimmedName !== role.name || description.trim() !== (role.description ?? '')))
  const canSave = editable && dirty && !save.isPending && (role.kind !== 'CUSTOM' || trimmedName.length > 0)

  const onSubmit = (event) => {
    event.preventDefault()
    if (!canSave) return
    setNameError(null)
    save.mutate(
      { role, name: trimmedName, description: description.trim(), permissions },
      {
        onSuccess: (saved) => {
          toast.success(isNew ? `Rol «${saved.name}» creado` : `Rol «${saved.name}» guardado`)
          onSaved(saved)
        },
        onError: (error) => {
          const mapped = applyFieldErrors(error, (field, value) => field === 'name' && setNameError(value.message), { fields: ['name'] })
          // «Ya hay un rol llamado…» (409) también va bajo el nombre
          if (!mapped && error?.status === 409) setNameError(error.message)
          else if (!mapped) notifyError(error, 'No se pudo guardar el rol')
        },
      },
    )
  }

  return (
    <form onSubmit={onSubmit} aria-label={isNew ? 'Rol nuevo' : `Rol ${role.name}`} className="tf-panel flex min-w-0 flex-col gap-4 px-4.5 py-4" noValidate>
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
          {role.kind === 'CUSTOM' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={nameId} className="text-sm font-medium">
                  Nombre del rol
                </label>
                <Input
                  id={nameId}
                  value={name}
                  maxLength={ROLE_NAME_MAX}
                  disabled={!editable}
                  placeholder="Por ejemplo: Líder, Desarrollador, Invitado"
                  aria-invalid={Boolean(nameError)}
                  onChange={(event) => {
                    setName(event.target.value)
                    setNameError(null)
                  }}
                  // Un rol nuevo empieza por su nombre
                  autoFocus={isNew}
                />
                {nameError && (
                  <p role="alert" className="text-sm text-destructive">
                    {nameError}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={descriptionId} className="text-sm font-medium">
                  Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
                </label>
                <Input
                  id={descriptionId}
                  value={description}
                  maxLength={ROLE_DESCRIPTION_MAX}
                  disabled={!editable}
                  placeholder="Para qué es este rol"
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </>
          ) : (
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <ShieldCheck className="size-4.5 text-accent-text" aria-hidden="true" />
                {role.name}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{role.description}</p>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <p className="font-mono text-xs text-muted-foreground">
            <strong className="text-foreground">{permissions.length}</strong> de {total} permisos
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {role.memberCount} {role.memberCount === 1 ? 'persona' : 'personas'} con este rol
          </p>
        </div>
      </div>

      {role.kind === 'MANAGER' && <LockNote>Es el rol de quien crea el workspace: siempre tiene todos los permisos y no se edita.</LockNote>}
      {role.kind !== 'MANAGER' && canManage && !editable && (
        <LockNote>Este rol tiene permisos que el tuyo no tiene: solo un project manager puede cambiarlo.</LockNote>
      )}

      {/* En columnas (los módulos tienen alturas distintas: una cuadrícula dejaría huecos debajo de los cortos) */}
      <div className="columns-[320px] gap-3">
        {groups.map((group) => (
          <PermissionGroupCard
            key={group.key}
            group={group}
            selected={selected}
            editable={editable}
            grantable={grantable}
            onToggle={(key) => setSelected((current) => togglePermission(current, key))}
            onToggleAll={(checked) => setSelected((current) => toggleGroup(group, current, checked, grantable))}
          />
        ))}
      </div>

      {editable && (
        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          {role.id && (
            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 />
              Eliminar rol
            </Button>
          )}
          <span className="ml-auto flex items-center gap-2">
            {isNew && (
              <Button type="button" variant="ghost" onClick={onCancelNew}>
                Cancelar
              </Button>
            )}
            {!isNew && dirty && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setName(role.name)
                  setDescription(role.description ?? '')
                  setSelected(new Set(role.permissions))
                  setNameError(null)
                }}
              >
                Descartar cambios
              </Button>
            )}
            <Button type="submit" disabled={!canSave}>
              {save.isPending && <Spinner />}
              {isNew ? 'Crear rol' : 'Guardar cambios'}
            </Button>
          </span>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`¿Eliminar el rol «${role.name}»?`}
        description={
          role.memberCount > 0
            ? `${role.memberCount} ${role.memberCount === 1 ? 'persona pasará' : 'personas pasarán'} al rol «Miembro», igual que las invitaciones pendientes con este rol.`
            : 'Las invitaciones pendientes con este rol pasarán a «Miembro».'
        }
        confirmLabel="Eliminar rol"
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(role.id, {
            onSuccess: () => {
              toast.success(`Rol «${role.name}» eliminado`)
              setConfirmDelete(false)
              onDeleted()
            },
            onError: (error) => notifyError(error, 'No se pudo eliminar el rol'),
          })
        }
      />
    </form>
  )
}

/** Un módulo con sus permisos y la casilla que marca o desmarca el módulo completo. */
function PermissionGroupCard({ group, selected, editable, grantable, onToggle, onToggleAll }) {
  const allId = useId()
  const state = groupState(group, selected)
  const count = group.permissions.filter((permission) => selected.has(permission.key)).length

  return (
    <fieldset className="mb-3 flex break-inside-avoid flex-col rounded-xl border">
      <legend className="sr-only">{group.label}</legend>
      <div className="flex items-center gap-2.5 rounded-t-xl bg-column px-3 py-2">
        <Checkbox
          id={allId}
          checked={state === 'all' ? true : state === 'some' ? 'indeterminate' : false}
          disabled={!editable}
          onCheckedChange={(checked) => onToggleAll(checked === true)}
          aria-label={`Todo el módulo ${group.label}`}
          className="bg-card"
        />
        <label htmlFor={allId} className="min-w-0 flex-1 truncate font-mono text-[11px] font-semibold tracking-[0.06em] uppercase">
          {group.label}
        </label>
        <span className="font-mono text-[11px] text-muted-foreground">
          {count}/{group.permissions.length}
        </span>
      </div>
      <ul className="flex flex-col">
        {group.permissions.map((permission) => (
          <PermissionRow
            key={permission.key}
            permission={permission}
            checked={selected.has(permission.key)}
            disabled={!editable || !grantable(permission.key)}
            locked={editable && !grantable(permission.key)}
            onToggle={() => onToggle(permission.key)}
          />
        ))}
      </ul>
    </fieldset>
  )
}

function PermissionRow({ permission, checked, disabled, locked, onToggle }) {
  const id = useId()
  return (
    <li className="flex items-start gap-2.5 border-t px-3 py-2">
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={onToggle} className="mt-0.5" aria-describedby={`${id}-hint`} />
      <span className="flex min-w-0 flex-1 flex-col">
        <label htmlFor={id} className={cn('text-[13px] font-medium', disabled && 'text-muted-foreground')}>
          {permission.label}
        </label>
        <span id={`${id}-hint`} className="text-xs text-muted-foreground">
          {permission.description}
        </span>
      </span>
      {locked && (
        <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-label="Tu rol no tiene este permiso: no lo puedes dar" />
      )}
    </li>
  )
}
