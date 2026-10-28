import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { Lock, MessagesSquare, Play } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Spinner } from '@/components/common/Loaders'
import { LockNote } from '@/components/common/LockNote'
import { EmptyState, ErrorState } from '@/components/common/States'
import { StateIcon } from '@/components/common/StateIcon'
import { IssuePeekSheet } from '@/features/issues/components/IssuePeekSheet'
import { useIssueFilters } from '@/features/issues/useIssueFilters'
import { DateRange, SummaryTile } from '@/features/planning/components/PlanningShared'
import { closedText } from '@/features/planning/closeCycle'
import { usePlanningItem, usePlanningList } from '@/features/planning/hooks'
import { useCurrentProject, useProjectMembers } from '@/features/projects/hooks'
import { formatDecimal } from '@/features/stats/chartMath'
import { useCurrentWorkspace, useIsManager } from '@/features/workspaces/hooks'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { formatShortDate } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { projectPath } from '@/lib/paths'
import { slugify } from '@/lib/slug'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/sessionStore'
import { RetroColumn } from '../components/RetroColumn'
import { VoteMark } from '../components/RetroNoteCard'
import { useFinishRetro, useRetro, useStartRetro } from '../hooks'
import {
  actionsProgress,
  canEditNote,
  groupNotes,
  MAX_VOTES,
  participantCount,
  previousClosedCycle,
  RETRO_COLUMNS,
  retroPhase,
} from '../retroNotes'

/** Pastilla de la fase de la retro. */
const PHASE_BADGE = {
  NOT_STARTED: { label: 'Sin empezar', className: 'bg-muted text-muted-foreground' },
  OPEN: { label: 'En curso', className: 'bg-ok-soft text-ok' },
  FINISHED: { label: 'Terminada', className: 'bg-accent-soft text-accent-text' },
}

/**
 * Retrospectiva de un ciclo: resumen automático, notas en tres columnas con votos, acciones que pasan a
 * tareas y las acciones de la retro anterior. Empezarla y terminarla es del project manager.
 */
