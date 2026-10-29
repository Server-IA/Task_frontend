import { useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, FileText, GripVertical, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AvatarStack } from '@/components/common/AvatarStack'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LabelChip } from '@/components/common/LabelChip'
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { LockNote } from '@/components/common/LockNote'
import { Segmented } from '@/components/common/Segmented'
import { StateIcon } from '@/components/common/StateIcon'
import { EmptyState, ErrorState } from '@/components/common/States'
import { LazyRichEditor } from '@/features/editor/components/LazyRichEditor'
import { MarkdownView } from '@/features/editor/components/MarkdownView'
import { AssigneesPicker, LabelsPicker, PriorityPicker, StatePicker } from '@/features/issues/components/PropertyPickers'
import { PriorityChip } from '@/features/issues/components/PriorityIcon'
import { useProjectMeta } from '@/features/issues/useIssueHelpers'
import { useIsManager } from '@/features/workspaces/hooks'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { TypeIcon } from '@/features/issues/components/IssueTypeBits'
import { ISSUE_TYPES, templateType, TYPE_LABELS } from '@/features/issues/issueTypes'
import { checklistLabel, templateSummary, usesLabel } from '../applyTemplate'
import { useCreateTemplate, useDeleteTemplate, useTemplates, useUpdateTemplate } from '../hooks'

/** @typedef {import('@/api/types').IssueTemplate} IssueTemplate */

/** Mismas reglas que el backend. */
const templateSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(60, 'Máximo 60 caracteres'),
  titlePrefix: z.string().max(40, 'Máximo 40 caracteres'),
  description: z.string().max(50000, 'La descripción es demasiado larga'),
  priority: z.string(),
  type: z.enum(['STORY', 'TASK', 'BUG']),
  stateId: z.string().nullable(),
  assigneeIds: z.array(z.string()).max(20, 'Máximo 20 asignados'),
  labelIds: z.array(z.string()).max(20, 'Máximo 20 etiquetas'),
  checklist: z
    .array(z.object({ kind: z.enum(['CRITERION', 'CHECK']), text: z.string().max(500, 'Máximo 500 caracteres') }))
    .max(50, 'Máximo 50 elementos en la checklist'),
})

const NEW = 'new'
const EMPTY_VALUES = {
  name: '',
  titlePrefix: '',
  description: '',
  priority: 'NONE',
  type: 'TASK',
  stateId: null,
  assigneeIds: [],
  labelIds: [],
  checklist: [],
}

/** @param {IssueTemplate} template */
const toFormValues = (template) => ({
  name: template.name ?? '',
  titlePrefix: template.titlePrefix ?? '',
  description: template.description ?? '',
  priority: template.priority ?? 'NONE',
  type: templateType(template),
  stateId: template.state?.id ?? null,
  assigneeIds: (template.assignees ?? []).map((user) => user.id),
  labelIds: (template.labels ?? []).map((label) => label.id),
  checklist: (template.checklist ?? []).map(({ kind, text }) => ({ kind, text })),
})

/**
 * Lo que se envía: sin elementos vacíos en la checklist. Prefijo o descripción vacíos los quitan; al editar, sin
 * estado se envía `clearState` para quitarlo.
 */
const toRequest = ({ stateId, ...values }, isNew) => ({
  ...values,
  ...(stateId ? { stateId } : isNew ? {} : { clearState: true }),
  name: values.name.trim(),
  checklist: values.checklist
    .map((item) => ({ kind: item.kind, text: item.text.trim() }))
    .filter((item) => item.text),
})

/**
 * Pestaña «Plantillas» de los ajustes del proyecto: la lista a la izquierda y el editor de la elegida a la derecha.
 * Solo el project manager las crea, edita, ordena y elimina; los miembros las ven como referencia.
 */
