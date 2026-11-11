import { useId, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckMark } from '@/components/common/CheckMark'
import { LockNote } from '@/components/common/LockNote'
import { Spinner } from '@/components/common/Loaders'
import { StateIcon } from '@/components/common/StateIcon'
import { DatePicker } from '@/features/issues/components/PropertyPickers'
import { useIssues } from '@/features/issues/hooks'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { differenceInCalendarDays, parseISO, startOfToday } from 'date-fns'
import { t, tn } from '@/i18n'
import { formatShortDate } from '@/lib/dates'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { addableIssues } from '../addableIssues'
import { closedText } from '../closeCycle'
import { planningUpdateBody } from '../planningDates'
import { useAddPlanningIssues, useCreatePlanning, useUpdatePlanning } from '../hooks'

/**
 * Textos y nombres de campos que cambian entre ciclos y módulos. Cada frase va entera (no se arma con
 * «ciclo»/«módulo» sueltos): en otro idioma el orden de las palabras cambia.
 */
export const PLANNING_TEXT = {
  cycles: {
    title: t('Ciclos'),
    newLabel: t('Nuevo ciclo'),
    editLabel: t('Editar ciclo'),
    deleteLabel: t('Eliminar ciclo'),
    created: t('Ciclo creado'),
    emptyTitle: t('Todavía no hay ciclos'),
    issuesTitle: t('Tareas del ciclo'),
    addHint: t('Agrega tareas del proyecto a este ciclo.'),
    removeTitle: t('Quitar del ciclo'),
    removeLabel: (code) => t('Quitar {code} del ciclo', { code }),
    endField: 'endDate',
    endLabel: t('Fin'),
    emptyDescription: t('Los ciclos (sprints) agrupan el trabajo de un periodo, por ejemplo dos semanas.'),
    memberEmptyDescription: t('Los ciclos (sprints) los crea el project manager. Cuando haya uno, podrás agregarle tareas.'),
    headerDescription: t('Sprints de trabajo con fecha de inicio y fin.'),
    placeholder: 'Sprint 1',
  },
  modules: {
    title: t('Módulos'),
    newLabel: t('Nuevo módulo'),
    editLabel: t('Editar módulo'),
    deleteLabel: t('Eliminar módulo'),
    created: t('Módulo creado'),
    emptyTitle: t('Todavía no hay módulos'),
    issuesTitle: t('Tareas del módulo'),
    addHint: t('Agrega tareas del proyecto a este módulo.'),
    removeTitle: t('Quitar del módulo'),
    removeLabel: (code) => t('Quitar {code} del módulo', { code }),
    endField: 'targetDate',
    endLabel: t('Fecha objetivo'),
    emptyDescription: t('Los módulos agrupan las tareas de una funcionalidad (ej. «Autenticación»).'),
    memberEmptyDescription: t('Los módulos los crea el project manager. Cuando haya uno, podrás agregarle tareas.'),
    headerDescription: t('Agrupa las tareas por funcionalidad. Una tarea puede estar en varios módulos.'),
    placeholder: t('Autenticación'),
  },
}

/** Estado del ciclo: pastilla (fondo/texto) y color de su barra de avance. */
export const CYCLE_STATUS = {
  DRAFT: {
    label: t('Borrador'),
    className: 'bg-muted text-muted-foreground',
    bar: 'bg-[#9E978C] dark:bg-[#A59E93]',
  },
  UPCOMING: {
    label: t('Próximo'),
    className: 'bg-[#E1F0FF] text-[#1C4E86] dark:bg-[#132A3D] dark:text-[#8CCBFF]',
    bar: 'bg-[#3B82F6] dark:bg-[#8CCBFF]',
  },
  CURRENT: {
    label: t('En curso'),
    className: 'bg-ok-soft text-ok',
    bar: 'bg-ok-dot',
  },
  COMPLETED: {
    label: t('Terminado'),
    className: 'bg-accent-soft text-accent-text',
    bar: 'bg-[#B08A3A] dark:bg-[#EAD9B0]',
  },
  // Cerrado a mano por el project manager (closedAt): ya no recibe tareas ni cambia de nombre o fechas
  CLOSED: {
    label: t('Cerrado'),
    className: 'bg-accent-soft text-accent-text',
    bar: 'bg-[#B08A3A] dark:bg-[#EAD9B0]',
  },
}