export function RetroPage() {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  const { itemId: cycleId } = useParams()
  const manager = useIsManager()
  const userId = useSessionStore((state) => state.user?.id)
  const issueFilters = useIssueFilters()
  const cycle = usePlanningItem('cycles', workspace.slug, project.id, cycleId)
  const { data: cycles } = usePlanningList('cycles', workspace.slug, project.id)
  const retroQuery = useRetro(workspace.slug, project.id, cycleId)
  const { data: projectMembers } = useProjectMembers(workspace.slug, project.id)
  // Responsables posibles de una acción: los miembros del proyecto
  const members = useMemo(() => (projectMembers ?? []).map((member) => member.user), [projectMembers])
  const start = useStartRetro(workspace.slug, project.id, cycleId)
  const finish = useFinishRetro(workspace.slug, project.id, cycleId)
  const [composing, setComposing] = useState(null)
  const [confirmFinish, setConfirmFinish] = useState(false)

  const retro = retroQuery.data
  const phase = retroPhase(retro)
  const groups = useMemo(() => groupNotes(retro?.notes), [retro?.notes])
  const listUrl = `/${workspace.slug}/projects/${project.id}/cycles`
  const cycleUrl = `${listUrl}/${cycleId}`
  const basePath = [...projectPath(workspace, project), { label: 'ciclos', to: listUrl }]

  if (cycle.isLoading || retroQuery.isLoading) return <RetroSkeleton />
  const error = cycle.error ?? retroQuery.error
  if (error) {
    return (
      <>
        <PageHeader path={[...basePath, { label: 'retro' }]} title="Retrospectiva" documentTitle={['Retrospectiva', project.name]} />
        <ErrorState
          error={error}
          onRetry={() => (cycle.error ? cycle.refetch() : retroQuery.refetch())}
          homeLink={listUrl}
          className="flex-1"
        />
      </>
    )
  }

  const item = cycle.data
  const notes = retro.notes ?? []
  const people = participantCount(notes)
  const badge = PHASE_BADGE[phase]
  const ctx = {
    slug: workspace.slug,
    projectId: project.id,
    cycleId,
    userId,
    manager,
    members,
    canEdit: (note) => canEditNote(note, { userId, manager, phase }),
    openIssue: issueFilters.openIssue,
  }

  const startRetro = () =>
    start.mutate(undefined, {
      onSuccess: () => toast.success('Retrospectiva abierta'),
      onError: (startError) => notifyError(startError, 'No se pudo abrir la retrospectiva'),
    })

  return (
    <>
      <PageHeader
        path={[...basePath, { label: slugify(item.name) || item.name, to: cycleUrl }, { label: 'retro' }]}
        title={`Retrospectiva · ${item.name}`}
        titleAddon={
          <span
            className={cn(
              'inline-flex h-5.5 items-center rounded-full px-2.5 font-mono text-[11px] font-semibold tracking-[0.04em] uppercase',
              badge.className,
            )}
          >
            {badge.label}
          </span>
        }
        documentTitle={['Retrospectiva', item.name, project.name]}
        description={
          <p className="font-mono text-xs">
            <DateRange start={item.startDate} end={item.endDate} />
            {item.closedAt ? ` · ${closedText(item)}` : ' · ciclo sin cerrar'}
            {phase === 'FINISHED' && ` · retro terminada el ${formatShortDate(retro.finishedAt)}`}
            {phase !== 'NOT_STARTED' && (
              <>
                {` · ${people} ${people === 1 ? 'persona' : 'personas'}`}
                {` · ${notes.length} ${notes.length === 1 ? 'nota' : 'notas'}`}
              </>
            )}
          </p>
        }
        actions={
          <>
            {phase === 'OPEN' && (
              <span
                className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px]"
                title="Un voto por nota; puedes quitarlo para votar otra"
              >
                <VoteMark className="size-3 text-accent-text" />
                Te quedan <strong className="font-mono font-semibold">{retro.myVotesLeft}</strong> de {MAX_VOTES} votos
              </span>
            )}
            {phase === 'OPEN' &&
              (manager ? (
                <Button className="h-9.5 rounded-[11px] px-3.5" onClick={() => setConfirmFinish(true)}>
                  <Lock />
                  Terminar retro
                </Button>
              ) : (
                <LockNote>Solo el project manager termina la retro</LockNote>
              ))}
            {/* Sin empezar, quien no es PM ve el aviso en el cuerpo de la página */}
            {phase === 'NOT_STARTED' && manager && (
              <Button className="h-9.5 rounded-[11px] px-3.5" onClick={startRetro} disabled={start.isPending}>
                {start.isPending ? <Spinner /> : <Play />}
                Empezar retro
              </Button>
            )}
          </>
        }
      />
      <PageBody className="flex flex-col gap-3.5">
        <RetroSummary summary={retro.summary} />

        {phase === 'NOT_STARTED' ? (
          <div className="tf-panel">
            <EmptyState
              icon={MessagesSquare}
              title="La retrospectiva todavía no empezó"
              description={
                manager
                  ? 'Ábrela para que el equipo anote qué salió bien, qué mejorar y las acciones para el próximo ciclo.'
                  : 'El project manager la abre al cerrar el ciclo o desde aquí. Cuando esté abierta podrás escribir y votar notas.'
              }
              action={
                manager ? (
                  <Button onClick={startRetro} disabled={start.isPending}>
                    {start.isPending ? <Spinner /> : <Play />}
                    Empezar retrospectiva
                  </Button>
                ) : (
                  <LockNote>Solo el project manager empieza la retro</LockNote>
                )
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] items-start gap-3.5">
            {RETRO_COLUMNS.map((column) => (
              <RetroColumn
                key={column.key}
                column={column}
                notes={groups[column.key]}
                retro={retro}
                open={phase === 'OPEN'}
                composing={composing === column.key}
                onCompose={(value) => setComposing(value ? column.key : null)}
                ctx={ctx}
              />
            ))}
          </div>
        )}
        {phase === 'FINISHED' && (
          <p className="text-center font-mono text-[11px] text-muted-foreground">
            La retro terminó: las notas y los votos son de solo lectura.
            {manager && ' Desde las acciones se pueden seguir creando tareas.'}
          </p>
        )}

        <PreviousActions
          actions={retro.previousActions ?? []}
          previousCycle={previousClosedCycle(item, cycles)}
          onOpenIssue={issueFilters.openIssue}
        />
      </PageBody>

      <IssuePeekSheet
        slug={workspace.slug}
        project={project}
        issueId={issueFilters.openIssueId}
        onClose={issueFilters.closeIssue}
        onOpenIssue={issueFilters.openIssue}
      />
      <ConfirmDialog
        open={confirmFinish}
        onOpenChange={setConfirmFinish}
        title="¿Terminar la retrospectiva?"
        description="Las notas y los votos quedan de solo lectura. Desde las acciones se pueden seguir creando tareas."
        confirmLabel="Terminar retro"
        destructive={false}
        loading={finish.isPending}
        onConfirm={() =>
          finish.mutate(undefined, {
            onSuccess: () => {
              setConfirmFinish(false)
              setComposing(null)
              toast.success('Retrospectiva terminada')
            },
            onError: (finishError) => notifyError(finishError),
          })
        }
      />
    </>
  )
}

