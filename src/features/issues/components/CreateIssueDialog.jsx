import { useEffect, useRef, useState } from 'react'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Spinner } from '@/components/common/Loaders'
import { LazyRichEditor, usePreloadRichEditor } from '@/features/editor/components/LazyRichEditor'
import { useMentionPeople } from '@/features/mentions/hooks'
import {
  applyTemplate,
  appliedParts,
  checklistLabel,
  descriptionEditedSinceTemplate,
  fromTemplateFlags,
} from '@/features/templates/applyTemplate'
import { useTemplates } from '@/features/templates/hooks'
import { useIsManager } from '@/features/workspaces/hooks'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useCreateIssue } from '../hooks'
import { firstTemplateOfType, ISSUE_TYPES, templateType, TYPE_LABELS } from '../issueTypes'
import { useProjectMeta } from '../useIssueHelpers'
import { TypeIcon } from './IssueTypeBits'
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

/** Título del diálogo según el tipo y, si tiene, la historia (o tarea) padre. */
function dialogTitle(type, defaults) {
  if (defaults.parentId) {
    const what = type === 'BUG' ? 'Nuevo bug' : 'Nueva tarea'
    return defaults.parentType === 'STORY' ? `${what} de la historia ${defaults.parentCode}` : `Nueva subtarea de ${defaults.parentCode}`
  }
  if (defaults.relatesToCode) return `${type === 'STORY' ? 'Nueva historia' : 'Nueva tarea'} relacionada con ${defaults.relatesToCode}`
  return type === 'STORY' ? 'Nueva historia' : type === 'BUG' ? 'Reportar bug' : 'Nueva tarea'
}

/**
 * Crear tarea. `defaults` permite preseleccionar estado (columna del tablero), padre (subtarea o tarea de una
 * historia), un título (lo escrito en la paleta de comandos), el tipo (`type`) o la plantilla de un tipo
 * (`templateType`: «Nueva historia» abre con «Historia de usuario» y «Reportar bug» con «Reporte de bug»).
 * `reopenParent` reabre la historia cerrada del padre al crear; `relatesToId` deja la tarea nueva relacionada con
 * esa. Una plantilla del proyecto puede rellenar el tipo, el prefijo del título, la descripción, la prioridad, el
 * estado, los asignados y las etiquetas, y agrega su checklist a la tarea; «Deshacer» vuelve a los valores de antes.
 * @param {{ slug: string, project: import('@/api/types').ProjectResponse, open: boolean, onOpenChange: Function,
 *           defaults?: { stateId?: string, parentId?: string, parentCode?: string, parentType?: string, title?: string,
 *                        type?: string, templateType?: string, reopenParent?: boolean, relatesToId?: string,
 *                        relatesToCode?: string }, onCreated?: Function }} props
 */
/**
 * Al abrir, el cursor va al título (al final, después del prefijo de la plantilla). Abierto desde el panel de una
 * tarea, el foco del panel recuperaba el `autoFocus` del título y el diálogo terminaba enfocando la primera plantilla.
 */
function focusTitle(event) {
  const title = event.currentTarget?.querySelector('input[aria-label="Título"]')
  if (!title) return
  event.preventDefault()
  title.focus()
  title.setSelectionRange(title.value.length, title.value.length)
}

