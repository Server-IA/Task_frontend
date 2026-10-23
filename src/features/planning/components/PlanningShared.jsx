import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/common/Loaders'
import { StateIcon } from '@/components/common/StateIcon'
import { DatePicker } from '@/features/issues/components/PropertyPickers'
import { useIssues } from '@/features/issues/hooks'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatShortDate } from '@/lib/dates'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useAddPlanningIssues, useCreatePlanning, useUpdatePlanning } from '../hooks'

/** Textos y nombres de campos que cambian entre ciclos y módulos. */
export const PLANNING_TEXT = {
  cycles: {
    title: 'Ciclos',
    singular: 'ciclo',
    newLabel: 'Nuevo ciclo',
    endField: 'endDate',
    endLabel: 'Fin',
    emptyDescription: 'Los ciclos (sprints) agrupan el trabajo de un periodo, por ejemplo dos semanas.',
    placeholder: 'Sprint 1',
  },
  modules: {
    title: 'Módulos',
    singular: 'módulo',
    newLabel: 'Nuevo módulo',
    endField: 'targetDate',
    endLabel: 'Fecha objetivo',
    emptyDescription: 'Los módulos agrupan los issues de una funcionalidad (ej. «Autenticación»).',
    placeholder: 'Autenticación',
  },
}

export const CYCLE_STATUS = {
  DRAFT: { label: 'Borrador', className: 'bg-muted text-muted-foreground' },
  UPCOMING: { label: 'Próximo', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  CURRENT: { label: 'En curso', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  COMPLETED: { label: 'Terminado', className: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
}

export function CycleStatusBadge({ status }) {
  const config = CYCLE_STATUS[status] ?? CYCLE_STATUS.DRAFT
  return <Badge className={cn('border-transparent font-medium', config.className)}>{config.label}</Badge>
}

/** «15 oct → 29 oct», o un texto si no hay fechas. */
export function DateRange({ start, end }) {
  if (!start && !end) return <span className="text-muted-foreground">Sin fechas</span>
  return (
    <span>
      {start ? formatShortDate(start) : '…'} → {end ? formatShortDate(end) : '…'}
    </span>
  )
}

/** @param {{ progress: { totalIssues: number, completedIssues: number, percentage: number } }} props */
export function ProgressSummary({ progress, className }) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {progress.completedIssues} de {progress.totalIssues} completados
        </span>
        <span className="font-medium text-foreground">{progress.percentage}%</span>
      </div>
      <Progress value={progress.percentage} className="h-1.5" />
    </div>
  )
}

const planningSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es obligatorio').max(80, 'Máximo 80 caracteres'),
    description: z.string().max(10000, 'La descripción es demasiado larga'),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
  })
  .refine((values) => !values.startDate || !values.endDate || values.endDate >= values.startDate, {
    path: ['endDate'],
    message: 'No puede ser anterior a la fecha de inicio',
  })

/** Crear o editar un ciclo/módulo (`item` presente = editar). */
export function PlanningFormDialog({ kind, slug, projectId, item, open, onOpenChange, onSaved }) {
  const text = PLANNING_TEXT[kind]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? `Editar ${text.singular}` : text.newLabel}</DialogTitle>
          <DialogDescription>{text.emptyDescription}</DialogDescription>
        </DialogHeader>
        {open && (
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
        )}
      </DialogContent>
    </Dialog>
  )
}

function PlanningForm({ kind, slug, projectId, item, onCancel, onSaved }) {
  const text = PLANNING_TEXT[kind]
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

  const onSubmit = (values) => {
    const body = { name: values.name, description: values.description, startDate: values.startDate, [text.endField]: values.endDate }
    const options = {
      onSuccess: (saved) => {
        toast.success(item ? 'Cambios guardados' : `${text.singular[0].toUpperCase()}${text.singular.slice(1)} creado`)
        onSaved(saved)
      },
      onError: (error) => {
        if (!applyFieldErrors(error, form.setError)) notifyError(error)
      },
    }
    if (item) {
      // Al editar, quitar ambas fechas se pide con clearDates (los null no cambian nada)
      const cleared = !values.startDate && !values.endDate && (item.startDate || item[text.endField])
      update.mutate(cleared ? { id: item.id, name: values.name, description: values.description, clearDates: true } : { id: item.id, ...body }, options)
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
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder={text.placeholder} autoFocus {...field} />
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
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="Opcional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FormLabel>Inicio</FormLabel>
            <DatePicker
              value={startDate}
              onChange={(value) => form.setValue('startDate', value, { shouldDirty: true })}
              placeholder="Sin fecha"
              maxDate={endDate}
              className="h-9 w-full justify-start border-input"
            />
          </div>
          <div className="space-y-2">
            <FormLabel>{text.endLabel}</FormLabel>
            <DatePicker
              value={endDate}
              onChange={(value) => form.setValue('endDate', value, { shouldDirty: true, shouldValidate: true })}
              placeholder="Sin fecha"
              minDate={startDate}
              className="h-9 w-full justify-start border-input"
            />
            {form.formState.errors.endDate && (
              <p className="text-sm text-destructive">{form.formState.errors.endDate.message}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {item ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

/** Buscar issues del proyecto y agregar varios a un ciclo/módulo. */
export function AddIssuesDialog({ kind, slug, projectId, item, existingIds, open, onOpenChange }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const debounced = useDebouncedValue(search, 300)
  const add = useAddPlanningIssues(kind, slug, projectId)
  const { data, isFetching } = useIssues(
    slug,
    projectId,
    { search: debounced || undefined, size: 50, sort: 'sequenceId,desc' },
    { enabled: open },
  )
  const candidates = (data?.content ?? []).filter((issue) => !existingIds.has(issue.id))

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
          toast.success(`${selected.size} ${selected.size === 1 ? 'issue agregado' : 'issues agregados'}`)
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
          <DialogTitle>Agregar issues a «{item?.name}»</DialogTitle>
          <DialogDescription>
            {kind === 'cycles'
              ? 'Si un issue ya está en otro ciclo, se moverá a este.'
              : 'Un issue puede estar en varios módulos.'}
          </DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false} className="border-t">
          <CommandInput placeholder="Buscar por título o código…" value={search} onValueChange={setSearch} />
          <CommandList className="max-h-80">
            {isFetching && (
              <div className="flex justify-center py-3">
                <Spinner className="text-muted-foreground" />
              </div>
            )}
            {!isFetching && <CommandEmpty>No hay issues para agregar</CommandEmpty>}
            <CommandGroup>
              {candidates.map((issue) => (
                <CommandItem key={issue.id} value={issue.id} onSelect={() => toggle(issue.id)}>
                  <span
                    className={cn(
                      'flex size-4 items-center justify-center rounded-sm border',
                      selected.has(issue.id) && 'border-primary bg-primary text-primary-foreground',
                    )}
                  >
                    {selected.has(issue.id) && <Check className="size-3" />}
                  </span>
                  <StateIcon group={issue.state?.group} color={issue.state?.color} />
                  <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">{issue.code}</span>
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
            Cancelar
          </Button>
          <Button onClick={submit} disabled={selected.size === 0 || add.isPending}>
            {add.isPending && <Spinner />}
            Agregar{selected.size > 0 && ` (${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
