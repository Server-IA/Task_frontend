import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { CalendarDays, Lock, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AvatarStack } from '@/components/common/AvatarStack'
import { Spinner } from '@/components/common/Loaders'
import { ErrorState } from '@/components/common/States'
import { StateIcon } from '@/components/common/StateIcon'
import { BlockedChip } from '@/features/issues/components/IssueBadges'
import { formatDecimal } from '@/features/stats/chartMath'
import { formatShortDate } from '@/lib/dates'
import { toApiError } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { IS_MAC } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import {
  allBlocked,
  buildCloseRequest,
  defaultCloseMode,
  endDateNotice,
  openTargetCycles,
  splitUnfinished,
  targetCycleOf,
  tasksLabel,
} from '../closeCycle'
import { useClosePreview, useCloseCycle, usePlanningList } from '../hooks'
import { DateRange, SummaryTile } from './PlanningShared'

/** «WEB-2», «WEB-2 y WEB-4», «WEB-2, WEB-4 y WEB-15». */
function joinCodes(issues) {
  const codes = issues.map((issue) => issue.code)
  return codes.length <= 1 ? codes.join('') : `${codes.slice(0, -1).join(', ')} y ${codes.at(-1)}`
}

/**
 * Cerrar un ciclo (solo el project manager): resumen, a dónde van las tareas sin terminar (destino general y
 * excepciones por tarea) y si se abre la retrospectiva. Al cerrar con la retro, lleva a ella.
 * @param {{ slug: string, projectId: string, cycle: import('@/api/types').CycleResponse,
 *           open: boolean, onOpenChange: (open: boolean) => void }} props
 */