/** Estado para pintar un ciclo: CLOSED si se cerró; si no, el que calcula el backend por fechas. */
export function cycleStatusKey(cycle) {
  return cycle?.closedAt ? 'CLOSED' : (cycle?.status ?? 'DRAFT')
}

/**
 * Pastilla del estado del ciclo. Con `cycle` se usa su estado; si se cerró dice «Cerrado» con un candado
 * (cuándo y quién van en la línea de fechas, ver ClosedByText).
 */
export function CycleStatusBadge({ status, cycle, className }) {
  const key = cycle ? cycleStatusKey(cycle) : status
  const config = CYCLE_STATUS[key] ?? CYCLE_STATUS.DRAFT
  const closed = key === 'CLOSED' && cycle ? closedText(cycle) : ''
  return (
    <span
      className={cn(
        'inline-flex h-5.5 items-center gap-1 rounded-full px-2.5 font-mono text-[11px] font-semibold tracking-[0.04em] uppercase',
        config.className,
        className,
      )}
      title={closed ? closed[0].toUpperCase() + closed.slice(1) : undefined}
    >
      {key === 'CLOSED' && <Lock className="size-3" strokeWidth={2.5} aria-hidden="true" />}
      {config.label}
    </span>
  )
}

/** « · cerrado hoy por Ana» para la línea de fechas de un ciclo cerrado (nada si sigue abierto). */
export function ClosedByText({ cycle, className }) {
  const text = closedText(cycle)
  if (!text) return null
  return <span className={className}> · {text}</span>
}

/**
 * Indicador de resumen: etiqueta en monoespaciada, número grande en Bricolage con su unidad y una nota.
 * `compact` es la versión del diálogo de cierre; la normal, la de páginas (retrospectiva).
 * @param {{ label: string, value: React.ReactNode, unit?: string, note?: React.ReactNode,
 *           variant?: 'compact' | 'page', className?: string }} props
 */
export function SummaryTile({ label, value, unit, note, variant = 'page', className }) {
  const compact = variant === 'compact'
  return (
    <article
      className={cn(
        'flex min-w-0 flex-col gap-1 border',
        compact ? 'rounded-[14px] bg-subtle px-3.5 py-3' : 'rounded-2xl bg-card px-4 py-3.5',
        className,
      )}
    >
      <h3 className="font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">{label}</h3>
      <p
        className={cn(
          'font-display leading-[1.05] font-extrabold tracking-[-0.02em]',
          compact ? 'text-[26px]' : 'text-[30px]',
        )}
      >
        {value}
        {unit && <span className="ml-1 font-sans text-[13px] font-medium tracking-normal text-muted-foreground">{unit}</span>}
      </p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </article>
  )
}

/** «quedan 3 días», «termina hoy» o «terminó hace 2 días» según la fecha de fin. */
export function remainingText(end) {
  if (!end) return null
  const days = differenceInCalendarDays(parseISO(end), startOfToday())
  if (days > 1) return t('quedan {days} días', { days })
  if (days === 1) return t('queda 1 día')
  if (days === 0) return t('termina hoy')
  return days === -1 ? t('terminó ayer') : t('terminó hace {days} días', { days: -days })
}

/** «15 oct → 29 oct», o un texto si no hay fechas. */
export function DateRange({ start, end }) {
  if (!start && !end) return <span className="text-muted-foreground">{t('Sin fechas')}</span>
  return (
    <span>
      {start ? formatShortDate(start) : '…'} → {end ? formatShortDate(end) : '…'}
    </span>
  )
}

