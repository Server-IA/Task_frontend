import { Bug } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/common/States'
import { cn } from '@/lib/utils'
import { BOARD_PAGE_SIZE, PRIORITY_LABELS } from '../constants'
import { useIssues } from '../hooks'
import { bugGroups } from '../issueTypes'
import { useIssueUpdater } from '../useIssueHelpers'
import { BlockedChip } from './IssueBadges'
import { ParentStoryChip, TypeIcon } from './IssueTypeBits'
import { PriorityIcon } from './PriorityIcon'
import { AssigneesPicker, PriorityPicker, StatePicker } from './PropertyPickers'

/** Id de la vista «Bugs» en `?savedView=` (viene con cada proyecto, no se guarda en la base de datos). */
export const BUGS_VIEW_ID = 'bugs'

/** Estados abiertos del proyecto (los bugs de la vista son los que no están completados ni cancelados). */
export const openStateIds = (states) => states.filter((state) => state.group !== 'COMPLETED' && state.group !== 'CANCELLED').map((state) => state.id)

/**
 * Vista «Bugs»: los bugs abiertos agrupados por prioridad (urgente → baja) y «Por triar» al final (sin prioridad o
 * sin asignado), con asignar y prioridad a mano. Un bug de una historia lleva «apareció en WEB-15». Respeta los demás
 * filtros de la barra (asignado, etiqueta, búsqueda…).
 */
export function BugsView({ slug, project, meta, filters, openIssue, openIssueId }) {
  const params = {
    ...filters,
    type: ['BUG'],
    state: filters.state?.length ? filters.state : openStateIds(meta.states),
    sort: 'priorityRank,asc',
    page: 0,
    size: BOARD_PAGE_SIZE,
  }
  const { data, isLoading, error, refetch } = useIssues(slug, project.id, params, { enabled: meta.states.length > 0 })

  if (isLoading || meta.states.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    )
  }
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const groups = bugGroups(data.content)
  if (groups.length === 0) {
    return <EmptyState icon={Bug} title="No hay bugs abiertos" description="Cuando alguien reporte uno, aparece aquí por prioridad." />
  }

  return (
    <div className="tf-fade flex flex-col gap-3">
      {groups.map((group) => (
        <section
          key={group.key}
          aria-label={group.triage ? 'Por triar' : PRIORITY_LABELS[group.priority]}
          className={cn('overflow-hidden rounded-2xl border bg-card', group.triage && 'border-dashed border-dash bg-transparent')}
        >
          <header className={cn('flex items-center gap-2 px-4 py-2.5 font-mono text-[11px]', group.triage ? 'border-b border-dashed' : 'bg-column')}>
            {group.triage ? (
              <>
                <PriorityIcon priority="NONE" />
                <h2 className="font-semibold tracking-[0.08em] uppercase">Por triar</h2>
                <span className="text-muted-foreground">{String(group.issues.length).padStart(2, '0')}</span>
                <span className="font-sans text-xs text-muted-foreground">sin prioridad o sin asignar: decide qué pasa con ellos</span>
              </>
            ) : (
              <>
                <PriorityIcon priority={group.priority} />
                <h2 className="font-semibold tracking-[0.08em] uppercase">{PRIORITY_LABELS[group.priority]}</h2>
                <span className="text-muted-foreground">{String(group.issues.length).padStart(2, '0')}</span>
              </>
            )}
          </header>
          <ul>
            {group.issues.map((bug, index) => (
              <BugRow
                key={bug.id}
                bug={bug}
                slug={slug}
                project={project}
                meta={meta}
                triage={group.triage}
                first={index === 0}
                active={bug.id === openIssueId}
                openIssue={openIssue}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function BugRow({ bug, slug, project, meta, triage, first, active, openIssue }) {
  const { update } = useIssueUpdater(slug, project.id, bug.id)
  const stop = (event) => event.stopPropagation()
  const unassigned = !bug.assignees?.length
  const noPriority = !bug.priority || bug.priority === 'NONE'
  return (
    <li className={cn(!first && 'border-t', triage && 'border-dashed')}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => openIssue(bug.id)}
        onKeyDown={(event) => event.key === 'Enter' && openIssue(bug.id)}
        className={cn(
          'group flex cursor-pointer items-center gap-2.5 px-4 py-2.5 outline-none hover:bg-subtle focus-visible:bg-accent',
          active && 'bg-accent-soft hover:bg-accent-soft',
        )}
      >
        <TypeIcon type="BUG" size={14} />
        <span onClick={stop} onKeyDown={stop}>
          <StatePicker
            states={meta.states}
            value={bug.state?.id}
            onChange={(stateId) => update({ stateId })}
            showLabel={false}
            className="px-1"
          />
        </span>
        <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">{bug.code}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{bug.title}</span>
        <BlockedChip issue={bug} codes="inline" />
        {bug.parent?.type === 'STORY' && <ParentStoryChip parent={bug.parent} label="apareció en" onOpen={openIssue} />}
        <span className="flex items-center gap-1.5" onClick={stop} onKeyDown={stop}>
          {triage && (
            <PriorityPicker
              chip={!noPriority}
              value={bug.priority ?? 'NONE'}
              onChange={(priority) => update({ priority })}
              className={noPriority ? 'h-7 rounded-full border border-dashed border-dash px-2.5' : undefined}
            />
          )}
          {unassigned && !triage && <span className="text-xs text-muted-foreground">sin asignar</span>}
          <AssigneesPicker
            members={meta.users}
            value={bug.assignees?.map((user) => user.id) ?? []}
            onChange={(assigneeIds) => update({ assigneeIds })}
            showLabel={triage && unassigned}
            avatarSize="sm"
            className={cn(triage && unassigned ? 'h-7 rounded-full border border-dashed border-dash px-2.5' : 'w-14 justify-end px-1')}
          />
        </span>
      </div>
    </li>
  )
}
