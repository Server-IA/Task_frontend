import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ColorPicker } from '@/components/common/ColorPicker'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LockNote } from '@/components/common/LockNote'
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { ErrorState } from '@/components/common/States'
import { STATE_GROUP_LABELS, StateIcon } from '@/components/common/StateIcon'
import { useCan } from '@/features/workspaces/hooks'
import { stateName, stateNameToSave, t } from '@/i18n'
import { applyFieldErrors } from '@/lib/errors'
import { useFocusAfterRemoval } from '@/lib/focusReturn'
import { notifyError } from '@/lib/notify'
import { useCreateState, useDeleteState, useReorderStates, useStates, useUpdateState } from '../hooks'
import { STATE_GROUPS, stateSchema } from '../schemas'

export function StatesSettings({ slug, project }) {
  const { data: states, isLoading, error, refetch } = useStates(slug, project.id)
  const reorder = useReorderStates(slug, project.id)
  const remove = useDeleteState(slug, project.id)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const canManage = useCan('PROJECT_STATES')
  // Al eliminar un estado su fila desaparece: el foco va a «Nuevo estado» (o al título)
  const newRef = useRef(null)
  const titleRef = useRef(null)
  const removal = useFocusAfterRemoval(newRef, titleRef)
  // Un cambio de orden a la vez: el siguiente parte del orden ya guardado (y un fallo no deshace otro)
  const moving = reorder.isPending

  /** Intercambia el lugar con el estado vecino (el orden es el de las columnas del tablero). */
  const move = (index, direction) => {
    if (!states[index + direction]) return
    const stateIds = states.map((state) => state.id)
    const [moved] = stateIds.splice(index, 1)
    stateIds.splice(index + direction, 0, moved)
    reorder.mutate(stateIds, { onError: (moveError) => notifyError(moveError) })
  }

  const handleDelete = () => {
    removal.start()
    remove.mutate(toDelete.id, {
      onSuccess: () => {
        removal.done()
        toast.success(t('Estado «{name}» eliminado', { name: stateName(toDelete) }))
        setToDelete(null)
      },
      onError: (deleteError) => {
        notifyError(deleteError)
        setToDelete(null)
      },
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle ref={titleRef} tabIndex={-1} className="outline-none">
            {t('Estados')}
          </CardTitle>
          <CardDescription>
            {t('Son las columnas del tablero, en este orden. El grupo define cuándo una tarea cuenta como completada.')}
          </CardDescription>
          {!canManage && <LockNote>{t('Tu rol no permite cambiar los estados.')}</LockNote>}
        </div>
        {canManage && (
          <Button ref={newRef} size="sm" onClick={() => setCreating(true)}>
            <Plus />
            {t('Nuevo estado')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && <CenteredSpinner />}
        {error && <ErrorState error={error} onRetry={refetch} />}
        {states && (
          <ol className="divide-y overflow-hidden rounded-xl border">
            {states.map((state, index) => (
              <li key={state.id} className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
                <span className="w-5 font-mono text-[11px] text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                <StateIcon group={state.group} color={state.color} />
                <span className="min-w-0 flex-[1_1_160px] truncate text-sm font-medium">{stateName(state)}</span>
                <span className="hidden rounded-full bg-muted px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline">
                  {STATE_GROUP_LABELS[state.group].toLowerCase()}
                </span>
                <span className="hidden w-24 items-center gap-1.5 font-mono text-xs text-muted-foreground md:flex">
                  <span className="size-3 rounded-[4px] ring-1 ring-foreground/15" style={{ backgroundColor: state.color }} aria-hidden="true" />
                  {state.color.toUpperCase()}
                </span>
                {canManage && (
                  <div className="ml-auto flex items-center">
                    <IconButton
                      label={t('Subir «{name}»', { name: stateName(state) })}
                      disabled={index === 0 || moving}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp />
                    </IconButton>
                    <IconButton
                      label={t('Bajar «{name}»', { name: stateName(state) })}
                      disabled={index === states.length - 1 || moving}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown />
                    </IconButton>
                    <IconButton label={t('Editar el estado «{name}»', { name: stateName(state) })} onClick={() => setEditing(state)}>
                      <Pencil />
                    </IconButton>
                    <IconButton
                      label={t('Eliminar el estado «{name}»', { name: stateName(state) })}
                      disabled={states.length <= 1}
                      onClick={() => setToDelete(state)}
                    >
                      <Trash2 />
                    </IconButton>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
        {canManage && <p className="mt-3 font-mono text-xs text-muted-foreground">{t('un estado con tareas no se puede eliminar')}</p>}
      </CardContent>

      <StateDialog
        slug={slug}
        projectId={project.id}
        state={editing}
        open={creating || Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false)
            setEditing(null)
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t('¿Eliminar el estado «{name}»?', { name: stateName(toDelete) })}
        description={t('Solo se puede eliminar si no tiene tareas. Mueve antes sus tareas a otro estado.')}
        confirmLabel={t('Eliminar')}
        loading={remove.isPending}
        onConfirm={handleDelete}
        // Si no se pudo (tiene tareas) el estado sigue ahí: el foco vuelve a su botón
        returnFocusRef={[newRef, titleRef]}
        focusAfterConfirmRef={removal.ref}
      />
    </Card>
  )
}

function IconButton({ label, children, ...props }) {
  return (
    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={label} title={label} {...props}>
      {children}
    </Button>
  )
}

function StateDialog({ slug, projectId, state: requestedState, open, onOpenChange }) {
  const create = useCreateState(slug, projectId)
  const update = useUpdateState(slug, projectId)
  const pending = create.isPending || update.isPending
  // Al cerrar, el padre limpia el estado editado; se conserva el último para que el título no cambie durante la animación
  const [lastState, setLastState] = useState(requestedState)
  if (open && requestedState !== lastState) setLastState(requestedState)
  const state = open ? requestedState : lastState

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{state ? t('Editar estado') : t('Nuevo estado')}</DialogTitle>
        </DialogHeader>
        {/* El formulario vive mientras exista el diálogo: así no desaparece durante la animación de cierre */}
        <StateForm
          state={state}
          pending={pending}
          onCancel={() => onOpenChange(false)}
          onSubmit={(values, setError) => {
            const options = {
              onSuccess: () => {
                toast.success(state ? t('Estado actualizado') : t('Estado creado'))
                onOpenChange(false)
              },
              onError: (error) => {
                if (!applyFieldErrors(error, setError)) notifyError(error)
              },
            }
            // Un estado de fábrica al que no se le cambió el nombre conserva el guardado (así sigue traduciéndose)
            if (state) update.mutate({ stateId: state.id, ...values, name: stateNameToSave(state.name, values.name) }, options)
            else create.mutate(values, options)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

function StateForm({ state, pending, onSubmit, onCancel }) {
  const form = useForm({
    resolver: zodResolver(stateSchema),
    defaultValues: state
      ? { name: stateName(state), color: state.color, group: state.group }
      : { name: '', color: '#3B82F6', group: 'UNSTARTED' },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => onSubmit(values, form.setError))} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Nombre')}</FormLabel>
              <FormControl>
                <Input placeholder={t('En revisión')} autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="group"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Grupo')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STATE_GROUPS.map((group) => (
                      <SelectItem key={group} value={group}>
                        <StateIcon group={group} color={form.getValues('color')} />
                        {STATE_GROUP_LABELS[group]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Color')}</FormLabel>
                <FormControl>
                  <ColorPicker value={field.value} onChange={field.onChange} className="w-full" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('Cancelar')}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {state ? t('Guardar') : t('Crear estado')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
