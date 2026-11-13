import { useId, useMemo, useState } from 'react'
import { Lock, Plus, ShieldCheck, Sparkles, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { LockNote } from '@/components/common/LockNote'
import { ErrorState } from '@/components/common/States'
import { t, tn, tx } from '@/i18n'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { can, isManager } from '@/lib/permissions'
import { stagger } from '@/lib/motion'
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

const KIND_HINT = { MANAGER: t('de fábrica · todo'), MEMBER: t('de fábrica'), CUSTOM: t('propio') }

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
  const selected = creating
    ? blankRole(roles, (permission) => can(workspace, permission))
    : (roles.find((role) => role.key === selectedKey) ?? roles[0])

  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <section aria-label={t('Roles')} className="tf-panel flex flex-col gap-3 px-4.5 py-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold">{t('Roles')}</h2>
          {canManage && (
            <Button size="sm" variant={creating ? 'secondary' : 'default'} onClick={() => setSelectedKey('new')}>
              <Plus strokeWidth={2.5} />
              {t('Nuevo rol')}
            </Button>
          )}
        </div>
        <p className="text-[13px] text-muted-foreground">
          {t('Quien crea el workspace es project manager. Los demás entran como «Miembro» o con el rol que les des al invitarlos.')}
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
                      {KIND_HINT[role.kind]} · {t('{count} de {total}', { count: role.permissions.length, total })}
                    </span>
                  </span>
                  <span
                    className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground"
                    title={tn(role.memberCount, '{count} persona con este rol', '{count} personas con este rol')}
                  >
                    <Users className="size-3" aria-hidden="true" />
                    {role.memberCount}
                  </span>
                </button>
              </li>
            )
          })}
          {creating && (
            <li
              aria-current="true"
              className="tf-pop flex items-center gap-2.5 rounded-xl border border-dashed border-accent-text/50 bg-accent-soft px-3 py-2 text-accent-text"
            >
              <Sparkles className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold">{t('Rol nuevo')}</span>
                <span className="font-mono text-[11px] opacity-80">{t('sin guardar')}</span>
              </span>
            </li>
          )}
        </ul>
        {!canManage && <LockNote>{t('Solo quien gestiona roles puede crearlos o cambiarlos.')}</LockNote>}
      </section>

      {/* Al cambiar de rol (o empezar uno nuevo) el panel entra con un fundido; guardar no lo vuelve a animar */}
      <div key={selected.key} className="tf-fade min-w-0">
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
          toast.success(isNew ? t('Rol «{name}» creado', { name: saved.name }) : t('Rol «{name}» guardado', { name: saved.name }))
          onSaved(saved)
        },
        onError: (error) => {
          const mapped = applyFieldErrors(error, (field, value) => field === 'name' && setNameError(value.message), { fields: ['name'] })
          // «Ya hay un rol llamado…» (409) también va bajo el nombre
          if (!mapped && error?.status === 409) setNameError(error.message)
          else if (!mapped) notifyError(error, t('No se pudo guardar el rol'))
        },
      },
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label={isNew ? t('Rol nuevo') : t('Rol {name}', { name: role.name })}
      className="tf-panel flex min-w-0 flex-col gap-4 px-4.5 py-4"
      noValidate
    >
      {isNew && (
        <div className="tf-enter flex items-start gap-3 rounded-xl border border-dashed border-accent-text/40 bg-accent-soft/60 px-3.5 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card text-accent-text">
            <Sparkles className="size-4.5" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-semibold">{t('Crear un rol')}</span>
            <span className="text-[13px] text-muted-foreground">
              {t('Empieza con los permisos de «Miembro». Ponle un nombre y marca o quita lo que necesite; se aplica a quien lo tenga en cuanto lo guardes.')}
            </span>
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
          {role.kind === 'CUSTOM' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={nameId} className="text-sm font-medium">
                  {t('Nombre del rol')}
                </label>
                <Input
                  id={nameId}
                  value={name}
                  maxLength={ROLE_NAME_MAX}
                  disabled={!editable}
                  placeholder={t('Por ejemplo: Líder, Desarrollador, Invitado')}
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
                  {t('Descripción')} <span className="font-normal text-muted-foreground">{t('(opcional)')}</span>
                </label>
                <Input
                  id={descriptionId}
                  value={description}
                  maxLength={ROLE_DESCRIPTION_MAX}
                  disabled={!editable}
                  placeholder={t('Para qué es este rol')}
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
            {tx('{count} de {total} permisos', {
              count: <strong className="text-foreground">{permissions.length}</strong>,
              total,
            })}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {tn(role.memberCount, '{count} persona con este rol', '{count} personas con este rol')}
          </p>
        </div>
      </div>

      {role.kind === 'MANAGER' && (
        <LockNote>{t('Es el rol de quien crea el workspace: siempre tiene todos los permisos y no se edita.')}</LockNote>
      )}
      {role.kind !== 'MANAGER' && canManage && !editable && (
        <LockNote>{t('Este rol tiene permisos que el tuyo no tiene: solo un project manager puede cambiarlo.')}</LockNote>
      )}

      {/* En columnas (los módulos tienen alturas distintas: una cuadrícula dejaría huecos debajo de los cortos) */}
      <div className="columns-[320px] gap-3">
        {groups.map((group, index) => (
          <PermissionGroupCard
            key={group.key}
            index={index}
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
              {t('Eliminar rol')}
            </Button>
          )}
          <span className="ml-auto flex items-center gap-2">
            {isNew && (
              <Button type="button" variant="ghost" onClick={onCancelNew}>
                {t('Cancelar')}
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
                {t('Descartar cambios')}
              </Button>
            )}
            <Button type="submit" disabled={!canSave}>
              {save.isPending && <Spinner />}
              {isNew ? t('Crear rol') : t('Guardar cambios')}
            </Button>
          </span>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('¿Eliminar el rol «{name}»?', { name: role.name })}
        description={
          role.memberCount > 0
            ? tn(
                role.memberCount,
                '{count} persona pasará al rol «Miembro», igual que las invitaciones pendientes con este rol.',
                '{count} personas pasarán al rol «Miembro», igual que las invitaciones pendientes con este rol.',
              )
            : t('Las invitaciones pendientes con este rol pasarán a «Miembro».')
        }
        confirmLabel={t('Eliminar rol')}
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(role.id, {
            onSuccess: () => {
              toast.success(t('Rol «{name}» eliminado', { name: role.name }))
              setConfirmDelete(false)
              onDeleted()
            },
            onError: (error) => notifyError(error, t('No se pudo eliminar el rol')),
          })
        }
      />
    </form>
  )
}

