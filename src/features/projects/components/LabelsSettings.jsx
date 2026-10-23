import { useState } from 'react'
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
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { EmptyState, ErrorState } from '@/components/common/States'
import { applyFieldErrors } from '@/lib/errors'
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

  const handleDelete = () => {
    remove.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success(`Etiqueta «${toDelete.name}» eliminada`)
        setToDelete(null)
      },
      onError: (deleteError) => notifyError(deleteError),
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Etiquetas</CardTitle>
          <CardDescription>Clasifica los issues (bug, mejora, diseño…).</CardDescription>
        </div>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus />
            Nueva etiqueta
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {creating && (
          <LabelForm
            pending={create.isPending}
            submitLabel="Crear"
            onCancel={() => setCreating(false)}
            onSubmit={(values, setError, reset) =>
              create.mutate(values, {
                onSuccess: (label) => {
                  toast.success(`Etiqueta «${label.name}» creada`)
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
          <EmptyState icon={Tags} title="Sin etiquetas" description="Crea la primera para clasificar issues." className="py-6" />
        )}
        {labels?.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {labels.map((label) =>
              editingId === label.id ? (
                <li key={label.id} className="p-2">
                  <LabelForm
                    label={label}
                    pending={update.isPending}
                    submitLabel="Guardar"
                    onCancel={() => setEditingId(null)}
                    onSubmit={(values, setError) =>
                      update.mutate(
                        { labelId: label.id, ...values },
                        {
                          onSuccess: () => {
                            toast.success('Etiqueta actualizada')
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    aria-label="Editar"
                    onClick={() => setEditingId(label.id)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    aria-label="Eliminar"
                    onClick={() => setToDelete(label)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ),
            )}
          </ul>
        )}
      </CardContent>
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`¿Eliminar la etiqueta «${toDelete?.name}»?`}
        description="Se quitará de todos los issues que la tengan."
        confirmLabel="Eliminar"
        loading={remove.isPending}
        onConfirm={handleDelete}
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
                <Input placeholder="Nombre de la etiqueta" autoFocus aria-label="Nombre" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          {submitLabel}
        </Button>
      </form>
    </Form>
  )
}