/** @param {{ progress: { totalIssues: number, completedIssues: number, percentage: number }, barClassName?: string }} props */
export function ProgressSummary({ progress, className, barClassName = 'bg-accent-text' }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {progress.totalIssues === 0
            ? t('Sin tareas')
            : t('{completed} de {total} completadas', { completed: progress.completedIssues, total: progress.totalIssues })}
        </span>
        <span className="font-mono font-semibold text-foreground">{progress.percentage}%</span>
      </div>
      <ProgressBar value={progress.percentage} className={barClassName} />
    </div>
  )
}

/** Barra de avance: riel con el color de las columnas y relleno según el estado. */
export function ProgressBar({ value, className, trackClassName, grow = false }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 overflow-hidden rounded-full bg-column', trackClassName)}
    >
      {/* `grow`: se llena desde cero hasta su valor (al cerrar un ciclo) */}
      <div className={cn('h-full rounded-full transition-[width]', grow && 'tf-bar-grow', className)} style={{ width: `${value}%` }} />
    </div>
  )
}

const planningSchema = z
  .object({
    name: z.string().trim().min(1, t('El nombre es obligatorio')).max(80, t('Máximo 80 caracteres')),
    description: z.string().max(10000, t('La descripción es demasiado larga')),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
  })
  .refine((values) => !values.startDate || !values.endDate || values.endDate >= values.startDate, {
    path: ['endDate'],
    message: t('No puede ser anterior a la fecha de inicio'),
  })

