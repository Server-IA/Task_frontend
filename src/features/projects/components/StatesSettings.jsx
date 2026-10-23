import { useState } from 'react'
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
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { ErrorState } from '@/components/common/States'
import { STATE_GROUP_LABELS, StateIcon } from '@/components/common/StateIcon'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { useCreateState, useDeleteState, useStates, useUpdateState } from '../hooks'
import { STATE_GROUPS, stateSchema } from '../schemas'

export function StatesSettings({ slug, project }) {
  const { data: states, isLoading, error, refetch } = useStates(slug, project.id)
  const update = useUpdateState(slug, project.id)
  const remove = useDeleteState(slug, project.id)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [moving, setMoving] = useState(false)

  /** Intercambia la posición con el estado vecino (el orden es el de las columnas del Kanban). */
  const move = async (index, direction) => {
    const current = states[index]
    const neighbor = states[index + direction]
    if (!neighbor) return
    setMoving(true)
    try {
      const currentPosition = current.position === neighbor.position ? index : current.position
      const neighborPosition = current.position === neighbor.position ? index + direction : neighbor.position
      await Promise.all([
        update.mutateAsync({ stateId: current.id, position: neighborPosition }),
        update.mutateAsync({ stateId: neighbor.id, position: currentPosition }),
      ])
    } catch (moveError) {
      notifyError(moveError)
    } finally {
      setMoving(false)
    }
  }

  const handleDelete = () => {
    remove.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success(`Estado «${toDelete.name}» eliminado`)
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
          <CardTitle>Estados</CardTitle>
          <CardDescription>Son las columnas del Kanban, en este orden. El grupo indica el avance.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus />
          Nuevo estado
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <CenteredSpinner />}
        {error && <ErrorState error={error} onRetry={refetch} />}
        {states && (
          <ul className="divide-y rounded-lg border">
            {states.map((state, index) => (
              <li key={state.id} className="flex items-center gap-3 px-3 py-2.5">
                <StateIcon group={state.group} color={state.color} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{state.name}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{STATE_GROUP_LABELS[state.group]}</span>
                <div className="flex items-center">
                  <IconButton label="Subir" disabled={index === 0 || moving} onClick={() => move(index, -1)}>
                    <ArrowUp />
                  </IconButton>
                  <IconButton
                    label="Bajar"
                    disabled={index === states.length - 1 || moving}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown />
                  </IconButton>
                  <IconButton label="Editar" onClick={() => setEditing(state)}>
                    <Pencil />
                  </IconButton>
                  <IconButton label="Eliminar" disabled={states.length <= 1} onClick={() => setToDelete(state)}>
                    <Trash2 />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
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
        title={`¿Eliminar el estado «${toDelete?.name}»?`}
        description="Solo se puede eliminar si no tiene issues. Mueve antes sus issues a otro estado."
        confirmLabel="Eliminar"
        loading={remove.isPending}
        onConfirm={handleDelete}
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

function StateDialog({ slug, projectId, state, open, onOpenChange }) {
  const create = useCreateState(slug, projectId)
  const update = useUpdateState(slug, projectId)
  const pending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{state ? 'Editar estado' : 'Nuevo estado'}</DialogTitle>
        </DialogHeader>
        {open && (
          <StateForm
            state={state}
            pending={pending}
            onCancel={() => onOpenChange(false)}
            onSubmit={(values, setError) => {
              const options = {
                onSuccess: () => {
                  toast.success(state ? 'Estado actualizado' : 'Estado creado')
                  onOpenChange(false)
                },
                onError: (error) => {
                  if (!applyFieldErrors(error, setError)) notifyError(error)
                },
              }
              if (state) update.mutate({ stateId: state.id, ...values }, options)
              else create.mutate(values, options)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function StateForm({ state, pending, onSubmit, onCancel }) {
  const form = useForm({
    resolver: zodResolver(stateSchema),
    defaultValues: state
      ? { name: state.name, color: state.color, group: state.group }
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
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="En revisión" autoFocus {...field} />
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
                <FormLabel>Grupo</FormLabel>
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
                <FormLabel>Color</FormLabel>
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
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {state ? 'Guardar' : 'Crear estado'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
