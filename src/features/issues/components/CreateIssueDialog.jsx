import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ProjectIcon } from '@/features/projects/components/ProjectIcon'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/common/Loaders'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
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
 * Crear tarea. `defaults` permite preseleccionar estado (columna del tablero), padre (subtarea) o un título
 * (lo escrito en la paleta de comandos).
 * @param {{ slug: string, project: import('@/api/types').ProjectResponse, open: boolean, onOpenChange: Function,
 *           defaults?: { stateId?: string, parentId?: string, parentCode?: string, title?: string }, onCreated?: Function }} props
 */
export function CreateIssueDialog({ slug, project, open, onOpenChange, defaults = {}, onCreated }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[18%] translate-y-0 gap-3.5 px-5 pt-4.5 pb-4 sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <ProjectIcon project={project} className="rounded-md px-2 text-[11px]" />
            {defaults.parentId ? `Nueva subtarea de ${defaults.parentCode}` : 'Nueva tarea'}
          </DialogTitle>
          <DialogDescription className="sr-only">Escribe el título y elige sus propiedades.</DialogDescription>
        </DialogHeader>
        {/* El formulario vive mientras exista el diálogo: así no desaparece durante la animación de cierre */}
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
      </DialogContent>
    </Dialog>
  )
}

function CreateIssueForm({ slug, project, defaults, onCancel, onCreated }) {
  const meta = useProjectMeta(slug, project.id)
  const create = useCreateIssue(slug, project.id)
  const [createMore, setCreateMore] = useState(false)
  const emptyValues = {
    title: defaults.title ?? '',
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
        toast.success(`${issue.code} creada`, { description: issue.title })
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
  // Pastillas de propiedades: punteadas mientras están vacías
  const chip = (empty) =>
    cn('h-8 rounded-full border px-3 text-[13px]', empty ? 'border-dashed border-dash text-muted-foreground' : 'border-border bg-card')

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) form.handleSubmit(onSubmit)(event)
        }}
        className="space-y-3.5"
        noValidate
      >
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
                  className="w-full bg-transparent text-[21px] font-semibold outline-none placeholder:text-muted-foreground"
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
                  className="resize-y border-none bg-transparent px-0 leading-relaxed shadow-none focus-visible:ring-0 dark:bg-transparent"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <StatePicker states={meta.states} value={stateId} onChange={setField('stateId')} className={chip(false)} />
          <PriorityPicker value={values.priority} onChange={setField('priority')} className={chip(values.priority === 'NONE')} />
          <AssigneesPicker
            members={meta.users}
            value={values.assigneeIds}
            onChange={setField('assigneeIds')}
            className={chip(values.assigneeIds.length === 0)}
          />
          <LabelsPicker
            labels={meta.labels}
            value={values.labelIds}
            onChange={setField('labelIds')}
            compact
            className={chip(values.labelIds.length === 0)}
          />
          <DatePicker
            value={values.startDate}
            onChange={setField('startDate')}
            placeholder="Inicio"
            maxDate={values.dueDate}
            className={chip(!values.startDate)}
          />
          <DatePicker
            value={values.dueDate}
            onChange={setField('dueDate')}
            placeholder="Fecha límite"
            minDate={values.startDate}
            className={chip(!values.dueDate)}
          />
        </div>
        {form.formState.errors.dueDate && (
          <p className="text-sm text-destructive">{form.formState.errors.dueDate.message}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 border-t pt-3.5">
          <div className="flex items-center gap-2">
            <Switch id="create-more" checked={createMore} onCheckedChange={setCreateMore} />
            <Label htmlFor="create-more" className="text-[13px] font-normal text-muted-foreground">
              Crear otra
            </Label>
          </div>
          <span className="ml-auto hidden font-mono text-[11px] text-muted-foreground sm:inline">esc cerrar</span>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Spinner />}
            Crear tarea
            <kbd className="rounded-[5px] bg-foreground/10 px-1.5 text-[11px] font-normal">ctrl ↵</kbd>
          </Button>
        </div>
      </form>
    </Form>
  )
}