/** Crear o editar un ciclo/módulo (`item` presente = editar). */
export function PlanningFormDialog({ kind, slug, projectId, item, open, onOpenChange, onSaved }) {
  const text = PLANNING_TEXT[kind]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? text.editLabel : text.newLabel}</DialogTitle>
          <DialogDescription>{text.emptyDescription}</DialogDescription>
        </DialogHeader>
        {/* El formulario vive mientras exista el diálogo: así no desaparece durante la animación de cierre */}
        <PlanningForm
          kind={kind}
          slug={slug}
          projectId={projectId}
          item={item}
          onCancel={() => onOpenChange(false)}
          onSaved={(saved) => {
            onOpenChange(false)
            onSaved?.(saved)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

function PlanningForm({ kind, slug, projectId, item, onCancel, onSaved }) {
  const text = PLANNING_TEXT[kind]
  // Un ciclo cerrado solo cambia su descripción (el backend rechaza nombre y fechas con 409)
  const closed = kind === 'cycles' && Boolean(item?.closedAt)
  const create = useCreatePlanning(kind, slug, projectId)
  const update = useUpdatePlanning(kind, slug, projectId)
  const pending = create.isPending || update.isPending
  const form = useForm({
    resolver: zodResolver(planningSchema),
    defaultValues: {
      name: item?.name ?? '',
      description: item?.description ?? '',
      startDate: item?.startDate ?? null,
      endDate: item?.[text.endField] ?? null,
    },
  })
  const [startDate, endDate] = useWatch({ control: form.control, name: ['startDate', 'endDate'] })
  const startLabelId = useId()
  const endLabelId = useId()

  const onSubmit = (values) => {
    const body = { name: values.name, description: values.description, startDate: values.startDate, [text.endField]: values.endDate }
    const options = {
      onSuccess: (saved) => {
        toast.success(item ? t('Cambios guardados') : text.created)
        onSaved(saved)
      },
      onError: (error) => {
        const mapped = applyFieldErrors(error, form.setError, {
          aliases: { [text.endField]: 'endDate' },
          fields: ['name', 'description', 'startDate', 'endDate'],
        })
        if (!mapped) notifyError(error)
      },
    }
    if (closed) {
      update.mutate({ id: item.id, description: values.description }, options)
    } else if (item) {
      // Al editar, quitar una fecha se pide con su bandera (los null no cambian nada)
      update.mutate(planningUpdateBody(item, values, text.endField), options)
    } else {
      create.mutate(body, options)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Nombre')}</FormLabel>
              <FormControl>
                <Input placeholder={text.placeholder} autoFocus={!closed} disabled={closed} {...field} />
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
              <FormLabel>{t('Descripción')}</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder={t('Opcional')} autoFocus={closed} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label id={startLabelId}>{t('Inicio')}</Label>
            <DatePicker
              value={startDate}
              onChange={(value) => {
                form.clearErrors('startDate')
                form.setValue('startDate', value, { shouldDirty: true })
              }}
              placeholder={t('Sin fecha')}
              labelId={startLabelId}
              maxDate={endDate}
              disabled={closed}
              className="h-9 w-full justify-start border-input"
            />
            {form.formState.errors.startDate && (
              <p className="text-sm text-destructive">{form.formState.errors.startDate.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label id={endLabelId}>{text.endLabel}</Label>
            <DatePicker
              value={endDate}
              onChange={(value) => form.setValue('endDate', value, { shouldDirty: true, shouldValidate: true })}
              placeholder={t('Sin fecha')}
              labelId={endLabelId}
              minDate={startDate}
              disabled={closed}
              className="h-9 w-full justify-start border-input"
            />
            {form.formState.errors.endDate && (
              <p className="text-sm text-destructive">{form.formState.errors.endDate.message}</p>
            )}
          </div>
        </div>
        {closed && <LockNote>{t('El ciclo está cerrado: solo se puede cambiar la descripción.')}</LockNote>}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('Cancelar')}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {item ? t('Guardar') : t('Crear')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

/** Buscar tareas del proyecto y agregar varias a un ciclo/módulo. */
export function AddIssuesDialog({ kind, slug, projectId, item, existingIds, open, onOpenChange }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const debounced = useDebouncedValue(search, 300)
  const add = useAddPlanningIssues(kind, slug, projectId)
  const { data, isFetching } = useIssues(
    slug,
    projectId,
    { search: debounced || undefined, size: 100, sort: 'sequenceId,desc' },
    { enabled: open },
  )
  const candidates = addableIssues(data?.content ?? [], existingIds, kind)

  const toggle = (id) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const close = (value) => {
    if (!value) {
      setSelected(new Set())
      setSearch('')
    }
    onOpenChange(value)
  }

  const submit = () => {
    add.mutate(
      { id: item.id, issueIds: [...selected] },
      {
        onSuccess: () => {
          toast.success(tn(selected.size, '{count} tarea agregada', '{count} tareas agregadas'))
          close(false)
        },
        onError: (error) => notifyError(error),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="gap-3 p-0 sm:max-w-lg">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>{t('Agregar tareas a «{name}»', { name: item?.name ?? '' })}</DialogTitle>
          <DialogDescription>
            {kind === 'cycles'
              ? t('Si una tarea ya está en otro ciclo, se moverá a este.')
              : t('Una tarea puede estar en varios módulos.')}
          </DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false} className="border-t">
          <CommandInput placeholder={t('Buscar por título o código…')} value={search} onValueChange={setSearch} />
          <CommandList className="max-h-80">
            {isFetching && (
              <div className="flex justify-center py-3">
                <Spinner className="text-muted-foreground" />
              </div>
            )}
            {!isFetching && <CommandEmpty>{t('No hay tareas para agregar')}</CommandEmpty>}
            <CommandGroup>
              {candidates.map((issue) => (
                <CommandItem key={issue.id} value={issue.id} onSelect={() => toggle(issue.id)}>
                  <CheckMark checked={selected.has(issue.id)} />
                  <StateIcon group={issue.state?.group} color={issue.state?.color} />
                  <span className="min-w-14 shrink-0 font-mono text-xs whitespace-nowrap text-muted-foreground">{issue.code}</span>
                  <span className="min-w-0 flex-1 truncate">{issue.title}</span>
                  {kind === 'cycles' && issue.cycle && (
                    <span className="max-w-24 truncate text-xs text-muted-foreground">{issue.cycle.name}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <DialogFooter className="border-t px-4 py-3">
          <Button variant="ghost" onClick={() => close(false)}>
            {t('Cancelar')}
          </Button>
          <Button onClick={submit} disabled={selected.size === 0 || add.isPending}>
            {add.isPending && <Spinner />}
            {selected.size > 0 ? t('Agregar ({count})', { count: selected.size }) : t('Agregar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
