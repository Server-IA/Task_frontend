import { useState } from 'react'
import { Link } from 'react-router'
import { Check, ChevronDown } from 'lucide-react'
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
import { applyTemplate, appliedParts, checklistLabel } from '@/features/templates/applyTemplate'
import { useTemplates } from '@/features/templates/hooks'
import { useIsManager } from '@/features/workspaces/hooks'
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

/** Máximo de criterios y pasos que acepta el backend al crear una tarea. */
const CHECKLIST_ON_CREATE = 50

/**
 * Crear tarea. `defaults` permite preseleccionar estado (columna del tablero), padre (subtarea) o un título
 * (lo escrito en la paleta de comandos). Una plantilla del proyecto puede rellenar prefijo del título,
 * descripción, prioridad y etiquetas, y agrega su checklist a la tarea.
 * @param {{ slug: string, project: import('@/api/types').ProjectResponse, open: boolean, onOpenChange: Function,
 *           defaults?: { stateId?: string, parentId?: string, parentCode?: string, title?: string }, onCreated?: Function }} props
 */
export function CreateIssueDialog({ slug, project, open, onOpenChange, defaults = {}, onCreated }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Arriba y con scroll propio: con una plantilla (descripción y checklist) puede ser más alto que la pantalla */}
      <DialogContent className="top-[min(18%,6rem)] max-h-[calc(100dvh_-_min(18%,6rem)_-_1rem)] translate-y-0 gap-3.5 overflow-y-auto px-5 pt-4.5 pb-4 sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <ProjectIcon project={project} className="rounded-md px-2 text-[11px]" />
            {defaults.parentId ? `Nueva subtarea de ${defaults.parentCode}` : 'Nueva tarea'}
            {project.nextIssueCode && (
              <span className="font-mono text-xs font-normal text-muted-foreground" title="Código que tendrá si nadie crea otra antes">
                → será {project.nextIssueCode}
              </span>
            )}
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
  const { data: templates = [] } = useTemplates(slug, project.id)
  const isManager = useIsManager()
  const [createMore, setCreateMore] = useState(false)
  // Plantilla aplicada y los valores de antes de aplicar la primera (para cambiarla o deshacerla)
  const [template, setTemplate] = useState(null)
  const [base, setBase] = useState(null)
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

  const chooseTemplate = (next) => {
    const { title, description, priority, labelIds } = form.getValues()
    const current = { title, description, priority, labelIds }
    const baseValues = base ?? current
    const applied = applyTemplate(current, next, { previous: template, base: baseValues })
    Object.entries(applied).forEach(([name, value]) => form.setValue(name, value, { shouldDirty: true }))
    setTemplate(next)
    setBase(next ? baseValues : null)
    // El cursor al final del título, para seguir escribiendo después del prefijo
    form.setFocus('title')
    requestAnimationFrame(() => {
      const input = document.activeElement
      if (input instanceof HTMLInputElement) input.setSelectionRange(input.value.length, input.value.length)
    })
  }
  const fromTemplate = {
    priority: Boolean(template?.priority) && template.priority !== 'NONE' && values.priority === template.priority,
    labels:
      template?.labels?.length > 0 &&
      template.labels.length === values.labelIds.length &&
      template.labels.every((label) => values.labelIds.includes(label.id)),
  }

  const onSubmit = (data) => {
    const body = {
      ...data,
      stateId: data.stateId ?? undefined,
      description: data.description.trim() || undefined,
      startDate: data.startDate ?? undefined,
      dueDate: data.dueDate ?? undefined,
      parentId: defaults.parentId,
      // La plantilla suma un uso (se ve en los ajustes de plantillas)
      templateId: template?.id,
      checklist: template?.checklist?.length
        ? template.checklist.slice(0, CHECKLIST_ON_CREATE).map(({ kind, text }) => ({ kind, text }))
        : undefined,
    }
    create.mutate(body, {
      onSuccess: (issue) => {
        toast.success(`${issue.code} creada`, { description: issue.title })
        if (createMore) {
          // Conserva las propiedades (y la plantilla) para crear varios parecidos seguidos
          form.reset({ ...data, title: template?.titlePrefix ?? '', description: template?.description ?? '' })
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
        {templates.length > 0 && (
          <TemplateBar
            templates={templates}
            active={template}
            onChoose={chooseTemplate}
            settingsUrl={isManager ? `/${slug}/projects/${project.id}/settings?tab=templates` : null}
            onLeave={onCancel}
          />
        )}
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
                  rows={template?.description ? 8 : 4}
                  placeholder="Agrega una descripción…"
                  className={cn(
                    'resize-y border-none bg-transparent px-0 leading-relaxed shadow-none focus-visible:ring-0 dark:bg-transparent',
                    // El esqueleto de una plantilla (## Pasos…) se lee mejor en monoespaciada
                    template?.description && 'max-h-[38vh] font-mono text-[12.5px] leading-[1.6] md:text-[12.5px]',
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <StatePicker states={meta.states} value={stateId} onChange={setField('stateId')} className={chip(false)} />
          <FromTemplate active={fromTemplate.priority}>
            <PriorityPicker value={values.priority} onChange={setField('priority')} className={chip(values.priority === 'NONE')} />
          </FromTemplate>
          <AssigneesPicker
            members={meta.users}
            value={values.assigneeIds}
            onChange={setField('assigneeIds')}
            className={chip(values.assigneeIds.length === 0)}
          />
          <FromTemplate active={fromTemplate.labels}>
            <LabelsPicker
              labels={meta.labels}
              value={values.labelIds}
              onChange={setField('labelIds')}
              compact
              className={chip(values.labelIds.length === 0)}
            />
          </FromTemplate>
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
        {template?.checklist?.length > 0 && <TemplateChecklist checklist={template.checklist} />}
        <div className="flex flex-wrap items-center gap-3 border-t pt-3.5">
          <div className="flex items-center gap-2">
            <Switch id="create-more" checked={createMore} onCheckedChange={setCreateMore} />
            <Label htmlFor="create-more" className="text-[13px] font-normal text-muted-foreground">
              {template ? 'Crear otra con la misma plantilla' : 'Crear otra'}
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

/** Plantillas del proyecto como pastillas («Ninguna», «Reporte de bug»…) y qué aplicó la elegida. */
function TemplateBar({ templates, active, onChoose, settingsUrl, onLeave }) {
  const options = [{ id: null, name: 'Ninguna' }, ...templates]
  return (
    <div className="flex flex-col gap-2 rounded-[14px] border bg-subtle px-3 py-2.5">
      <div role="radiogroup" aria-label="Plantilla" className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-muted-foreground">Plantilla</span>
        {options.map((option) => {
          const checked = (active?.id ?? null) === option.id
          return (
            <button
              key={option.id ?? 'none'}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => !checked && onChoose(option.id ? option : null)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.75 py-1 text-[13px] font-medium transition-colors duration-150',
                checked ? 'border-accent-text bg-accent-soft font-semibold text-accent-text' : 'bg-card hover:border-dash',
              )}
            >
              {checked && option.id && <Check className="size-3" strokeWidth={3} />}
              {option.name}
            </button>
          )
        })}
        {settingsUrl && (
          <Link to={settingsUrl} onClick={onLeave} className="ml-auto text-xs font-medium text-accent-text hover:underline">
            Editar plantillas
          </Link>
        )}
      </div>
      {active && (
        <p className="tf-fade flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          Se aplicó «{active.name}»: {appliedParts(active)}. Todo se puede cambiar.
          <button type="button" className="font-semibold text-foreground underline underline-offset-2" onClick={() => onChoose(null)}>
            Deshacer
          </button>
        </p>
      )}
    </div>
  )
}

/** Punto dorado en la pastilla cuyo valor puso la plantilla. */
function FromTemplate({ active, children }) {
  return (
    <span className="relative inline-flex">
      {children}
      {active && (
        <span
          title="Viene de la plantilla"
          aria-hidden="true"
          className="pointer-events-none absolute top-0.5 right-0.5 size-1.5 rounded-full bg-ring ring-2 ring-card"
        />
      )}
    </span>
  )
}

/** Criterios y pasos que la plantilla agrega a la tarea nueva. */
function TemplateChecklist({ checklist }) {
  return (
    <details open className="group rounded-xl border">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[13px] font-medium [&::-webkit-details-marker]:hidden">
        Checklist de la plantilla
        <span className="font-mono text-xs font-normal text-muted-foreground">{checklistLabel(checklist)}</span>
        <span className="ml-auto text-xs font-normal text-muted-foreground">se agrega a la tarea</span>
        <ChevronDown className="size-3.5 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 px-3 pb-2.5 text-[13px] sm:grid-cols-2">
        {checklist.map((item, index) => (
          <li key={index} className="flex min-w-0 items-start gap-2">
            <span aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 rounded-[4px] border-[1.5px] border-dash" />
            <span className="min-w-0 break-words">
              {item.kind === 'CRITERION' && <span className="mr-1.5 font-mono text-[11px] text-accent-text">criterio</span>}
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}