export function CreateIssueDialog({ slug, project, open, onOpenChange, defaults = {}, onCreated }) {
  const [type, setType] = useState(defaults.type ?? defaults.templateType ?? 'TASK')
  // Al abrir de nuevo con otros valores por defecto, vuelve al tipo pedido
  // y el formulario empieza de nuevo (sesión nueva) para aplicar la plantilla pedida
  const [lastOpen, setLastOpen] = useState(open)
  const [session, setSession] = useState(0)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setType(defaults.type ?? defaults.templateType ?? 'TASK')
      setSession((count) => count + 1)
    }
  }
  // Con una plantilla pedida («Nueva historia», «Reportar bug») el formulario espera a las plantillas para nacer con ella
  const { isLoading: templatesLoading } = useTemplates(slug, project.id)
  const waitTemplates = Boolean(defaults.templateType) && templatesLoading
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Arriba y con scroll propio: con una plantilla (descripción y checklist) puede ser más alto que la pantalla */}
      <DialogContent
        className="top-[min(18%,6rem)] max-h-[calc(100dvh_-_min(18%,6rem)_-_1rem)] translate-y-0 gap-3.5 overflow-y-auto px-5 pt-4.5 pb-4 sm:max-w-[680px]"
        onOpenAutoFocus={focusTitle}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <ProjectIcon project={project} className="rounded-md px-2 text-[11px]" />
            <TypeIcon type={type} size={14} />
            {dialogTitle(type, defaults)}
            {project.nextIssueCode && (
              <span className="font-mono text-xs font-normal text-muted-foreground" title="Código que tendrá si nadie crea otra antes">
                → será {project.nextIssueCode}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">Escribe el título y elige sus propiedades.</DialogDescription>
        </DialogHeader>
        {/* El formulario vive mientras exista el diálogo: así no desaparece durante la animación de cierre */}
        {waitTemplates ? (
          <Spinner className="mx-auto my-8 text-muted-foreground" />
        ) : (
        <CreateIssueForm
          key={session}
          slug={slug}
          project={project}
          defaults={defaults}
          type={type}
          onTypeChange={setType}
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

function CreateIssueForm({ slug, project, defaults, type, onTypeChange, onCancel, onCreated }) {
  const meta = useProjectMeta(slug, project.id)
  const create = useCreateIssue(slug, project.id)
  const { data: allTemplates = [] } = useTemplates(slug, project.id)
  const isManager = useIsManager()
  // Solo el project manager crea historias, y la tarea de una historia (o una subtarea) no puede ser historia
  const canStory = isManager && !defaults.parentId
  const templates = canStory ? allTemplates : allTemplates.filter((item) => templateType(item) !== 'STORY')
  const people = useMentionPeople(slug, project.id)
  usePreloadRichEditor()
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
  // «Nueva historia» y «Reportar bug» abren con la primera plantilla de ese tipo ya aplicada
  const [initial] = useState(() => {
    const first = defaults.templateType ? firstTemplateOfType(templates, defaults.templateType) : null
    if (!first) return { template: null, base: null, values: emptyValues }
    const { title, description, priority, stateId: initialState, assigneeIds, labelIds } = emptyValues
    const current = { title, description, priority, stateId: initialState, assigneeIds, labelIds }
    return { template: first, base: current, values: { ...emptyValues, ...applyTemplate(current, first, { base: current }) } }
  })
  // Plantilla aplicada y los valores de antes de aplicar la primera (para cambiarla o deshacerla)
  const [template, setTemplate] = useState(initial.template)
  const [base, setBase] = useState(initial.base)
  const form = useForm({ resolver: zodResolver(issueSchema), defaultValues: initial.values })
  const values = useWatch({ control: form.control })
  const stateId = values.stateId ?? meta.states[0]?.id

  // Después de aplicar una plantilla (o de «Crear otra») el cursor va al final del título, para seguir escribiendo
  // después del prefijo. Se hace cuando React ya escribió el título nuevo en el campo: `setFocus` de react-hook-form
  // enfoca en un setTimeout y el navegador dejaba el cursor al principio.
  const titleRef = useRef(null)
  // Con una plantilla ya aplicada al abrir («Reportar bug»), el cursor empieza después del prefijo
  const [caretRequest, setCaretRequest] = useState(initial.template ? 1 : 0)
  useEffect(() => {
    const input = titleRef.current
    if (!caretRequest || !input) return
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
  }, [caretRequest])
  const caretToEnd = () => setCaretRequest((count) => count + 1)

  // Cambiar o quitar la plantilla con la descripción editada la perdería: se confirma antes
  const [pendingTemplate, setPendingTemplate] = useState(undefined)
  const requestTemplate = (next) => {
    if (descriptionEditedSinceTemplate(form.getValues('description'), template, base)) setPendingTemplate(next)
    else chooseTemplate(next)
  }

  const chooseTemplate = (next) => {
    const { title, description, priority, stateId: currentState, assigneeIds, labelIds } = form.getValues()
    const current = { title, description, priority, stateId: currentState, assigneeIds, labelIds }
    const baseValues = base ?? current
    const applied = applyTemplate(current, next, { previous: template, base: baseValues })
    Object.entries(applied).forEach(([name, value]) => form.setValue(name, value, { shouldDirty: true }))
    setTemplate(next)
    setBase(next ? baseValues : null)
    // La plantilla fija el tipo (Historia de usuario → historia, Reporte de bug → bug); sin plantilla, el pedido
    onTypeChange(next ? templateType(next) : (defaults.type ?? 'TASK'))
    caretToEnd()
  }
  const fromTemplate = fromTemplateFlags(template, values)

  // ctrl ↵ dos veces (o con la tecla repitiendo) no crea dos tareas: el botón se deshabilita, el atajo no
  const submitting = useRef(false)
  const onSubmit = (data) => {
    if (submitting.current) return
    submitting.current = true
    const body = {
      ...data,
      stateId: data.stateId ?? undefined,
      description: data.description.trim() || undefined,
      startDate: data.startDate ?? undefined,
      dueDate: data.dueDate ?? undefined,
      parentId: defaults.parentId,
      type,
      reopenParent: defaults.reopenParent || undefined,
      relatesToId: defaults.relatesToId,
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
          caretToEnd()
          form.reset({ ...data, title: template?.titlePrefix ?? '', description: template?.description ?? '' })
        }
        onCreated(issue, createMore)
      },
      onError: (error) => {
        if (!applyFieldErrors(error, form.setError)) notifyError(error)
      },
      onSettled: () => {
        submitting.current = false
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
        onSubmit={(event) => form.handleSubmit(onSubmit)(event)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return
          event.preventDefault()
          if (!event.repeat && !submitting.current) form.handleSubmit(onSubmit)(event)
        }}
        className="space-y-3.5"
        noValidate
      >
        {templates.length > 0 && (
          <TemplateBar
            templates={templates}
            active={template}
            onChoose={requestTemplate}
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
                  ref={(element) => {
                    field.ref(element)
                    titleRef.current = element
                  }}
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
              <DescriptionField
                value={field.value}
                onChange={field.onChange}
                people={people}
                slug={slug}
                projectIdentifier={project.identifier}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <FromTemplate active={Boolean(template)}>
            <TypeSelect value={type} onChange={onTypeChange} canStory={canStory} className={chip(false)} />
          </FromTemplate>
          <FromTemplate active={fromTemplate.state}>
            <StatePicker states={meta.states} value={stateId} onChange={setField('stateId')} className={chip(false)} />
          </FromTemplate>
          <FromTemplate active={fromTemplate.priority}>
            <PriorityPicker value={values.priority} onChange={setField('priority')} className={chip(values.priority === 'NONE')} />
          </FromTemplate>
          <FromTemplate active={fromTemplate.assignees}>
            <AssigneesPicker
              members={meta.users}
              value={values.assigneeIds}
              onChange={setField('assigneeIds')}
              className={chip(values.assigneeIds.length === 0)}
            />
          </FromTemplate>
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
            {type === 'STORY' ? 'Crear historia' : type === 'BUG' ? 'Reportar bug' : 'Crear tarea'}
            <kbd className="rounded-[5px] bg-foreground/10 px-1.5 text-[11px] font-normal">ctrl ↵</kbd>
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={pendingTemplate !== undefined}
        onOpenChange={(open) => !open && setPendingTemplate(undefined)}
        title={pendingTemplate ? `¿Cambiar a «${pendingTemplate.name}»?` : '¿Quitar la plantilla?'}
        description="Editaste la descripción de la plantilla y se reemplazará: perderás esos cambios."
        confirmLabel={pendingTemplate ? 'Cambiar de plantilla' : 'Quitar plantilla'}
        onConfirm={() => {
          chooseTemplate(pendingTemplate)
          setPendingTemplate(undefined)
        }}
      />
    </Form>
  )
}

/**
 * Descripción con el editor compacto: «/» para insertar y la barra sobre el texto seleccionado; «Aa formato»
 * muestra la barra de formato. Una plantilla la llena (y «Deshacer» la devuelve) porque el valor viene del form.
 */
function DescriptionField({ value, onChange, people, slug, projectIdentifier }) {
  const [showFormat, setShowFormat] = useState(false)
  return (
    <div className="flex flex-col">
      <div className={cn(showFormat && 'overflow-hidden rounded-xl border')}>
        <LazyRichEditor
          value={value}
          onChange={onChange}
          size="sm"
          toolbar={showFormat ? 'compact' : false}
          people={people}
          slug={slug}
          projectIdentifier={projectIdentifier}
          ariaLabel="Descripción"
          contentClassName={cn('max-h-[360px] min-h-20 overflow-y-auto', showFormat ? 'px-3 py-2' : 'py-0.5')}
        />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-dashed pt-2 font-mono text-[11px] text-muted-foreground">
        <span>
          <kbd className="text-foreground">/</kbd> insertar
        </span>
        <span>selecciona texto para darle formato</span>
        <span>
          <kbd className="text-foreground">@</kbd> mencionar
        </span>
        <button
          type="button"
          aria-pressed={showFormat}
          title={showFormat ? 'Ocultar la barra de formato' : 'Mostrar la barra de formato'}
          onClick={() => setShowFormat((current) => !current)}
          className={cn(
            'ml-auto flex items-center gap-1.5 rounded-[7px] border px-2 py-0.75 font-sans text-xs font-semibold text-foreground transition-colors duration-150',
            showFormat ? 'border-accent-text bg-accent-soft text-accent-text' : 'hover:bg-muted',
          )}
        >
          Aa <span className="font-normal text-muted-foreground">formato</span>
        </button>
      </div>
    </div>
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

/**
 * Tipo de la tarea nueva (Tarea, Bug y, para el project manager sin padre, Historia).
 * @param {{ value: string, onChange: (type: string) => void, canStory: boolean, className?: string }} props
 */
function TypeSelect({ value, onChange, canStory, className }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Tipo" className={cn('inline-flex items-center gap-1.5', className)}>
          <TypeIcon type={value} size={14} />
          {TYPE_LABELS[value]}
          <ChevronDown className="size-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        {ISSUE_TYPES.map((option) => {
          const disabled = option.value === 'STORY' && !canStory
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              title={disabled ? 'Solo el project manager crea historias, y no dentro de otra tarea' : undefined}
              onClick={() => {
                setOpen(false)
                onChange(option.value)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"
            >
              <TypeIcon type={option.value} />
              <span className="flex-1">{option.label}</span>
              {option.value === value && <Check className="size-4" />}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
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
