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
import { inlineImageTarget } from '@/features/files/hooks'
import { useMentionPeople } from '@/features/mentions/hooks'
import { t } from '@/i18n'
import {
  applyTemplate,
  appliedParts,
  checklistLabel,
  descriptionEditedSinceTemplate,
  fromTemplateFlags,
} from '@/features/templates/applyTemplate'
import { useTemplates } from '@/features/templates/hooks'
import { useCan } from '@/features/workspaces/hooks'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useCreateIssue } from '../hooks'
import { flash } from '@/lib/flash'
import { firstTemplateOfType, ISSUE_TYPES, templateType, TYPE_LABELS } from '../issueTypes'
import { landNewTask } from '../taskMotion'
import { useProjectMeta } from '../useIssueHelpers'
import { TypeIcon } from './IssueTypeBits'
import { AssigneesPicker, DatePicker, LabelsPicker, PriorityPicker, StatePicker } from './PropertyPickers'

const issueSchema = z
  .object({
    title: z.string().trim().min(1, t('El título es obligatorio')).max(255, t('Máximo 255 caracteres')),
    description: z.string().max(50000, t('La descripción es demasiado larga')),
    stateId: z.string().nullable(),
    priority: z.string(),
    assigneeIds: z.array(z.string()),
    labelIds: z.array(z.string()),
    startDate: z.string().nullable(),
    dueDate: z.string().nullable(),
  })
  .refine((values) => !values.startDate || !values.dueDate || values.dueDate >= values.startDate, {
    path: ['dueDate'],
    message: t('La fecha límite no puede ser anterior al inicio'),
  })

/** Máximo de criterios y pasos que acepta el backend al crear una tarea. */
const CHECKLIST_ON_CREATE = 50
/** Los diálogos y paneles laterales de la app (no los menús desplegables, que también son `role="dialog"`). */
const PANELS = '[data-slot="dialog-content"], [data-slot="sheet-content"]'

