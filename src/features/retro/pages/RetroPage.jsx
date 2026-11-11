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
import { useCan, useCurrentWorkspace } from '@/features/workspaces/hooks'
import { stateName, t, tn, tx } from '@/i18n'
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
  NOT_STARTED: { label: t('Sin empezar'), className: 'bg-muted text-muted-foreground' },
  OPEN: { label: t('En curso'), className: 'bg-ok-soft text-ok' },
  FINISHED: { label: t('Terminada'), className: 'bg-accent-soft text-accent-text' },
}

/**
 * Retrospectiva de un ciclo: resumen automático, notas en tres columnas con votos, acciones que pasan a
 * tareas y las acciones de la retro anterior. Empezarla y terminarla es del project manager.
 */
export function RetroPage() {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  const { itemId: cycleId } = useParams()
  // «manager»: quien dirige la retro (la empieza, la termina y modera las notas)
  const manager = useCan('RETRO_MANAGE')
  const canParticipate = useCan('RETRO_PARTICIPATE')
  const canCreateIssues = useCan('ISSUE_CREATE')
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
  const basePath = [...projectPath(workspace, project), { label: t('ciclos'), to: listUrl }]

  if (cycle.isLoading || retroQuery.isLoading) return <RetroSkeleton />
  const error = cycle.error ?? retroQuery.error
  if (error) {
    return (
      <>
        <PageHeader path={[...basePath, { label: t('retro') }]} title={t('Retrospectiva')} documentTitle={[t('Retrospectiva'), project.name]} />
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
    open: phase === 'OPEN',
    // Escribir notas nuevas y votar pide el permiso de participar; crear tareas desde las acciones, el de crear tareas
    canParticipate,
    canCreateIssues,
    members,
    canEdit: (note) => canEditNote(note, { userId, manager, phase }),
    openIssue: issueFilters.openIssue,
  }

  const startRetro = () =>
    start.mutate(undefined, {
      onSuccess: () => toast.success(t('Retrospectiva abierta')),
      onError: (startError) => notifyError(startError, t('No se pudo abrir la retrospectiva')),
    })

  return (
    <>
      <PageHeader
        path={[...basePath, { label: slugify(item.name) || item.name, to: cycleUrl }, { label: t('retro') }]}
        title={t('Retrospectiva · {name}', { name: item.name })}
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
        documentTitle={[t('Retrospectiva'), item.name, project.name]}
        description={
          <p className="font-mono text-xs">
            <DateRange start={item.startDate} end={item.endDate} />
            {item.closedAt ? ` · ${closedText(item)}` : ` · ${t('ciclo sin cerrar')}`}
            {phase === 'FINISHED' && ` · ${t('retro terminada el {date}', { date: formatShortDate(retro.finishedAt) })}`}
            {phase !== 'NOT_STARTED' && (
              <>
                {` · ${tn(people, '{count} persona', '{count} personas')}`}
                {` · ${tn(notes.length, '{count} nota', '{count} notas')}`}
              </>
            )}
          </p>
        }
        actions={
          <>
            {phase === 'OPEN' && (
              <span
                className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px]"
                title={t('Un voto por nota; puedes quitarlo para votar otra')}
              >
                <VoteMark className="size-3 text-accent-text" />
                {tx('Te quedan {left} de {max} votos', {
                  left: <strong className="font-mono font-semibold">{retro.myVotesLeft}</strong>,
                  max: MAX_VOTES,
                })}
              </span>
            )}
            {phase === 'OPEN' &&
              (manager ? (
                <Button className="h-9.5 rounded-[11px] px-3.5" onClick={() => setConfirmFinish(true)}>
                  <Lock />
                  {t('Terminar retro')}
                </Button>
              ) : (
                <LockNote>{t('Tu rol no permite terminar la retro')}</LockNote>
              ))}
            {/* Sin empezar, quien no es PM ve el aviso en el cuerpo de la página */}
            {phase === 'NOT_STARTED' && manager && (
              <Button className="h-9.5 rounded-[11px] px-3.5" onClick={startRetro} disabled={start.isPending}>
                {start.isPending ? <Spinner /> : <Play />}
                {t('Empezar retro')}
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
              title={t('La retrospectiva todavía no empezó')}
              description={
                manager
                  ? t('Ábrela para que el equipo anote qué salió bien, qué mejorar y las acciones para el próximo ciclo.')
                  : t('Se abre al cerrar el ciclo o desde aquí, por quien dirige la retro. Cuando esté abierta podrás escribir y votar notas.')
              }
              action={
                manager ? (
                  <Button onClick={startRetro} disabled={start.isPending}>
                    {start.isPending ? <Spinner /> : <Play />}
                    {t('Empezar retrospectiva')}
                  </Button>
                ) : (
                  <LockNote>{t('Tu rol no permite empezar la retro')}</LockNote>
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
            {t('La retro terminó: las notas y los votos son de solo lectura.')}
            {manager && ` ${t('Desde las acciones se pueden seguir creando tareas.')}`}
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
        title={t('¿Terminar la retrospectiva?')}
        description={t('Las notas y los votos quedan de solo lectura. Desde las acciones se pueden seguir creando tareas.')}
        confirmLabel={t('Terminar retro')}
        destructive={false}
        loading={finish.isPending}
        onConfirm={() =>
          finish.mutate(undefined, {
            onSuccess: () => {
              // El campo de una nota a medio escribir se cierra solo, avisando si había texto (ver NoteEditor)
              setConfirmFinish(false)
              toast.success(t('Retrospectiva terminada'))
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
    // En filas que se reparten el ancho: en el teléfono la tercera no queda sola a media fila
    <section aria-label={t('Resumen automático del ciclo')} className="flex flex-wrap gap-3.5">
      <SummaryTile
        className="flex-[1_1_180px]"
        label={t('Completadas')}
        value={completedCount}
        unit={tn(totalCount, 'de {count} tarea', 'de {count} tareas')}
        note={t('{percentage} % de lo planificado', { percentage })}
      />
      <SummaryTile
        className="flex-[1_1_180px]"
        label={t('Pasaron a otro ciclo')}
        value={carriedToCycle}
        unit={tn(carriedToCycle, 'tarea', 'tareas')}
        note={
          carriedToBacklog === 0
            ? t('ninguna fue al backlog')
            : carriedToCycle > 0
              ? tn(carriedToBacklog, '{count} más fue al backlog', '{count} más fueron al backlog')
              : tn(carriedToBacklog, '{count} fue al backlog', '{count} fueron al backlog')
        }
      />
      <SummaryTile
        className="flex-[1_1_180px]"
        label={t('Tiempo de ciclo')}
        value={cycleTimeDays != null ? formatDecimal(cycleTimeDays) : '—'}
        unit={cycleTimeDays != null ? tn(cycleTimeDays, 'día', 'días') : undefined}
        note={cycleTimeDays != null ? t('mediana, de En curso a Hecho') : t('ninguna pasó de En curso a Hecho')}
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
      aria-label={t('Acciones de la retro anterior')}
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-dashed border-dash px-4.5 py-2.5 text-[13px]"
    >
      <span className="font-mono text-[11px] text-muted-foreground">
        {previousCycle
          ? tn(done, '// acciones de {name} · {count} de {total} hecha', '// acciones de {name} · {count} de {total} hechas', {
              name: previousCycle.name,
              total,
            })
          : tn(done, '// acciones de la retro anterior · {count} de {total} hecha', '// acciones de la retro anterior · {count} de {total} hechas', {
              total,
            })}
      </span>
      {actions.map((action) => {
        const issue = action.issue
        const completed = issue?.state?.group === 'COMPLETED'
        if (!issue) {
          return (
            <span key={action.id} className="flex items-center gap-1.5" title={t('Sin tarea: no se convirtió')}>
              <StateIcon group="UNSTARTED" color="currentColor" className="size-3.5 text-muted-foreground" />
              {action.text}
              <span className="text-muted-foreground">{t('· sin tarea')}</span>
            </span>
          )
        }
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => onOpenIssue(issue.id)}
            title={`${issue.code} · ${stateName(issue.state)}`}
            className={cn(
              'flex items-center gap-1.5 rounded-md text-left hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              completed && 'text-muted-foreground',
            )}
          >
            <StateIcon group={issue.state?.group} color={issue.state?.color} className="size-3.5" />
            {action.text}
            {!completed && <span className="text-muted-foreground">· {stateName(issue.state) || t('pendiente')}</span>}
          </button>
        )
      })}
    </section>
  )
}

function RetroSkeleton() {
  return (
    <div className="flex flex-col gap-3.5" aria-label={t('Cargando la retrospectiva')}>
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