export function TemplatesSettings({ slug, project }) {
  const { data: templates, isLoading, error, refetch } = useTemplates(slug, project.id)
  const update = useUpdateTemplate(slug, project.id)
  const canManage = useIsManager()
  const [selectedId, setSelectedId] = useState(null)

  const list = templates ?? []
  const selected = selectedId === NEW ? null : (list.find((template) => template.id === selectedId) ?? list[0] ?? null)
  const editingNew = selectedId === NEW || (canManage && list.length === 0)

  /** Sube o baja una plantilla (position = índice nuevo). */
  const move = (template, index, direction) =>
    update.mutate(
      { templateId: template.id, position: index + direction },
      { onError: (moveError) => notifyError(moveError, 'No se pudo mover la plantilla') },
    )

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Plantillas de tareas</CardTitle>
          <CardDescription>
            Rellenan la tarea nueva con título, descripción, estado, prioridad, etiquetas, asignados y checklist. Todo el equipo
            las usa al crear tareas.
          </CardDescription>
          {!canManage && <LockNote>Solo el project manager puede cambiar las plantillas.</LockNote>}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <CenteredSpinner />}
        {error && <ErrorState error={error} onRetry={refetch} />}
        {templates && list.length === 0 && !canManage && (
          <EmptyState icon={FileText} title="Sin plantillas" description="El project manager puede crear plantillas para el equipo." className="py-6" />
        )}
        {templates && (list.length > 0 || canManage) && (
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex min-w-0 flex-[1_1_250px] flex-col gap-2">
              <ul className="flex flex-col gap-1.5">
                {list.map((template, index) => {
                  const current = !editingNew && selected?.id === template.id
                  const reorderable = canManage && list.length > 1
                  return (
                    <li key={template.id} className="group relative">
                      <button
                        type="button"
                        aria-current={current ? 'true' : undefined}
                        onClick={() => setSelectedId(template.id)}
                        className={cn(
                          'flex w-full flex-col gap-1.5 rounded-[14px] border px-3.5 py-3 text-left transition-colors duration-150',
                          current ? 'border-accent-text bg-accent-soft' : 'bg-card hover:border-dash',
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={cn(
                              'flex size-6.5 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-semibold',
                              current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {template.name.trim()[0]?.toUpperCase()}
                          </span>
                          <TypeIcon type={templateType(template)} size={14} />
                          <span className="min-w-0 flex-1 truncate font-semibold">{template.name}</span>
                          <span
                            className={cn(
                              'shrink-0 font-mono text-[11px] text-muted-foreground transition-opacity duration-150',
                              // Al pasar el mouse, las flechas de subir y bajar ocupan su lugar
                              reorderable && 'group-focus-within:opacity-0 group-hover:opacity-0',
                            )}
                            title="Tareas creadas con esta plantilla"
                          >
                            {usesLabel(template.usageCount)}
                          </span>
                        </span>
                        <span className="truncate font-mono text-xs text-muted-foreground">
                          {templateSummary(template) || 'sin valores por defecto'}
                        </span>
                      </button>
                      {reorderable && (
                        <span className="absolute top-2.5 right-2 flex opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground"
                            aria-label={`Subir «${template.name}»`}
                            disabled={index === 0 || update.isPending}
                            onClick={() => move(template, index, -1)}
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground"
                            aria-label={`Bajar «${template.name}»`}
                            disabled={index === list.length - 1 || update.isPending}
                            onClick={() => move(template, index, 1)}
                          >
                            <ArrowDown />
                          </Button>
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setSelectedId(NEW)}
                  aria-pressed={editingNew}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-[14px] border border-dashed border-dash px-3.5 py-2.5 font-medium transition-colors duration-150 hover:border-foreground/40 hover:bg-accent',
                    editingNew && 'border-accent-text bg-accent-soft text-accent-text',
                  )}
                >
                  <Plus className="size-3.5" strokeWidth={2.5} />
                  Nueva plantilla
                </button>
              )}
            </div>
            {(editingNew || selected) && (
              <TemplateEditor
                key={editingNew ? NEW : selected.id}
                slug={slug}
                project={project}
                template={editingNew ? null : selected}
                canManage={canManage}
                onSaved={(saved) => setSelectedId(saved.id)}
                onDeleted={() => setSelectedId(null)}
                onCancelNew={() => setSelectedId(null)}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const fieldLabel = 'flex flex-col gap-1.5 text-xs font-medium text-muted-foreground'

const SKELETON_VIEWS = [
  { value: 'visual', label: 'Visual' },
  { value: 'markdown', label: 'Markdown' },
]

/**
 * «Esqueleto de la descripción»: el mismo editor que la descripción de la tarea, con la barra compacta, o el
 * Markdown tal cual. Para los miembros, solo lectura.
 */
function SkeletonField({ value, onChange, readOnly, error }) {
  const [view, setView] = useState('visual')
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2.5">
        <span id="esqueleto-label" className="text-xs font-medium text-muted-foreground">
          Esqueleto de la descripción
        </span>
        <Segmented label="Vista del esqueleto" size="sm" className="ml-auto p-0.5" value={view} onChange={setView} options={SKELETON_VIEWS} />
      </div>
      <div
        className={cn(
          'flex flex-col overflow-hidden rounded-[10px] border bg-card',
          !readOnly && 'focus-within:border-ring focus-within:shadow-[0_0_0_3px_var(--accent-soft)]',
        )}
      >
        {view === 'markdown' ? (
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            readOnly={readOnly}
            aria-labelledby="esqueleto-label"
            rows={8}
            className="resize-y bg-transparent px-3.5 py-2.5 font-mono text-[12.5px] leading-[1.6] outline-none"
          />
        ) : readOnly ? (
          <MarkdownView markdown={value} size="sm" className="min-h-16 px-3.5 pt-2.5 pb-3" />
        ) : (
          <LazyRichEditor
            value={value}
            onChange={onChange}
            size="sm"
            toolbar="compact"
            ariaLabel="Esqueleto de la descripción"
            placeholder="Escribe la estructura, o pulsa / para insertar"
            contentClassName="min-h-28 px-3.5 pt-2.5 pb-3"
          />
        )}
        <div className="flex flex-wrap items-center gap-3 border-t px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
          <span>## título · 1. lista · [ ] tarea · / insertar</span>
          <span className="ml-auto">se guarda como Markdown</span>
        </div>
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}

/** Formulario de una plantilla (nueva si `template` es null). Para los miembros, solo lectura. */
function TemplateEditor({ slug, project, template, canManage, onSaved, onDeleted, onCancelNew }) {
  const { states, labels, users } = useProjectMeta(slug, project.id)
  const create = useCreateTemplate(slug, project.id)
  const update = useUpdateTemplate(slug, project.id)
  const remove = useDeleteTemplate(slug, project.id)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const form = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: template ? toFormValues(template) : EMPTY_VALUES,
  })
  const checklist = useFieldArray({ control: form.control, name: 'checklist' })
  const values = useWatch({ control: form.control })
  const isNew = !template
  const readOnly = !canManage
  const dirty = form.formState.isDirty
  const pending = create.isPending || update.isPending
  const errors = form.formState.errors

  const onSubmit = (formValues) => {
    const body = toRequest(formValues, isNew)
    const options = {
      onSuccess: (saved) => {
        toast.success(isNew ? `Plantilla «${saved.name}» creada` : 'Plantilla guardada')
        form.reset(toFormValues(saved))
        onSaved(saved)
      },
      onError: (saveError) => {
        if (!applyFieldErrors(saveError, form.setError)) notifyError(saveError)
      },
    }
    if (isNew) create.mutate(body, options)
    else update.mutate({ templateId: template.id, ...body }, options)
  }

  const handleDelete = () =>
    remove.mutate(template.id, {
      onSuccess: () => {
        toast.success(`Plantilla «${template.name}» eliminada`)
        setConfirmDelete(false)
        onDeleted()
      },
      onError: (deleteError) => notifyError(deleteError),
    })

  const chip = (empty) =>
    cn('h-8 rounded-full border px-3 text-[13px]', empty ? 'border-dashed border-dash text-muted-foreground' : 'border-border bg-card')
  const selectedLabels = labels.filter((label) => values.labelIds?.includes(label.id))
  const selectedState = states.find((state) => state.id === values.stateId)
  const selectedUsers = users.filter((user) => values.assigneeIds?.includes(user.id))
  const hasDefaults = Boolean(selectedState) || values.priority !== 'NONE' || selectedLabels.length > 0 || selectedUsers.length > 0

  return (
    <form
      aria-label={isNew ? 'Nueva plantilla' : `Editar plantilla ${template.name}`}
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="tf-fade flex min-w-0 flex-[2_1_460px] flex-col gap-3.5 rounded-2xl border bg-subtle px-4.5 py-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={fieldLabel}>
          Nombre
          <Input {...form.register('name')} readOnly={readOnly} placeholder="Reporte de bug" autoFocus={isNew} className="bg-card text-sm font-normal text-foreground" />
          {errors.name && <span className="font-normal text-destructive">{errors.name.message}</span>}
        </label>
        <label className={fieldLabel}>
          Prefijo del título
          <Input {...form.register('titlePrefix')} readOnly={readOnly} placeholder="[Bug] " className="bg-card font-mono text-sm font-normal text-foreground" />
          {errors.titlePrefix && <span className="font-normal text-destructive">{errors.titlePrefix.message}</span>}
        </label>
      </div>
      {values.titlePrefix && (
        <p className="-mt-1.5 text-xs text-muted-foreground">
          Así queda: <span className="font-mono whitespace-pre-wrap text-foreground">{values.titlePrefix}Título de la tarea</span>
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">Crea una</p>
        <div role="radiogroup" aria-label="Tipo de la tarea que crea" className="flex flex-wrap items-center gap-1.5">
          {ISSUE_TYPES.map((option) => {
            const checked = values.type === option.value
            if (readOnly && !checked) return null
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={checked}
                disabled={readOnly}
                onClick={() => form.setValue('type', option.value, { shouldDirty: true })}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium disabled:cursor-default',
                  checked ? 'border-accent-text bg-accent-soft font-semibold text-accent-text' : 'bg-card hover:border-dash',
                )}
              >
                <TypeIcon type={option.value} size={14} />
                {TYPE_LABELS[option.value]}
              </button>
            )
          })}
          {!readOnly && (
            <span className="text-xs text-muted-foreground">
              {values.type === 'STORY' ? 'solo el project manager crea historias' : 'al elegir la plantilla, la tarea toma este tipo'}
            </span>
          )}
        </div>
      </div>
      <SkeletonField
        value={values.description ?? ''}
        onChange={(description) => {
          if (description !== form.getValues('description')) form.setValue('description', description, { shouldDirty: true })
        }}
        readOnly={readOnly}
        error={errors.description?.message}
      />

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">Valores por defecto</p>
        {readOnly ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {selectedState && (
              <span className={cn(chip(false), 'inline-flex items-center gap-1.5')}>
                <StateIcon group={selectedState.group} color={selectedState.color} />
                {selectedState.name}
              </span>
            )}
            {values.priority !== 'NONE' ? <PriorityChip priority={values.priority} /> : null}
            {selectedLabels.map((label) => (
              <LabelChip key={label.id} label={label} />
            ))}
            {selectedUsers.length > 0 && (
              <span className={cn(chip(false), 'inline-flex items-center gap-1.5')}>
                <AvatarStack users={selectedUsers} size="xs" />
                {selectedUsers.map((user) => user.fullName.split(' ')[0]).join(', ')}
              </span>
            )}
            {!hasDefaults && <span className="text-sm text-muted-foreground">Sin valores por defecto</span>}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <StatePicker
              states={states}
              value={values.stateId}
              onChange={(stateId) => form.setValue('stateId', stateId, { shouldDirty: true })}
              noneLabel="Sin estado fijo"
              className={chip(!selectedState)}
            />
            <PriorityPicker
              value={values.priority}
              onChange={(priority) => form.setValue('priority', priority, { shouldDirty: true })}
              className={chip(values.priority === 'NONE')}
            />
            <LabelsPicker
              labels={labels}
              value={values.labelIds ?? []}
              onChange={(labelIds) => form.setValue('labelIds', labelIds, { shouldDirty: true })}
              compact
              className={chip(!values.labelIds?.length)}
            />
            <AssigneesPicker
              members={users}
              value={values.assigneeIds ?? []}
              onChange={(assigneeIds) => form.setValue('assigneeIds', assigneeIds, { shouldDirty: true })}
              className={chip(!values.assigneeIds?.length)}
            />
          </div>
        )}
        {errors.assigneeIds?.message && <span className="text-xs text-destructive">{errors.assigneeIds.message}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          Checklist{' '}
          <span className="font-mono">{checklistLabel(values.checklist?.filter((item) => item.text?.trim())) || 'vacía'}</span>
        </p>
        {checklist.fields.length > 0 && (
          <TemplateChecklistEditor form={form} fieldArray={checklist} readOnly={readOnly} />
        )}
        {errors.checklist?.message && <span className="text-xs text-destructive">{errors.checklist.message}</span>}
        {!readOnly && (
          <div className="flex gap-1.5">
            {[
              ['CHECK', '+ paso'],
              ['CRITERION', '+ criterio'],
            ].map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                disabled={checklist.fields.length >= 50}
                onClick={() => checklist.append({ kind, text: '' })}
                className="rounded-full border border-dashed border-dash px-2.5 py-1 text-xs transition-colors duration-150 hover:border-foreground/40 hover:bg-accent disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {canManage && (
        <div className="flex flex-wrap items-center gap-2.5 border-t pt-3">
          {isNew ? (
            <Button type="button" variant="ghost" className="text-muted-foreground" onClick={onCancelNew}>
              Cancelar
            </Button>
          ) : (
            <Button type="button" variant="ghost" className="text-muted-foreground" onClick={() => setConfirmDelete(true)}>
              Eliminar plantilla
            </Button>
          )}
          {/* Los dos botones van juntos: si no cabe todo, el aviso sube a su propia línea */}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1.5">
            {dirty && !isNew && <span className="font-mono text-[11px] text-muted-foreground">cambios sin guardar</span>}
            <div className="flex items-center gap-2.5">
              {!isNew && (
                <Button type="button" variant="outline" disabled={!dirty || pending} onClick={() => form.reset()}>
                  Descartar
                </Button>
              )}
              <Button type="submit" disabled={pending || (!isNew && !dirty)}>
                {pending && <Spinner />}
                {isNew ? 'Crear plantilla' : 'Guardar plantilla'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {template && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`¿Eliminar la plantilla «${template.name}»?`}
          description="Las tareas ya creadas con ella no cambian."
          confirmLabel="Eliminar"
          loading={remove.isPending}
          onConfirm={handleDelete}
        />
      )}
    </form>
  )
}

/** Pasos y criterios de la plantilla: tipo, texto, quitar y reordenar arrastrando el asa (o alt + ↑ ↓). */
function TemplateChecklistEditor({ form, fieldArray, readOnly }) {
  const { fields, move, remove } = fieldArray
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const errors = form.formState.errors.checklist

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return
        const from = fields.findIndex((field) => field.id === active.id)
        const to = fields.findIndex((field) => field.id === over.id)
        if (from >= 0 && to >= 0) move(from, to)
      }}
    >
      <SortableContext items={fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
        <ol className="overflow-hidden rounded-xl border bg-card">
          {fields.map((field, index) => (
            <TemplateChecklistRow
              key={field.id}
              id={field.id}
              index={index}
              count={fields.length}
              form={form}
              readOnly={readOnly}
              error={errors?.[index]?.text?.message}
              onMove={move}
              onRemove={() => remove(index)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}

function TemplateChecklistRow({ id, index, count, form, readOnly, error, onMove, onRemove }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: readOnly,
  })
  const kind = useWatch({ control: form.control, name: `checklist.${index}.kind` })
  const text = useWatch({ control: form.control, name: `checklist.${index}.text` })
  const isCriterion = kind === 'CRITERION'

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative flex flex-wrap items-center gap-2 bg-card py-1 pr-1.5 pl-1', index > 0 && 'border-t', isDragging && 'z-10 shadow-lg')}
    >
      {!readOnly && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          onKeyDown={(event) => {
            if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
              event.preventDefault()
              const target = index + (event.key === 'ArrowUp' ? -1 : 1)
              if (target >= 0 && target < count) onMove(index, target)
              return
            }
            listeners?.onKeyDown?.(event)
          }}
          aria-label={`Mover «${text || 'elemento'}»`}
          title="Arrastra o usa alt + ↑ ↓"
          className={cn(
            'flex h-7 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-dash hover:bg-accent hover:text-muted-foreground active:cursor-grabbing',
            isDragging && 'bg-accent-soft text-accent-text',
          )}
        >
          <GripVertical className="size-3.5" />
        </button>
      )}
      <button
        type="button"
        disabled={readOnly}
        onClick={() =>
          form.setValue(`checklist.${index}.kind`, isCriterion ? 'CHECK' : 'CRITERION', { shouldDirty: true })
        }
        title={readOnly ? undefined : 'Cambiar entre paso y criterio'}
        className={cn(
          'w-16 shrink-0 rounded-md px-1.5 py-0.5 text-center font-mono text-[11px] transition-colors duration-150 disabled:cursor-default',
          isCriterion ? 'bg-accent-soft font-semibold text-accent-text' : 'bg-muted text-muted-foreground',
          !readOnly && 'hover:ring-1 hover:ring-dash',
          readOnly && 'ml-1.5',
        )}
      >
        {isCriterion ? 'criterio' : 'paso'}
      </button>
      <input
        {...form.register(`checklist.${index}.text`)}
        readOnly={readOnly}
        maxLength={500}
        aria-label={isCriterion ? 'Texto del criterio' : 'Texto del paso'}
        placeholder={isCriterion ? 'Dado …, cuando …, entonces …' : 'Qué hay que hacer'}
        className="min-w-0 flex-1 rounded-md bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted-foreground focus:bg-accent/50 read-only:focus:bg-transparent"
      />
      {!readOnly && (
        <Button type="button" variant="ghost" size="icon" className="size-7 text-muted-foreground" aria-label={`Quitar «${text || 'elemento'}»`} onClick={onRemove}>
          <X className="size-3.5" />
        </Button>
      )}
      {error && <span className="w-full pb-1 pl-9 text-xs text-destructive">{error}</span>}
    </li>
  )
}