/** Título del diálogo según el tipo y, si tiene, la historia (o tarea) padre. */
function dialogTitle(type, defaults) {
  if (defaults.parentId) {
    const code = defaults.parentCode
    if (defaults.parentType !== 'STORY') return t('Nueva subtarea de {code}', { code })
    return type === 'BUG' ? t('Nuevo bug de la historia {code}', { code }) : t('Nueva tarea de la historia {code}', { code })
  }
  if (defaults.relatesToCode) {
    const code = defaults.relatesToCode
    return type === 'STORY' ? t('Nueva historia relacionada con {code}', { code }) : t('Nueva tarea relacionada con {code}', { code })
  }
  return type === 'STORY' ? t('Nueva historia') : type === 'BUG' ? t('Reportar bug') : t('Nueva tarea')
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
  const title = event.currentTarget?.querySelector(`input[aria-label="${t('Título')}"]`)
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
  // Cerrar (Escape, clic afuera, la X o «Cancelar») con un título o una descripción escritos pregunta antes: el
  // formulario decide (closeGuardRef devuelve true si abrió la confirmación)
  const closeGuardRef = useRef(null)
  const requestOpenChange = (next) => {
    if (!next && closeGuardRef.current?.()) return
    onOpenChange(next)
  }
  return (
    <Dialog open={open} onOpenChange={requestOpenChange}>
      {/* Ancho y alto: casi toda la pantalla de un escritorio, para escribir la descripción con espacio. Arriba y con
          scroll propio: con una plantilla (descripción y checklist) puede ser más alto que la pantalla */}
      <DialogContent
        className="top-[min(7%,3.5rem)] max-h-[calc(100dvh_-_min(7%,3.5rem)_-_1.5rem)] translate-y-0 gap-4 overflow-y-auto px-7 pt-5.5 pb-5 sm:max-w-[min(980px,calc(100%_-_3rem))]"
        onOpenAutoFocus={focusTitle}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold">
            <ProjectIcon project={project} className="rounded-md px-2 text-[11px]" />
            <TypeIcon type={type} size={14} />
            {dialogTitle(type, defaults)}
            {project.nextIssueCode && (
              <span className="font-mono text-xs font-normal text-muted-foreground" title={t('Código que tendrá si nadie crea otra antes')}>
                {t('→ será {code}', { code: project.nextIssueCode })}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">{t('Escribe el título y elige sus propiedades.')}</DialogDescription>
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
          onCancel={() => requestOpenChange(false)}
          onDiscard={() => onOpenChange(false)}
          closeGuardRef={closeGuardRef}
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

function CreateIssueForm({ slug, project, defaults, type, onTypeChange, onCancel, onDiscard, closeGuardRef, onCreated }) {
  const meta = useProjectMeta(slug, project.id)
  const create = useCreateIssue(slug, project.id)
  const { data: allTemplates = [] } = useTemplates(slug, project.id)
  const canManageStories = useCan('STORY_MANAGE')
  const canEditTemplates = useCan('PROJECT_TEMPLATES')
  // Las historias las crea quien las gestiona, y la tarea de una historia (o una subtarea) no puede ser historia
  const canStory = canManageStories && !defaults.parentId
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

  // Lo escrito que se perdería al cerrar: el título (más allá del prefijo de la plantilla o del que vino escrito) o la
  // descripción (más allá de la de la plantilla)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  useEffect(() => {
    if (!closeGuardRef) return undefined
    closeGuardRef.current = () => {
      const { title = '', description = '' } = form.getValues()
      const startTitle = template?.titlePrefix ?? defaults.title ?? ''
      const startDescription = template ? (template.description ?? base?.description ?? '') : ''
      const typed = title.trim() !== startTitle.trim() || description.trim() !== startDescription.trim()
      if (typed) setConfirmDiscard(true)
      return typed
    }
    return () => {
      closeGuardRef.current = null
    }
  })

  // ctrl ↵ dos veces (o con la tecla repitiendo) no crea dos tareas: el botón se deshabilita, el atajo no
  const submitting = useRef(false)
  // Imágenes pegadas en la descripción: sin tarea todavía (el backend las liga al crearla); se crea cuando terminan
  const [imageUpload] = useState(() => ({ target: inlineImageTarget(slug, project.id) }))
  const [uploading, setUploading] = useState(0)
  const onSubmit = (data) => {
    if (uploading > 0) {
      toast.info(uploading === 1 ? t('La imagen sigue subiendo') : t('Las imágenes siguen subiendo'), { description: t('La tarea se puede crear cuando termine.') })
      return
    }
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
        toast.success(t('{code} creada', { code: issue.code }), { description: issue.title })
        // Si el diálogo se cierra, se encoge hasta una ficha que viaja al lugar de la tarea nueva, que queda resaltada
        // en la lista o el tablero; con «crear otra» el diálogo sigue abierto y solo se resalta
        if (createMore) flash('created', issue.id, 2200)
        else {
          // Este diálogo (no el primero de la página: puede haberse abierto encima del detalle de una tarea o de una
          // historia). Si debajo queda un panel abierto, la tarea nueva se busca en él, que es lo que se ve
          const dialog = titleRef.current?.closest(PANELS)
          const under = [...document.querySelectorAll(PANELS)].filter((panel) => panel !== dialog).at(-1)
          landNewTask(dialog?.getBoundingClientRect(), issue, under)
        }
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
    cn('h-9 rounded-full border px-3.5 text-sm', empty ? 'border-dashed border-dash text-muted-foreground' : 'border-border bg-card')

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => form.handleSubmit(onSubmit)(event)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return
          event.preventDefault()
          if (!event.repeat && !submitting.current) form.handleSubmit(onSubmit)(event)
        }}
        className="space-y-4"
        noValidate
      >
        {templates.length > 0 && (
          <TemplateBar
            templates={templates}
            active={template}
            onChoose={requestTemplate}
            settingsUrl={canEditTemplates ? `/${slug}/projects/${project.id}/settings?tab=templates` : null}
            onLeave={onDiscard}
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
                  placeholder={t('Título')}
                  aria-label={t('Título')}
                  className="w-full bg-transparent text-[26px] leading-tight font-semibold outline-none placeholder:text-muted-foreground"
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
                imageUpload={imageUpload}
                onUploadsChange={setUploading}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-wrap items-center gap-2">
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
            placeholder={t('Inicio')}
            maxDate={values.dueDate}
            className={chip(!values.startDate)}
          />
          <DatePicker
            value={values.dueDate}
            onChange={setField('dueDate')}
            placeholder={t('Fecha límite')}
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
              {template ? t('Crear otra con la misma plantilla') : t('Crear otra')}
            </Label>
          </div>
          <span className="ml-auto hidden font-mono text-[11px] text-muted-foreground sm:inline">{t('esc cerrar')}</span>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('Cancelar')}
          </Button>
          <Button type="submit" disabled={create.isPending || uploading > 0} title={uploading > 0 ? t('Se activa cuando termina la subida') : undefined}>
            {(create.isPending || uploading > 0) && <Spinner />}
            {uploading > 0 ? t('Subiendo…') : type === 'STORY' ? t('Crear historia') : type === 'BUG' ? t('Reportar bug') : t('Crear tarea')}
            <kbd className="rounded-[5px] bg-foreground/10 px-1.5 text-[11px] font-normal">ctrl ↵</kbd>
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={pendingTemplate !== undefined}
        onOpenChange={(open) => !open && setPendingTemplate(undefined)}
        title={pendingTemplate ? t('¿Cambiar a «{name}»?', { name: pendingTemplate.name }) : t('¿Quitar la plantilla?')}
        description={t('Editaste la descripción de la plantilla y se reemplazará: perderás esos cambios.')}
        confirmLabel={pendingTemplate ? t('Cambiar de plantilla') : t('Quitar plantilla')}
        onConfirm={() => {
          chooseTemplate(pendingTemplate)
          setPendingTemplate(undefined)
        }}
        // Cancelado, el foco vuelve a la pastilla de la plantilla; cambiada, al título (como sin confirmación)
        focusAfterConfirmRef={titleRef}
      />
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title={type === 'STORY' ? t('¿Descartar la historia?') : type === 'BUG' ? t('¿Descartar el bug?') : t('¿Descartar la tarea?')}
        description={t('Se pierde lo que escribiste en el título y la descripción.')}
        confirmLabel={t('Descartar')}
        onConfirm={() => {
          setConfirmDiscard(false)
          onDiscard()
        }}
      />
    </Form>
  )
}

/**
 * Descripción con el editor compacto: «/» para insertar y la barra sobre el texto seleccionado; «Aa formato»
 * muestra la barra de formato. Una plantilla la llena (y «Deshacer» la devuelve) porque el valor viene del form.
 */
function DescriptionField({ value, onChange, people, slug, projectIdentifier, imageUpload, onUploadsChange }) {
  const [showFormat, setShowFormat] = useState(false)
  return (
    <div className="flex flex-col">
      {/* Sin overflow-hidden: recortaba los menús del editor (el enlace, «/», @). La barra redondea sus esquinas */}
      <div className={cn(showFormat && 'rounded-xl border [&_[role=toolbar]]:rounded-t-[11px]')}>
        <LazyRichEditor
          value={value}
          onChange={onChange}
          toolbar={showFormat ? 'compact' : false}
          people={people}
          slug={slug}
          projectIdentifier={projectIdentifier}
          ariaLabel={t('Descripción')}
          imageUpload={imageUpload}
          onUploadsChange={onUploadsChange}
          contentClassName={cn('max-h-[min(52dvh,560px)] min-h-[min(30dvh,260px)] overflow-y-auto', showFormat ? 'px-3 py-2' : 'py-0.5')}
        />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-dashed pt-2 font-mono text-[11px] text-muted-foreground">
        <span>
          <kbd className="text-foreground">/</kbd> {t('insertar')}
        </span>
        <span>{t('selecciona texto para darle formato')}</span>
        <span>
          <kbd className="text-foreground">@</kbd> {t('mencionar')}
        </span>
        <button
          type="button"
          aria-pressed={showFormat}
          title={showFormat ? t('Ocultar la barra de formato') : t('Mostrar la barra de formato')}
          onClick={() => setShowFormat((current) => !current)}
          className={cn(
            'ml-auto flex items-center gap-1.5 rounded-[7px] border px-2 py-0.75 font-sans text-xs font-semibold text-foreground transition-colors duration-150',
            showFormat ? 'border-accent-text bg-accent-soft text-accent-text' : 'hover:bg-muted',
          )}
        >
          Aa <span className="font-normal text-muted-foreground">{t('formato')}</span>
        </button>
      </div>
    </div>
  )
}

/** Plantillas del proyecto como pastillas («Ninguna», «Reporte de bug»…) y qué aplicó la elegida. */
function TemplateBar({ templates, active, onChoose, settingsUrl, onLeave }) {
  const options = [{ id: null, name: t('Ninguna') }, ...templates]
  return (
    <div className="flex flex-col gap-2 rounded-[14px] border bg-subtle px-3 py-2.5">
      <div role="radiogroup" aria-label={t('Plantilla')} className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-muted-foreground">{t('Plantilla')}</span>
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
            {t('Editar plantillas')}
          </Link>
        )}
      </div>
      {active && (
        <p className="tf-fade flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {t('Se aplicó «{name}»: {parts}. Todo se puede cambiar.', { name: active.name, parts: appliedParts(active) })}
          <button type="button" className="font-semibold text-foreground underline underline-offset-2" onClick={() => onChoose(null)}>
            {t('Deshacer')}
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
        <button type="button" aria-label={t('Tipo')} className={cn('inline-flex items-center gap-1.5', className)}>
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
              title={disabled ? t('Solo el project manager crea historias, y no dentro de otra tarea') : undefined}
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
          title={t('Viene de la plantilla')}
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
        {t('Checklist de la plantilla')}
        <span className="font-mono text-xs font-normal text-muted-foreground">{checklistLabel(checklist)}</span>
        <span className="ml-auto text-xs font-normal text-muted-foreground">{t('se agrega a la tarea')}</span>
        <ChevronDown className="size-3.5 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 px-3 pb-2.5 text-[13px] sm:grid-cols-2">
        {checklist.map((item, index) => (
          <li key={index} className="flex min-w-0 items-start gap-2">
            <span aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 rounded-[4px] border-[1.5px] border-dash" />
            <span className="min-w-0 break-words">
              {item.kind === 'CRITERION' && <span className="mr-1.5 font-mono text-[11px] text-accent-text">{t('criterio')}</span>}
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}
