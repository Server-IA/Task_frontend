import { useState } from 'react'
import { Bookmark, ChevronDown, Lock, Pencil, RefreshCcw, Share2, Trash2, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Spinner } from '@/components/common/Loaders'
import { useIsManager } from '@/features/workspaces/hooks'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useActiveSavedView, useCreateSavedView, useDeleteSavedView, useUpdateSavedView } from '../hooks'
import { applyViewToParams, canEditView, clearViewParams, reorderableGroups, summarizeViewFilters } from '../savedViews'
import { ReorderViewsDialog } from './ReorderViewsDialog'

/** @typedef {import('@/api/types').SavedView} SavedView */

const NAME_MAX = 40

/**
 * Barra de vistas guardadas sobre los filtros de tareas: «Todas» y cada vista como pastilla (compartida o personal)
 * con cuántas tareas muestra, la activa resaltada y marcada «cambiado» si la URL ya no coincide con ella. Desde aquí
 * se guarda la vista actual, se actualiza, se cambia de nombre, se comparte, se elimina y se ordenan (según permisos).
 * @param {{ slug: string, project: import('@/api/types').ProjectResponse, meta: object,
 *           issueFilters: ReturnType<typeof import('@/features/issues/useIssueFilters').useIssueFilters> }} props
 */
export function SavedViewsBar({ slug, project, meta, issueFilters }) {
  const { views, active, current, changed } = useActiveSavedView(slug, project.id, issueFilters)
  const update = useUpdateSavedView(slug, project.id)
  const isManager = useIsManager()
  const [renaming, setRenaming] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [ordering, setOrdering] = useState(false)
  const canEditActive = active ? canEditView(active, isManager) : false
  const { canShared, canPersonal } = reorderableGroups(views, isManager)
  const modified = Boolean(active) && changed.length > 0

  const apply = (view) => issueFilters.replaceParams((previous) => applyViewToParams(previous, view))
  const saveChanges = (view) =>
    update.mutate(
      { viewId: view.id, filters: current },
      {
        onSuccess: () => toast.success(`Vista «${view.name}» actualizada`),
        onError: (error) => notifyError(error, 'No se pudo actualizar la vista'),
      },
    )
  const setShared = (view, shared) =>
    update.mutate(
      { viewId: view.id, shared },
      {
        onSuccess: () => toast.success(shared ? `«${view.name}» ahora es compartida` : `«${view.name}» ahora es personal`),
        onError: (error) => notifyError(error),
      },
    )

  return (
    <nav aria-label="Vistas guardadas" className="flex flex-wrap items-center gap-1.5 px-1">
      <button
        type="button"
        aria-current={!active ? 'page' : undefined}
        title="Todas las tareas del proyecto"
        onClick={() => issueFilters.replaceParams(clearViewParams)}
        className={pillClass(!active)}
      >
        Todas
        <ViewCount value={project.issueCount} active={!active} />
      </button>
      {views.map((view) => (
        <ViewPill
          key={view.id}
          view={view}
          active={active?.id === view.id}
          changed={active?.id === view.id && changed.length > 0}
          canEdit={canEditView(view, isManager)}
          canShare={isManager && Boolean(view.mine)}
          onApply={() => apply(view)}
          onSaveChanges={() => saveChanges(view)}
          onRename={() => setRenaming(view)}
          onDelete={() => setDeleting(view)}
          onShare={(shared) => setShared(view, shared)}
        />
      ))}

      <span className="ml-auto flex flex-wrap items-center gap-1.5">
        {views.length > 0 && !modified && (
          <span className="mr-1.5 hidden items-center gap-3 text-xs text-muted-foreground xl:flex">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" aria-hidden="true" />
              compartida
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="size-3.5" aria-hidden="true" />
              personal
            </span>
          </span>
        )}
        {(canShared || canPersonal) && (
          <button
            type="button"
            onClick={() => setOrdering(true)}
            className="mr-1.5 rounded-md px-1 text-xs font-medium text-accent-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ordenar vistas
          </button>
        )}
        {modified && (
          <>
            <span className="tf-fade text-xs text-muted-foreground">Vista modificada</span>
            <Button variant="ghost" size="sm" className="h-8 rounded-full" onClick={() => apply(active)}>
              Descartar
            </Button>
            {canEditActive && (
              <Button variant="outline" size="sm" className="h-8 rounded-full" disabled={update.isPending} onClick={() => saveChanges(active)}>
                {update.isPending && <Spinner />}
                Actualizar vista
              </Button>
            )}
          </>
        )}
        <SaveViewPopover
          slug={slug}
          project={project}
          meta={meta}
          current={current}
          active={active}
          canEditActive={canEditActive}
          isManager={isManager}
          onCreated={apply}
          onUpdateActive={() => saveChanges(active)}
        />
      </span>

      <RenameDialog slug={slug} projectId={project.id} view={renaming} onClose={() => setRenaming(null)} />
      <ReorderViewsDialog
        slug={slug}
        projectId={project.id}
        views={views}
        isManager={isManager}
        open={ordering}
        onOpenChange={setOrdering}
      />
      <DeleteViewDialog
        slug={slug}
        projectId={project.id}
        view={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(view) => view.id === active?.id && issueFilters.replaceParams(clearViewParams)}
      />
    </nav>
  )
}