/** Resumen automático del ciclo: completadas, lo que pasó a otro ciclo o al backlog y el tiempo de ciclo. */
function RetroSummary({ summary }) {
  if (!summary) return null
  const { completedCount = 0, totalCount = 0, carriedToCycle = 0, carriedToBacklog = 0, cycleTimeDays } = summary
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  return (
    <section aria-label="Resumen automático del ciclo" className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
      <SummaryTile
        label="Completadas"
        value={completedCount}
        unit={`de ${totalCount} ${totalCount === 1 ? 'tarea' : 'tareas'}`}
        note={`${percentage} % de lo planificado`}
      />
      <SummaryTile
        label="Pasaron a otro ciclo"
        value={carriedToCycle}
        unit={carriedToCycle === 1 ? 'tarea' : 'tareas'}
        note={
          carriedToBacklog > 0
            ? `${carriedToBacklog}${carriedToCycle > 0 ? ' más' : ''} ${carriedToBacklog === 1 ? 'fue' : 'fueron'} al backlog`
            : 'ninguna fue al backlog'
        }
      />
      <SummaryTile
        label="Tiempo de ciclo"
        value={cycleTimeDays != null ? formatDecimal(cycleTimeDays) : '—'}
        unit={cycleTimeDays != null ? (cycleTimeDays === 1 ? 'día' : 'días') : undefined}
        note={cycleTimeDays != null ? 'mediana, de En curso a Hecho' : 'ninguna pasó de En curso a Hecho'}
      />
    </section>
  )
}

/** «// acciones de Sprint 0 · 2 de 3 hechas» con cada acción y el estado de su tarea. */
function PreviousActions({ actions, previousCycle, onOpenIssue }) {
  if (actions.length === 0) return null
  const { done, total } = actionsProgress(actions)
  return (
    <section
      aria-label="Acciones de la retro anterior"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-dashed border-dash px-4.5 py-2.5 text-[13px]"
    >
      <span className="font-mono text-[11px] text-muted-foreground">
        // acciones de {previousCycle ? previousCycle.name : 'la retro anterior'} · {done} de {total}{' '}
        {done === 1 ? 'hecha' : 'hechas'}
      </span>
      {actions.map((action) => {
        const issue = action.issue
        const completed = issue?.state?.group === 'COMPLETED'
        if (!issue) {
          return (
            <span key={action.id} className="flex items-center gap-1.5" title="Sin tarea: no se convirtió">
              <StateIcon group="UNSTARTED" color="currentColor" className="size-3.5 text-muted-foreground" />
              {action.text}
              <span className="text-muted-foreground">· sin tarea</span>
            </span>
          )
        }
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => onOpenIssue(issue.id)}
            title={`${issue.code} · ${issue.state?.name ?? ''}`}
            className={cn(
              'flex items-center gap-1.5 rounded-md text-left hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              completed && 'text-muted-foreground',
            )}
          >
            <StateIcon group={issue.state?.group} color={issue.state?.color} className="size-3.5" />
            {action.text}
            {!completed && <span className="text-muted-foreground">· {issue.state?.name ?? 'pendiente'}</span>}
          </button>
        )
      })}
    </section>
  )
}

function RetroSkeleton() {
  return (
    <div className="flex flex-col gap-3.5" aria-label="Cargando la retrospectiva">
      <Skeleton className="h-[118px] rounded-2xl" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[104px] rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3.5">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-72 rounded-[18px]" />
        ))}
      </div>
    </div>
  )
}
