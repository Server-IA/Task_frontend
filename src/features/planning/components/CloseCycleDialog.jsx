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
import { t, tn, tx } from '@/i18n'
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
import { useRetro } from '@/features/retro/hooks'
import { retroPhase } from '@/features/retro/retroNotes'
import { useClosePreview, useCloseCycle, usePlanningList } from '../hooks'
import { DateRange, SummaryTile } from './PlanningShared'

/** «WEB-2», «WEB-2 y WEB-4», «WEB-2, WEB-4 y WEB-15». */
function joinCodes(issues) {
  const codes = issues.map((issue) => issue.code)
  return codes.length <= 1 ? codes.join('') : t('{list} y {last}', { list: codes.slice(0, -1).join(', '), last: codes.at(-1) })
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
  const [wantRetro, setWantRetro] = useState(true)
  // La retro se puede empezar antes de cerrar (desde su página): entonces ya no se ofrece ni se dice que se abrió
  const { data: retro } = useRetro(slug, projectId, initialCycle.id)
  const retroAlready = retro && retroPhase(retro) !== 'NOT_STARTED' ? retroPhase(retro) : null
  const startRetro = wantRetro && !retroAlready

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
          const name = targetCycle?.name ?? t('otro ciclo')
          const toCycle = tn(result.movedToCycle, '{count} tarea a {name}', '{count} tareas a {name}', { name })
          const toBacklog = tn(result.movedToBacklog, '{count} tarea al backlog', '{count} tareas al backlog')
          let moved = t('No quedaban tareas sin terminar.')
          if (result.movedToCycle > 0 && result.movedToBacklog > 0) moved = t('Pasaron {first} y {second}.', { first: toCycle, second: toBacklog })
          else if (result.movedToCycle > 0) moved = t('Pasaron {moved}.', { moved: toCycle })
          else if (result.movedToBacklog > 0) moved = t('Pasaron {moved}.', { moved: toBacklog })
          toast.success(t('{name} cerrado', { name: cycle.name }), {
            // `retroStartedNow`: este cierre abrió la retro y el backend avisó a los miembros del proyecto (menos a quien
            // cierra). `retroStarted` también es true si ya estaba abierta (y entonces no se avisó a nadie)
            description: result.retroStartedNow ? t('{moved} Se abrió la retro y se avisó al equipo.', { moved }) : moved,
          })
          onClose()
          // A la retro si se abrió ahora o si ya estaba en curso (terminada, no hay nada que escribir)
          if (result.retroStartedNow || (result.retroStarted && (startRetro || retroAlready === 'OPEN'))) {
            navigate(`/${slug}/projects/${projectId}/cycles/${cycle.id}/retro`)
          }
        },
        onError: (error) => {
          notifyError(error, t('No se pudo cerrar el ciclo'))
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
          {t('Cerrar {name}', { name: cycle.name })}
        </DialogTitle>
        <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
          <DateRange start={cycle.startDate} end={cycle.endDate} />
        </span>
        <Button variant="ghost" size="icon" className="ml-auto size-8 text-muted-foreground" onClick={onClose} aria-label={t('Cerrar')}>
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
          <section aria-label={t('Resumen')} className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <SummaryTile
              variant="compact"
              label={t('Tareas hechas')}
              value={preview.data.completedCount}
              unit={t('de {total}', { total: cycle.progress?.totalIssues ?? preview.data.completedCount + preview.data.unfinishedCount })}
              note={t('{percentage} % del ciclo', { percentage: cycle.progress?.percentage ?? 0 })}
            />
            <SummaryTile
              variant="compact"
              label={t('Sin terminar')}
              value={preview.data.unfinishedCount}
              unit={tn(preview.data.unfinishedCount, 'tarea', 'tareas')}
              note={
                unfinished.length === 0
                  ? t('nada que mover')
                  : [
                      split.toCycle.length > 0 && t('{count} a {name}', { count: split.toCycle.length, name: targetCycle?.name }),
                      split.toBacklog.length > 0 && t('{count} al backlog', { count: split.toBacklog.length }),
                    ]
                      .filter(Boolean)
                      .join(' · ')
              }
            />
            <SummaryTile
              variant="compact"
              label={t('Tiempo de ciclo')}
              value={preview.data.cycleTimeDays != null ? formatDecimal(preview.data.cycleTimeDays) : '—'}
              unit={preview.data.cycleTimeDays != null ? tn(preview.data.cycleTimeDays, 'día', 'días') : undefined}
              note={preview.data.cycleTimeDays != null ? t('mediana, de En curso a Hecho') : t('ninguna pasó de En curso a Hecho')}
            />
          </section>

          {unfinished.length === 0 ? (
            <p className="rounded-xl border border-dashed px-3.5 py-3 text-sm text-muted-foreground">
              {t('Todas las tareas del ciclo están hechas o canceladas: no hay nada que mover.')}
            </p>
          ) : (
            // Un fieldset mide por defecto al menos su contenido (min-inline-size: min-content)
            <fieldset className="flex min-w-0 flex-col gap-2">
              <legend className="mb-2 text-sm font-semibold">
                {tn(unfinished.length, 'Qué hacer con la tarea sin terminar', 'Qué hacer con las {count} tareas sin terminar')}
              </legend>
              <div className={cn('grid grid-cols-1 gap-2', otherCycles.length > 0 && nextCycle ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
                {nextCycle && (
                  <DestinationOption
                    checked={mode === 'NEXT'}
                    onChange={() => setMode('NEXT')}
                    title={t('Mover a {name}', { name: nextCycle.name })}
                    description={<CycleFacts cycle={nextCycle} />}
                  />
                )}
                <DestinationOption
                  checked={mode === 'BACKLOG'}
                  onChange={() => setMode('BACKLOG')}
                  title={t('Mover al backlog')}
                  description={t('Quedan sin ciclo hasta replanificarlas')}
                />
                {otherCycles.length > 0 && (
                  <DestinationOption
                    checked={mode === 'OTHER'}
                    onChange={() => setMode('OTHER')}
                    title={nextCycle ? t('Otro ciclo') : t('Mover a otro ciclo')}
                    description={
                      <Select
                        value={otherCycleId ?? ''}
                        onValueChange={(value) => {
                          setOtherCycleId(value)
                          setMode('OTHER')
                        }}
                      >
                        <SelectTrigger size="sm" className="mt-1 h-7 w-full bg-card text-xs" aria-label={t('Ciclo destino')}>
                          <SelectValue placeholder={t('Elegir ciclo')} />
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
                  {otherCycles.length > 0
                    ? t('No hay un ciclo siguiente con fechas: las tareas van al backlog o a otro ciclo que elijas.')
                    : t('No hay un ciclo siguiente con fechas: las tareas van al backlog.')}
                </p>
              )}

              <ul className="max-h-64 overflow-y-auto rounded-xl border" aria-label={t('Tareas sin terminar')}>
                {unfinished.map((issue, index) => {
                  const destination = split.toCycle.includes(issue) ? 'CYCLE' : 'BACKLOG'
                  const exception = split.exceptions.includes(issue)
                  return (
                    // En el teléfono el destino baja a su propia línea si el título no cabe
                    <li key={issue.id} className={cn('flex flex-wrap items-center gap-x-2.5 gap-y-1 py-1.5 pr-2 pl-3', index > 0 && 'border-t')}>
                      <StateIcon group={issue.state?.group} color={issue.state?.color} className="size-3.5" />
                      <span className="min-w-14 shrink-0 font-mono text-xs whitespace-nowrap text-muted-foreground">{issue.code}</span>
                      {/* Base angosta: con «bloqueada» y avatares el destino ya no baja a otra línea en el escritorio */}
                      <span className="min-w-0 flex-[1_1_5rem] truncate text-sm font-medium" title={issue.title}>
                        {issue.title}
                      </span>
                      {/* Cada tarea de la vista previa trae cuántas tareas abiertas la bloquean */}
                      <BlockedChip issue={issue} className="hidden sm:inline-flex" />
                      {issue.assignees?.length > 0 && <AvatarStack users={issue.assignees} max={2} className="hidden sm:flex" />}
                      <Select value={destination} onValueChange={(value) => setRow(issue.id, value)} disabled={!targetCycle}>
                        <SelectTrigger
                          size="sm"
                          aria-label={t('Destino de {code}', { code: issue.code })}
                          className={cn('ml-auto h-7 w-32 shrink-0 bg-card text-xs sm:w-36', exception && 'border-accent-text bg-accent-soft dark:bg-accent-soft')}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          {targetCycle && <SelectItem value="CYCLE">{targetCycle.name}</SelectItem>}
                          <SelectItem value="BACKLOG">{t('Backlog')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </li>
                  )
                })}
              </ul>
              <OutcomeText split={split} mode={mode} targetCycle={targetCycle} missingOther={missingOther} />
            </fieldset>
          )}

          {retroAlready ? (
            <p className="text-xs text-muted-foreground">
              {retroAlready === 'OPEN' ? t('La retrospectiva ya está abierta: sigue igual al cerrar.') : t('La retrospectiva de este ciclo ya terminó.')}
            </p>
          ) : (
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={wantRetro}
                onChange={(event) => setWantRetro(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--ring)]"
              />
              <span>
                <span className="block text-sm font-semibold">{t('Empezar la retrospectiva')}</span>
                <span className="block text-xs text-muted-foreground">
                  {t('Abre la retro con el resumen del ciclo ya cargado y avisa al equipo.')}
                </span>
              </span>
            </label>
          )}
        </>
      )}

      <p className="flex items-center gap-2 rounded-[10px] bg-muted px-2.5 py-2 text-xs text-muted-foreground">
        <Lock className="size-3.5 shrink-0" aria-hidden="true" />
        {t('Solo el project manager cierra ciclos. Un ciclo cerrado ya no acepta tareas nuevas ni cambios de nombre o fechas.')}
      </p>

      <div className="flex flex-wrap items-center gap-3 border-t pt-3.5">
        <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">{t('esc cancelar')}</span>
        <Button variant="ghost" className="ml-auto" onClick={onClose}>
          {t('Cancelar')}
        </Button>
        {/* Con un nombre largo el botón se salía del diálogo (scroll horizontal y el atajo cortado): el nombre se corta */}
        <Button onClick={submit} disabled={!canSubmit} className="max-w-full min-w-0 shrink rounded-[10px]" title={t('Cerrar {name}', { name: cycle.name })}>
          {close.isPending && <Spinner />}
          <span className="truncate">{t('Cerrar {name}', { name: cycle.name })}</span>
          <kbd className="hidden shrink-0 rounded-[5px] bg-primary-foreground/20 px-1.5 font-mono text-[11px] font-normal sm:inline">
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
        {t('Termina el {date}. Si lo cierras hoy, la fecha de fin pasa a {today}.', { date: formatShortDate(cycle.endDate), today })}
      </span>
    )
  }
  if (notice.kind === 'today') return <span>{t('Termina hoy, {today}.', { today })}</span>
  if (notice.kind === 'ended') {
    return (
      <span>
        {tn(notice.days, 'Terminó el {date} (ayer).', 'Terminó el {date} (hace {count} días).', { date: formatShortDate(cycle.endDate) })}
      </span>
    )
  }
  return <span>{t('No tiene fecha de fin: al cerrarlo, la fecha de fin pasa a hoy, {today}.', { today })}</span>
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
      {count === 0 ? t('todavía sin tareas') : tn(count, 'ya tiene {count} tarea', 'ya tiene {count} tareas')}
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
  if (missingOther) return <p className="text-xs font-medium text-late">{t('Elige a qué ciclo van las tareas.')}</p>
  const general = mode === 'BACKLOG' || !targetCycle ? 'BACKLOG' : 'CYCLE'
  const sentences = []
  if (split.toCycle.length > 0 && targetCycle) {
    const total = (targetCycle.progress?.totalIssues ?? 0) + split.toCycle.length
    sentences.push(
      <span key="total">
        {tx('{name} quedaría con {tasks}.', {
          name: targetCycle.name,
          tasks: <span className="font-mono text-foreground">{tasksLabel(total)}</span>,
        })}
      </span>,
    )
  }
  if (split.exceptions.length > 0) {
    const count = split.exceptions.length
    const codes = joinCodes(split.exceptions)
    let text
    if (general !== 'CYCLE') text = tn(count, '{codes} pasa a {name}.', '{codes} pasan a {name}.', { codes, name: targetCycle.name })
    else if (allBlocked(split.exceptions)) text = tn(count, '{codes} va al backlog porque sigue bloqueada.', '{codes} van al backlog porque siguen bloqueadas.', { codes })
    else text = tn(count, '{codes} va al backlog.', '{codes} van al backlog.', { codes })
    sentences.push(<span key="exceptions"> {text}</span>)
  }
  if (sentences.length === 0) sentences.push(<span key="backlog">{t('Quedarán sin ciclo, en el estado en que están.')}</span>)
  return <p className="text-xs text-muted-foreground">{sentences}</p>
}

function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-label={t('Cargando el resumen del ciclo')}>
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