export function CloseCycleDialog({ slug, projectId, cycle, open, onOpenChange }) {
  // Mientras el diálogo sale se sigue mostrando el último ciclo (quien lo abre puede limpiarlo al cerrar)
  const [lastCycle, setLastCycle] = useState(cycle)
  if (cycle && cycle !== lastCycle) setLastCycle(cycle)
  const shown = cycle ?? lastCycle

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-6 max-h-[calc(100dvh-3rem)] w-[min(660px,calc(100%-2rem))] max-w-none translate-y-0 gap-4 overflow-y-auto rounded-[20px] px-5.5 pt-4.5 pb-4 shadow-2xl sm:top-12 sm:max-h-[calc(100dvh-6rem)] sm:max-w-none"
      >
        {shown && <CloseCycleForm slug={slug} projectId={projectId} cycle={shown} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function CloseCycleForm({ slug, projectId, cycle: initialCycle, onClose }) {
  const navigate = useNavigate()
  const preview = useClosePreview(slug, projectId, initialCycle.id)
  const { data: cycles = [] } = usePlanningList('cycles', slug, projectId)
  const close = useCloseCycle(slug, projectId)
  const cycle = preview.data?.cycle ?? initialCycle

  const [chosenMode, setMode] = useState(null)
  const [otherCycleId, setOtherCycleId] = useState(null)
  const [overrides, setOverrides] = useState({})
  const [startRetro, setStartRetro] = useState(true)

  const nextCycle = preview.data?.nextCycle ?? null
  const mode = chosenMode ?? defaultCloseMode(preview.data)
  const otherCycles = openTargetCycles(cycles, cycle.id).filter((item) => item.id !== nextCycle?.id)
  const otherCycle = otherCycles.find((item) => item.id === otherCycleId) ?? null
  const targetCycle = targetCycleOf({ mode, nextCycle, otherCycle })
  const unfinished = useMemo(() => preview.data?.unfinished ?? [], [preview.data])
  const options = { mode, overrides, hasTarget: Boolean(targetCycle) }
  const split = splitUnfinished(unfinished, options)
  const missingOther = mode === 'OTHER' && !otherCycle
  const canSubmit = Boolean(preview.data) && !close.isPending && !missingOther

  const submit = () => {
    if (!canSubmit) return
    const body = buildCloseRequest({ ...options, otherCycleId, unfinished, startRetro })
    close.mutate(
      { id: cycle.id, ...body },
      {
        onSuccess: (result) => {
          const parts = []
          if (result.movedToCycle > 0) parts.push(`${tasksLabel(result.movedToCycle)} a ${targetCycle?.name ?? 'otro ciclo'}`)
          if (result.movedToBacklog > 0) parts.push(`${tasksLabel(result.movedToBacklog)} al backlog`)
          const moved = parts.length > 0 ? `Pasaron ${parts.join(' y ')}.` : 'No quedaban tareas sin terminar.'
          toast.success(`${cycle.name} cerrado`, {
            // Al abrir la retro el backend avisa a los miembros del proyecto (menos a quien cierra)
            description: result.retroStarted ? `${moved} Se abrió la retro y se avisó al equipo.` : moved,
          })
          onClose()
          if (startRetro && result.retroStarted) navigate(`/${slug}/projects/${projectId}/cycles/${cycle.id}/retro`)
        },
        onError: (error) => {
          notifyError(error, 'No se pudo cerrar el ciclo')
          // 400 (ya no hay ciclo siguiente) o 409 (ya cerrado): se vuelve a pedir la vista previa
          if ([400, 409].includes(toApiError(error).status)) preview.refetch()
        },
      },
    )
  }

  const setRow = (issueId, destination) => setOverrides((current) => ({ ...current, [issueId]: destination }))

  return (
    <div
      // min-w-0: el contenido (títulos truncados) no ensancha la columna del diálogo en pantallas angostas
      className="flex min-w-0 flex-col gap-4"
      onKeyDown={(event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault()
          submit()
        }
      }}
    >
      <div className="flex items-center gap-2.5">
        <DialogTitle className="font-display text-2xl leading-tight font-extrabold tracking-[-0.01em]">
          Cerrar {cycle.name}
        </DialogTitle>
        <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
          <DateRange start={cycle.startDate} end={cycle.endDate} />
        </span>
        <Button variant="ghost" size="icon" className="ml-auto size-8 text-muted-foreground" onClick={onClose} aria-label="Cerrar">
          <X />
        </Button>
      </div>

      <DialogDescription asChild>
        <p className="-mt-1.5 flex items-center gap-2 text-[13px] text-muted-foreground">
          <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
          <EndDateText cycle={cycle} />
        </p>
      </DialogDescription>

      {preview.isLoading && <PreviewSkeleton />}
      {preview.error && <ErrorState error={preview.error} onRetry={preview.refetch} className="py-6" />}

      {preview.data && (
        <>
          <section aria-label="Resumen" className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <SummaryTile
              variant="compact"
              label="Tareas hechas"
              value={preview.data.completedCount}
              unit={`de ${cycle.progress?.totalIssues ?? preview.data.completedCount + preview.data.unfinishedCount}`}
              note={`${cycle.progress?.percentage ?? 0} % del ciclo`}
            />
            <SummaryTile
              variant="compact"
              label="Sin terminar"
              value={preview.data.unfinishedCount}
              unit={preview.data.unfinishedCount === 1 ? 'tarea' : 'tareas'}
              note={
                unfinished.length === 0
                  ? 'nada que mover'
                  : [
                      split.toCycle.length > 0 && `${split.toCycle.length} a ${targetCycle?.name}`,
                      split.toBacklog.length > 0 && `${split.toBacklog.length} al backlog`,
                    ]
                      .filter(Boolean)
                      .join(' · ')
              }
            />
            <SummaryTile
              variant="compact"
              label="Tiempo de ciclo"
              value={preview.data.cycleTimeDays != null ? formatDecimal(preview.data.cycleTimeDays) : '—'}
              unit={preview.data.cycleTimeDays != null ? (preview.data.cycleTimeDays === 1 ? 'día' : 'días') : undefined}
              note={preview.data.cycleTimeDays != null ? 'mediana, de En curso a Hecho' : 'ninguna pasó de En curso a Hecho'}
            />
          </section>

          {unfinished.length === 0 ? (
            <p className="rounded-xl border border-dashed px-3.5 py-3 text-sm text-muted-foreground">
              Todas las tareas del ciclo están hechas o canceladas: no hay nada que mover.
            </p>
          ) : (
            // Un fieldset mide por defecto al menos su contenido (min-inline-size: min-content)
            <fieldset className="flex min-w-0 flex-col gap-2">
              <legend className="mb-2 text-sm font-semibold">
                Qué hacer con {unfinished.length === 1 ? 'la tarea sin terminar' : `las ${unfinished.length} tareas sin terminar`}
              </legend>
              <div className={cn('grid grid-cols-1 gap-2', otherCycles.length > 0 && nextCycle ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
                {nextCycle && (
                  <DestinationOption
                    checked={mode === 'NEXT'}
                    onChange={() => setMode('NEXT')}
                    title={`Mover a ${nextCycle.name}`}
                    description={<CycleFacts cycle={nextCycle} />}
                  />
                )}
                <DestinationOption
                  checked={mode === 'BACKLOG'}
                  onChange={() => setMode('BACKLOG')}
                  title="Mover al backlog"
                  description="Quedan sin ciclo hasta replanificarlas"
                />
                {otherCycles.length > 0 && (
                  <DestinationOption
                    checked={mode === 'OTHER'}
                    onChange={() => setMode('OTHER')}
                    title={nextCycle ? 'Otro ciclo' : 'Mover a otro ciclo'}
                    description={
                      <Select
                        value={otherCycleId ?? ''}
                        onValueChange={(value) => {
                          setOtherCycleId(value)
                          setMode('OTHER')
                        }}
                      >
                        <SelectTrigger size="sm" className="mt-1 h-7 w-full bg-card text-xs" aria-label="Ciclo destino">
                          <SelectValue placeholder="Elegir ciclo" />
                        </SelectTrigger>
                        <SelectContent>
                          {otherCycles.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    }
                  />
                )}
              </div>
              {!nextCycle && (
                <p className="text-xs text-muted-foreground">
                  No hay un ciclo siguiente con fechas: las tareas van al backlog{otherCycles.length > 0 && ' o a otro ciclo que elijas'}.
                </p>
              )}

              <ul className="max-h-64 overflow-y-auto rounded-xl border" aria-label="Tareas sin terminar">
                {unfinished.map((issue, index) => {
                  const destination = split.toCycle.includes(issue) ? 'CYCLE' : 'BACKLOG'
                  const exception = split.exceptions.includes(issue)
                  return (
                    // En el teléfono el destino baja a su propia línea si el título no cabe
                    <li key={issue.id} className={cn('flex flex-wrap items-center gap-x-2.5 gap-y-1 py-1.5 pr-2 pl-3', index > 0 && 'border-t')}>
                      <StateIcon group={issue.state?.group} color={issue.state?.color} className="size-3.5" />
                      <span className="min-w-14 shrink-0 font-mono text-xs whitespace-nowrap text-muted-foreground">{issue.code}</span>
                      <span className="min-w-0 flex-[1_1_8rem] truncate text-sm font-medium" title={issue.title}>
                        {issue.title}
                      </span>
                      {/* Cada tarea de la vista previa trae cuántas tareas abiertas la bloquean */}
                      <BlockedChip issue={issue} className="hidden sm:inline-flex" />
                      {issue.assignees?.length > 0 && <AvatarStack users={issue.assignees} max={2} className="hidden sm:flex" />}
                      <Select value={destination} onValueChange={(value) => setRow(issue.id, value)} disabled={!targetCycle}>
                        <SelectTrigger
                          size="sm"
                          aria-label={`Destino de ${issue.code}`}
                          className={cn('ml-auto h-7 w-32 shrink-0 bg-card text-xs sm:w-36', exception && 'border-accent-text bg-accent-soft dark:bg-accent-soft')}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          {targetCycle && <SelectItem value="CYCLE">{targetCycle.name}</SelectItem>}
                          <SelectItem value="BACKLOG">Backlog</SelectItem>
                        </SelectContent>
                      </Select>
                    </li>
                  )
                })}
              </ul>
              <OutcomeText split={split} mode={mode} targetCycle={targetCycle} missingOther={missingOther} />
            </fieldset>
          )}

          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={startRetro}
              onChange={(event) => setStartRetro(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[var(--ring)]"
            />
            <span>
              <span className="block text-sm font-semibold">Empezar la retrospectiva</span>
              <span className="block text-xs text-muted-foreground">
                Abre la retro con el resumen del ciclo ya cargado y avisa al equipo.
              </span>
            </span>
          </label>
        </>
      )}

      <p className="flex items-center gap-2 rounded-[10px] bg-muted px-2.5 py-2 text-xs text-muted-foreground">
        <Lock className="size-3.5 shrink-0" aria-hidden="true" />
        Solo el project manager cierra ciclos. Un ciclo cerrado ya no acepta tareas nuevas ni cambios de nombre o fechas.
      </p>

      <div className="flex flex-wrap items-center gap-3 border-t pt-3.5">
        <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">esc cancelar</span>
        <Button variant="ghost" className="ml-auto" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={!canSubmit} className="rounded-[10px]">
          {close.isPending && <Spinner />}
          Cerrar {cycle.name}
          <kbd className="hidden rounded-[5px] bg-primary-foreground/20 px-1.5 font-mono text-[11px] font-normal sm:inline">
            {IS_MAC ? '⌘ ↵' : 'ctrl ↵'}
          </kbd>
        </Button>
      </div>
    </div>
  )
}

/** «Termina el 29 oct. Si lo cierras hoy, la fecha de fin pasa a 28 oct.» y variantes. */
function EndDateText({ cycle }) {
  const notice = endDateNotice(cycle)
  const today = formatShortDate(new Date())
  if (notice.kind === 'shortens') {
    return (
      <span>
        Termina el {formatShortDate(cycle.endDate)}. Si lo cierras hoy, la fecha de fin pasa a {today}.
      </span>
    )
  }
  if (notice.kind === 'today') return <span>Termina hoy, {today}.</span>
  if (notice.kind === 'ended') {
    return (
      <span>
        Terminó el {formatShortDate(cycle.endDate)} ({notice.days === 1 ? 'ayer' : `hace ${notice.days} días`}).
      </span>
    )
  }
  return <span>No tiene fecha de fin: al cerrarlo, la fecha de fin pasa a hoy, {today}.</span>
}

/** «30 oct → 12 nov · ya tiene 3 tareas». */
function CycleFacts({ cycle }) {
  const count = cycle.progress?.totalIssues ?? 0
  return (
    <>
      {(cycle.startDate || cycle.endDate) && (
        <>
          <DateRange start={cycle.startDate} end={cycle.endDate} />
          {' · '}
        </>
      )}
      {count === 0 ? 'todavía sin tareas' : `ya tiene ${tasksLabel(count)}`}
    </>
  )
}

function DestinationOption({ checked, onChange, title, description }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors duration-150',
        checked ? 'border-accent-text bg-accent-soft' : 'hover:border-dash',
      )}
    >
      <input
        type="radio"
        name="close-destination"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 size-4 shrink-0 accent-[var(--ring)]"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className={cn('block text-xs', checked ? 'text-foreground' : 'text-muted-foreground')}>{description}</span>
      </span>
    </label>
  )
}

/** «Sprint 2 quedaría con 6 tareas. WEB-15 va al backlog.» */
function OutcomeText({ split, mode, targetCycle, missingOther }) {
  if (missingOther) return <p className="text-xs font-medium text-late">Elige a qué ciclo van las tareas.</p>
  const general = mode === 'BACKLOG' || !targetCycle ? 'BACKLOG' : 'CYCLE'
  const sentences = []
  if (split.toCycle.length > 0 && targetCycle) {
    const total = (targetCycle.progress?.totalIssues ?? 0) + split.toCycle.length
    sentences.push(
      <span key="total">
        {targetCycle.name} quedaría con <span className="font-mono text-foreground">{tasksLabel(total)}</span>.
      </span>,
    )
  }
  if (split.exceptions.length > 0) {
    const plural = split.exceptions.length > 1
    sentences.push(
      <span key="exceptions">
        {' '}
        {joinCodes(split.exceptions)}{' '}
        {general === 'CYCLE' ? `${plural ? 'van' : 'va'} al backlog` : `${plural ? 'pasan' : 'pasa'} a ${targetCycle.name}`}
        {general === 'CYCLE' && allBlocked(split.exceptions) && ` porque ${plural ? 'siguen bloqueadas' : 'sigue bloqueada'}`}.
      </span>,
    )
  }
  if (sentences.length === 0) sentences.push(<span key="backlog">Quedarán sin ciclo, en el estado en que están.</span>)
  return <p className="text-xs text-muted-foreground">{sentences}</p>
}

function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-label="Cargando el resumen del ciclo">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[86px] rounded-[14px]" />
        ))}
      </div>
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  )
}
