import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ColorPicker, PRESET_COLORS } from '@/components/common/ColorPicker'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ColorDot } from '@/components/common/LabelChip'
import { LockNote } from '@/components/common/LockNote'
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { EmptyState, ErrorState } from '@/components/common/States'
import { useCan } from '@/features/workspaces/hooks'
import { t } from '@/i18n'
import { applyFieldErrors } from '@/lib/errors'
import { useFocusAfterRemoval } from '@/lib/focusReturn'
import { notifyError } from '@/lib/notify'
import { useCreateLabel, useDeleteLabel, useLabels, useUpdateLabel } from '../hooks'
import { labelSchema } from '../schemas'

const randomColor = () => PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]

export function LabelsSettings({ slug, project }) {
  const { data: labels, isLoading, error, refetch } = useLabels(slug, project.id)
  const create = useCreateLabel(slug, project.id)
  const update = useUpdateLabel(slug, project.id)
  const remove = useDeleteLabel(slug, project.id)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const canManage = useCan('PROJECT_LABELS')
  // Al eliminar una etiqueta su fila desaparece: el foco va a «Nueva etiqueta» (o al título, si no está)
  const newRef = useRef(null)
  const titleRef = useRef(null)
  const removal = useFocusAfterRemoval(newRef, titleRef)

  const handleDelete = () => {
    removal.start()
    remove.mutate(toDelete.id, {
      onSuccess: () => {
        removal.done()
        toast.success(t('Etiqueta «{name}» eliminada', { name: toDelete.name }))
        setToDelete(null)
      },
      onError: (deleteError) => notifyError(deleteError),
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle ref={titleRef} tabIndex={-1} className="outline-none">
            {t('Etiquetas')}
          </CardTitle>
          <CardDescription>{t('Clasifica las tareas (bug, mejora, diseño…).')}</CardDescription>
          {!canManage && <LockNote>{t('Tu rol no permite cambiar las etiquetas.')}</LockNote>}
        </div>
        {canManage && !creating && (
          <Button ref={newRef} size="sm" onClick={() => setCreating(true)}>
            <Plus />
            {t('Nueva etiqueta')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {creating && (
          <LabelForm
            pending={create.isPending}
            submitLabel={t('Crear')}
            onCancel={() => setCreating(false)}
            onSubmit={(values, setError, reset) =>
              create.mutate(values, {
                onSuccess: (label) => {
                  toast.success(t('Etiqueta «{name}» creada', { name: label.name }))
                  reset({ name: '', color: randomColor() })
                },
                onError: (createError) => {
                  if (!applyFieldErrors(createError, setError)) notifyError(createError)
                },
              })
            }
          />
        )}
        {isLoading && <CenteredSpinner />}
        {error && <ErrorState error={error} onRetry={refetch} />}
        {labels?.length === 0 && !creating && (
          <EmptyState
            icon={Tags}
            title={t('Sin etiquetas')}
            description={canManage ? t('Crea la primera para clasificar tareas.') : undefined}
            className="py-6"
          />
        )}
        {labels?.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {labels.map((label) =>
              editingId === label.id ? (
                <li key={label.id} className="p-2">
                  <LabelForm
                    label={label}
                    pending={update.isPending}
                    submitLabel={t('Guardar')}
                    onCancel={() => setEditingId(null)}
                    onSubmit={(values, setError) =>
                      update.mutate(
                        { labelId: label.id, ...values },
                        {
                          onSuccess: () => {
                            toast.success(t('Etiqueta actualizada'))
                            setEditingId(null)
                          },
                          onError: (updateError) => {
                            if (!applyFieldErrors(updateError, setError)) notifyError(updateError)
                          },
                        },
                      )
                    }
                  />
                </li>
              ) : (
                <li key={label.id} className="flex items-center gap-3 px-3 py-2.5">
                  <ColorDot color={label.color} className="size-3" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{label.name}</span>
                  {canManage && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground"
                        aria-label={t('Editar la etiqueta «{name}»', { name: label.name })}
                        onClick={() => setEditingId(label.id)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground"
                        aria-label={t('Eliminar la etiqueta «{name}»', { name: label.name })}
                        onClick={() => setToDelete(label)}
                      >
                        <Trash2 />
                      </Button>
                    </>
                  )}
                </li>
              ),
            )}
          </ul>
        )}
      </CardContent>
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t('¿Eliminar la etiqueta «{name}»?', { name: toDelete?.name })}
        description={t('Se quitará de todas las tareas que la tengan.')}
        confirmLabel={t('Eliminar')}
        loading={remove.isPending}
        onConfirm={handleDelete}
        returnFocusRef={[newRef, titleRef]}
        focusAfterConfirmRef={removal.ref}
      />
    </Card>
  )
}

function LabelForm({ label, pending, submitLabel, onSubmit, onCancel }) {
  const form = useForm({
    resolver: zodResolver(labelSchema),
    defaultValues: label ? { name: label.name, color: label.color } : { name: '', color: randomColor() },
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => onSubmit(values, form.setError, form.reset))}
        className="flex flex-wrap items-start gap-2 rounded-lg border bg-muted/40 p-2"
        noValidate
      >
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ColorPicker value={field.value} onChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="min-w-40 flex-1">
              <FormControl>
                <Input placeholder={t('Nombre de la etiqueta')} autoFocus aria-label={t('Nombre')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('Cancelar')}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          {submitLabel}
        </Button>
      </form>
    </Form>
  )
}