const pillClass = (active) =>
  cn(
    'flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring',
    active ? 'border-accent-text bg-accent-soft font-semibold text-accent-text' : 'bg-card hover:border-dash',
  )

/** Cuántas tareas muestra la vista, en monoespaciada (del color de la pastilla si está activa). */
function ViewCount({ value, active }) {
  if (value == null) return null
  return (
    <span className={cn('font-mono text-[11px] font-normal', active ? 'text-accent-text' : 'text-muted-foreground')} title="Tareas que muestra">
      {value}
    </span>
  )
}

/** Pastilla de una vista: icono compartida/personal, nombre, tareas, «cambiado» y el menú de acciones si se puede editar. */
function ViewPill({ view, active, changed, canEdit, canShare, onApply, onSaveChanges, onRename, onDelete, onShare }) {
  const Icon = view.shared ? Users : Lock
  const hint = view.shared ? 'Vista compartida con el proyecto' : 'Vista personal, solo la ves tú'
  const showMenu = canEdit || canShare

  return (
    <span className={cn(pillClass(active), 'gap-0 p-0')}>
      <button
        type="button"
        aria-current={active ? 'page' : undefined}
        title={hint}
        onClick={onApply}
        className={cn('flex h-full items-center gap-1.5 rounded-full py-0 pl-3 outline-none focus-visible:ring-2 focus-visible:ring-ring', showMenu ? 'pr-1.5' : 'pr-3')}
      >
        <Icon className="size-3.5 shrink-0" aria-label={view.shared ? 'compartida' : 'personal'} />
        <span className="max-w-48 truncate">{view.name}</span>
        <ViewCount value={view.issueCount} active={active} />
        {changed && (
          <span className="tf-pop rounded-full bg-primary px-1.5 font-mono text-[10px] font-semibold text-primary-foreground">cambiado</span>
        )}
      </button>
      {showMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Acciones de la vista «${view.name}»`}
              className="mr-1 flex size-6 items-center justify-center rounded-full opacity-70 outline-none hover:bg-foreground/5 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:opacity-100"
            >
              <ChevronDown className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-56">
            {canEdit && active && changed && (
              <DropdownMenuItem onSelect={onSaveChanges}>
                <RefreshCcw />
                Actualizar con los filtros actuales
              </DropdownMenuItem>
            )}
            {canEdit && (
              <DropdownMenuItem onSelect={onRename}>
                <Pencil />
                Cambiar nombre
              </DropdownMenuItem>
            )}
            {canShare && (
              <DropdownMenuItem onSelect={() => onShare(!view.shared)}>
                {view.shared ? <Lock /> : <Share2 />}
                {view.shared ? 'Hacer personal' : 'Compartir con el proyecto'}
              </DropdownMenuItem>
            )}
            {canEdit && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <Trash2 />
                  Eliminar vista
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </span>
  )
}

/**
 * «Guardar vista»: nombre, quién la ve (compartida solo para el project manager) y el resumen de lo que se guarda.
 * Si hay una vista activa que se puede editar, también ofrece actualizarla.
 */
function SaveViewPopover({ slug, project, meta, current, active, canEditActive, isManager, onCreated, onUpdateActive }) {
  const create = useCreateSavedView(slug, project.id)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [shared, setShared] = useState(false)
  const summary = summarizeViewFilters(current, meta)

  const onOpenChange = (next) => {
    setOpen(next)
    if (next) {
      setName('')
      setShared(false)
    }
  }

  const save = (event) => {
    event.preventDefault()
    const value = name.trim()
    if (!value) return
    create.mutate(
      { name: value, shared: isManager && shared, filters: current },
      {
        onSuccess: (view) => {
          toast.success(`Vista «${view.name}» guardada`)
          setOpen(false)
          onCreated(view)
        },
        onError: (error) => notifyError(error, 'No se pudo guardar la vista'),
      },
    )
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 items-center gap-1.5 rounded-full border border-accent-text bg-accent-soft px-3 text-[13px] font-semibold text-accent-text transition-opacity duration-150 outline-none hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bookmark className="size-3.5" />
          Guardar vista
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(420px,calc(100vw-2rem))] rounded-[18px] p-0">
        <form onSubmit={save} className="flex flex-col gap-3.5 px-4.5 pt-4 pb-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold">Guardar vista</h2>
            {active && <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">a partir de «{active.name}»</span>}
            <Button type="button" variant="ghost" size="icon" className="ml-auto size-7 text-muted-foreground" aria-label="Cerrar" onClick={() => setOpen(false)}>
              <X />
            </Button>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Nombre
            <Input
              autoFocus
              value={name}
              maxLength={NAME_MAX}
              onChange={(event) => setName(event.target.value)}
              placeholder="Para la daily"
              className="text-sm font-normal"
            />
          </label>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Quién la ve</legend>
            <VisibilityOption
              checked={!shared}
              onChange={() => setShared(false)}
              icon={Lock}
              title="Personal"
              description="Solo tú la ves en tu barra de vistas."
            />
            <VisibilityOption
              checked={shared}
              disabled={!isManager}
              onChange={() => setShared(true)}
              icon={Users}
              title="Compartida"
              description="Aparece en la barra de todo el proyecto. Los miembros la usan pero no la cambian."
            />
          </fieldset>
          {!isManager && (
            <p className="flex items-start gap-2 rounded-[10px] bg-muted px-2.5 py-2 text-xs leading-normal text-muted-foreground">
              <Lock className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              Solo el project manager crea y edita vistas compartidas. Los miembros pueden guardar vistas personales.
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">Se guarda con</p>
            <ul className="rounded-[10px] border border-dashed border-dash px-3 py-2 font-mono text-xs leading-[1.8]">
              {summary.map((row) => (
                <li key={row.key} className="flex gap-2">
                  <span className="w-[74px] shrink-0 text-muted-foreground">{row.key}</span>
                  <span className="min-w-0 flex-1 break-words">{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            {active && canEditActive && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="max-w-full"
                onClick={() => {
                  onUpdateActive()
                  setOpen(false)
                }}
              >
                <span className="truncate">Actualizar «{active.name}»</span>
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim() || create.isPending}>
              {create.isPending && <Spinner />}
              Guardar vista
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}

function VisibilityOption({ checked, disabled = false, onChange, icon: Icon, title, description }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors duration-150',
        checked ? 'border-accent-text bg-accent-soft' : 'hover:border-dash',
        disabled && 'cursor-not-allowed opacity-55 hover:border-border',
      )}
    >
      <input
        type="radio"
        name="saved-view-visibility"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 size-4 accent-[var(--ring)]"
      />
      <Icon className={cn('mt-0.5 size-4 shrink-0', checked ? 'text-accent-text' : 'text-muted-foreground')} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className={cn('block text-xs', checked ? 'text-foreground' : 'text-muted-foreground')}>{description}</span>
      </span>
    </label>
  )
}

function RenameDialog({ slug, projectId, view, onClose }) {
  const update = useUpdateSavedView(slug, projectId)
  const [name, setName] = useState('')
  const [lastView, setLastView] = useState(null)
  if (view && view !== lastView) {
    setLastView(view)
    setName(view.name)
  }

  const save = (event) => {
    event.preventDefault()
    const value = name.trim()
    if (!value || value === view.name) {
      onClose()
      return
    }
    update.mutate(
      { viewId: view.id, name: value },
      {
        onSuccess: () => {
          toast.success('Nombre actualizado')
          onClose()
        },
        onError: (error) => notifyError(error),
      },
    )
  }

  return (
    <Dialog open={Boolean(view)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar nombre de la vista</DialogTitle>
          <DialogDescription className="sr-only">Escribe el nombre nuevo</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="flex flex-col gap-4">
          <Input autoFocus value={name} maxLength={NAME_MAX} onChange={(event) => setName(event.target.value)} aria-label="Nombre" />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || update.isPending}>
              {update.isPending && <Spinner />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteViewDialog({ slug, projectId, view, onClose, onDeleted }) {
  const remove = useDeleteSavedView(slug, projectId)
  return (
    <ConfirmDialog
      open={Boolean(view)}
      onOpenChange={(open) => !open && onClose()}
      title={view ? `¿Eliminar la vista «${view.name}»?` : ''}
      description={view?.shared ? 'Desaparece de la barra de todo el proyecto. Las tareas no cambian.' : 'Las tareas no cambian.'}
      confirmLabel="Eliminar"
      loading={remove.isPending}
      onConfirm={() =>
        remove.mutate(view.id, {
          onSuccess: () => {
            toast.success(`Vista «${view.name}» eliminada`)
            onDeleted(view)
            onClose()
          },
          onError: (error) => notifyError(error),
        })
      }
    />
  )
}