/** Un módulo con sus permisos y la casilla que marca o desmarca el módulo completo. */
function PermissionGroupCard({ group, index, selected, editable, grantable, onToggle, onToggleAll }) {
  const allId = useId()
  // La casilla del módulo mira solo lo que la persona puede dar: con todo eso marcado está «todo» (y un clic lo quita),
  // aunque el módulo tenga permisos que no puede tocar
  const mine = { ...group, permissions: group.permissions.filter((permission) => grantable(permission.key)) }
  const state = groupState(editable ? mine : group, selected)
  const count = group.permissions.filter((permission) => selected.has(permission.key)).length

  return (
    <fieldset className="tf-enter mb-3 flex break-inside-avoid flex-col rounded-xl border" style={stagger(index, 35, 10)}>
      <legend className="sr-only">{group.label}</legend>
      <div className="flex items-center gap-2.5 rounded-t-xl bg-column px-3 py-2">
        <Checkbox
          id={allId}
          checked={state === 'all' ? true : state === 'some' ? 'indeterminate' : false}
          disabled={!editable || mine.permissions.length === 0}
          onCheckedChange={() => onToggleAll(state !== 'all')}
          aria-label={t('Todo el módulo {name}', { name: group.label })}
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
    <li className={cn('flex items-start gap-2.5 border-t px-3 py-2 transition-colors duration-150', checked && 'bg-accent-soft/35')}>
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
        <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-label={t('Tu rol no tiene este permiso: no lo puedes dar')} />
      )}
    </li>
  )
}
