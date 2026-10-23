import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/common/Loaders'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { useCreateIssue } from '../hooks'
import { useProjectMeta } from '../useIssueHelpers'
import { AssigneesPicker, DatePicker, LabelsPicker, PriorityPicker, StatePicker } from './PropertyPickers'

const issueSchema = z
  .object({
    title: z.string().trim().min(1, 'El título es obligatorio').max(255, 'Máximo 255 caracteres'),
    description: z.string().max(50000, 'La descripción es demasiado larga'),
    stateId: z.string().nullable(),
    priority: z.string(),
    assigneeIds: z.array(z.string()),
    labelIds: z.array(z.string()),
    startDate: z.string().nullable(),
    dueDate: z.string().nullable(),
  })
  .refine((values) => !values.startDate || !values.dueDate || values.dueDate >= values.startDate, {
    path: ['dueDate'],
    message: 'La fecha límite no puede ser anterior al inicio',
  })

/**
 * Crear issue. `defaults` permite preseleccionar estado (columna del Kanban) o padre (sub-issue).
 * @param {{ slug: string, project: import('@/api/types').ProjectResponse, open: boolean, onOpenChange: Function,
 *           defaults?: { stateId?: string, parentId?: string, parentCode?: string }, onCreated?: Function }} props
 */
export function CreateIssueDialog({ slug, project, open, onOpenChange, defaults = {}, onCreated }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
              {project.identifier}
            </span>
            {defaults.parentId ? `Nuevo sub-issue de ${defaults.parentCode}` : 'Nuevo issue'}
          </DialogTitle>
          <DialogDescription className="sr-only">Escribe el título y elige sus propiedades.</DialogDescription>
        </DialogHeader>
        {open && (
          <CreateIssueForm
            slug={slug}
            project={project}
            defaults={defaults}
            onCancel={() => onOpenChange(false)}
            onCreated={(issue, keepOpen) => {
              onCreated?.(issue)
              if (!keepOpen) onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CreateIssueForm({ slug, project, defaults, onCancel, onCreated }) {
  const meta = useProjectMeta(slug, project.id)
  const create = useCreateIssue(slug, project.id)
  const [createMore, setCreateMore] = useState(false)
  const emptyValues = {
    title: '',
    description: '',
    stateId: defaults.stateId ?? null,
    priority: 'NONE',
    assigneeIds: [],
    labelIds: [],
    startDate: null,
    dueDate: null,
  }
  const form = useForm({ resolver: zodResolver(issueSchema), defaultValues: emptyValues })
  const values = useWatch({ control: form.control })
  const stateId = values.stateId ?? meta.states[0]?.id

  const onSubmit = (data) => {
    const body = {
      ...data,
      stateId: data.stateId ?? undefined,
      description: data.description.trim() || undefined,
      startDate: data.startDate ?? undefined,
      dueDate: data.dueDate ?? undefined,
      parentId: defaults.parentId,
    }
    create.mutate(body, {
      onSuccess: (issue) => {
        toast.success(`${issue.code} creado`, { description: issue.title })
        if (createMore) {
          // Conserva las propiedades para crear varios parecidos seguidos
          form.reset({ ...data, title: '', description: '' })
          form.setFocus('title')
        }
        onCreated(issue, createMore)
      },
      onError: (error) => {
        if (!applyFieldErrors(error, form.setError)) notifyError(error)
      },
    })
  }

  const setField = (name) => (value) => form.setValue(name, value, { shouldDirty: true })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <input
                  {...field}
                  autoFocus
                  placeholder="Título"
                  aria-label="Título"
                  className="w-full bg-transparent text-lg font-medium outline-none placeholder:text-muted-foreground"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  {...field}
                  rows={4}
                  placeholder="Agrega una descripción…"
                  className="resize-y border-none px-0 shadow-none focus-visible:ring-0"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <StatePicker states={meta.states} value={stateId} onChange={setField('stateId')} className="border-border" />
          <PriorityPicker value={values.priority} onChange={setField('priority')} className="border-border" />
          <AssigneesPicker
            members={meta.users}
            value={values.assigneeIds}
            onChange={setField('assigneeIds')}
            className="border-border"
          />
          <LabelsPicker labels={meta.labels} value={values.labelIds} onChange={setField('labelIds')} compact className="border-border" />
          <DatePicker
            value={values.startDate}
            onChange={setField('startDate')}
            placeholder="Inicio"
            maxDate={values.dueDate}
            className="border-border"
          />
          <DatePicker
            value={values.dueDate}
            onChange={setField('dueDate')}
            placeholder="Fecha límite"
            minDate={values.startDate}
            className="border-border"
          />
        </div>
        {form.formState.errors.dueDate && (
          <p className="text-sm text-destructive">{form.formState.errors.dueDate.message}</p>
        )}
        <div className="flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-2">
            <Switch id="create-more" checked={createMore} onCheckedChange={setCreateMore} />
            <Label htmlFor="create-more" className="text-sm font-normal text-muted-foreground">
              Crear otro
            </Label>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Spinner />}
              Crear issue
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
