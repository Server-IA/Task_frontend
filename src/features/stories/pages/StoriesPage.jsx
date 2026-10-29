import { useCallback, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Check, ChevronDown, ChevronRight, Lock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { AvatarStack } from '@/components/common/AvatarStack'
import { EmptyState, ErrorState } from '@/components/common/States'
import { StateIcon } from '@/components/common/StateIcon'
import { UserAvatar } from '@/components/common/UserAvatar'
import { markdownToPlainText } from '@/features/editor/markdown/plainText'
import { CreateIssueDialog } from '@/features/issues/components/CreateIssueDialog'
import { IssuePeekSheet } from '@/features/issues/components/IssuePeekSheet'
import { BugCountBadge, ReadyBadge, StoryProgress, TypeIcon, UnsplitBadge } from '@/features/issues/components/IssueTypeBits'
import { PriorityChip, PriorityIcon } from '@/features/issues/components/PriorityIcon'
import { PRIORITIES } from '@/features/issues/constants'
import { inStoryTab, STORY_TABS, storyFlags, storyProgress, storyTabCounts, typeOf } from '@/features/issues/issueTypes'
import { useProjectMeta } from '@/features/issues/useIssueHelpers'
import { usePlanningList } from '@/features/planning/hooks'
import { useCurrentProject } from '@/features/projects/hooks'
import { useCurrentWorkspace, useIsManager } from '@/features/workspaces/hooks'
import { useHotkey } from '@/hooks/useHotkey'
import { formatShortDate } from '@/lib/dates'
import { projectPath } from '@/lib/paths'
import { cn } from '@/lib/utils'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { useStories } from '../hooks'
import { filterStories, hasStoryFilters } from '../storyFilters'

/** @typedef {import('@/api/types').StoryRow} StoryRow */

const TAB_VALUES = new Set(STORY_TABS.map((tab) => tab.value))

/**
 * «Historias» (la página del project manager; los miembros la ven sin crear ni partir): pestañas Abiertas, Sin
 * partir, Para revisar y Cerradas; cada fila con su progreso «x de y tareas», las personas de sus tareas, ciclo,
 * módulo, prioridad, el estado (automático) y sus marcas. Una fila se despliega con sus tareas y bugs. La pestaña va en
 * la URL (`?tab=`) y la historia abierta en el panel (`?issue=`).
 */
export function StoriesPage() {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  const manager = useIsManager()
  const meta = useProjectMeta(workspace.slug, project.id)
  const { data: cycles = [] } = usePlanningList('cycles', workspace.slug, project.id)
  const { data: modules = [] } = usePlanningList('modules', workspace.slug, project.id)
  const { data: rows, isLoading, error, refetch } = useStories(workspace.slug, project.id)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TAB_VALUES.has(searchParams.get('tab')) ? searchParams.get('tab') : 'open'
  const openIssueId = searchParams.get('issue')
  const [filters, setFilters] = useState({ search: '', cycle: [], module: [], priority: [], assignee: [] })
  const [expanded, setExpanded] = useState(() => new Set())
  const [creating, setCreating] = useState(false)
  const [focusIndex, setFocusIndex] = useState(0)
  const rowRefs = useRef([])

  const setParam = useCallback(
    (key, value) =>
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          if (value) next.set(key, value)
          else next.delete(key)
          return next
        },
        { replace: true },
      ),
    [setSearchParams],
  )
  const openIssue = useCallback((issueId) => setParam('issue', issueId), [setParam])

  const all = useMemo(() => rows ?? [], [rows])
  const stories = all.map((row) => row.story)
  const counts = storyTabCounts(stories)
  const filtered = filterStories(all, filters).filter((row) => inStoryTab(row.story, tab))
  const closedRows = tab === 'open' ? filterStories(all, filters).filter((row) => inStoryTab(row.story, 'closed')) : []

  const toggle = (id) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const createStory = useCallback(() => setCreating(true), [setCreating])
  useHotkey('c', createStory, { enabled: manager })
  const move = (step) => {
    const index = Math.max(0, Math.min(filtered.length - 1, focusIndex + step))
    setFocusIndex(index)
    rowRefs.current[index]?.focus()
  }
  useHotkey('j', () => move(1))
  useHotkey('k', () => move(-1))
  useHotkey('p', () => {
    const row = filtered[focusIndex]
    if (row && manager) openIssue(row.story.id)
  })

  const ready = counts.review
  const description =
    tab === 'closed' ? (
      <>
        {counts.closed} {counts.closed === 1 ? 'cerrada' : 'cerradas'}
        {(() => {
          const withBugs = stories.filter((story) => storyFlags(story).bugsAfterClose > 0).length
          return withBugs > 0 ? (
            <>
              {' · '}
              <span className="font-semibold text-late">
                {withBugs} con {withBugs === 1 ? 'un bug' : 'bugs'} después de cerrar
              </span>
            </>
          ) : null
        })()}
      </>
    ) : (
      <>
        {counts.open} {counts.open === 1 ? 'abierta' : 'abiertas'}
        {counts.unsplit > 0 && (
          <>
            {' · '}
            <span className="font-semibold text-soon">{counts.unsplit} sin partir</span>
          </>
        )}
        {ready > 0 && (
          <>
            {' · '}
            <span className="font-semibold text-ok">
              {ready} {ready === 1 ? 'lista' : 'listas'} para revisar
            </span>
          </>
        )}
      </>
    )

  return (
    <>
      <PageHeader
        path={[...projectPath(workspace, project), { label: 'historias' }]}
        title="Historias"
        documentTitle={['Historias', project.name]}
        description={rows ? description : null}
        actions={
          manager && (
            <Button className="h-10 rounded-xl px-3.5" onClick={() => setCreating(true)}>
              <Plus strokeWidth={3} />
              Nueva historia
              <kbd className="rounded-[5px] bg-foreground/10 px-1.5 text-[11px] font-normal">C</kbd>
            </Button>
          )
        }
      />
      <div className="flex flex-wrap items-center gap-2 px-1">
        <div role="tablist" aria-label="Historias" className="flex items-center gap-0.5 rounded-full border bg-card p-1">
          {STORY_TABS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={tab === option.value}
              onClick={() => setParam('tab', option.value === 'open' ? null : option.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground',
                tab === option.value && 'bg-accent-soft font-semibold text-accent-text',
              )}
            >
              {option.label}
              <span className="font-mono text-[11px]">{counts[option.value]}</span>
            </button>
          ))}
        </div>
        <label className="flex w-72 items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 font-mono text-[13px] focus-within:ring-2 focus-within:ring-ring/40">
          <span aria-hidden="true" className="font-semibold text-accent-text">
            &gt;
          </span>
          <span className="sr-only">Buscar historias</span>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="buscar historias"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </label>
        <PillFilter
          title="ciclo"
          values={filters.cycle}
          onChange={(cycle) => setFilters((current) => ({ ...current, cycle }))}
          options={[{ value: 'none', label: 'Sin ciclo' }, ...cycles.map((cycle) => ({ value: cycle.id, label: cycle.name }))]}
        />
        <PillFilter
          title="módulo"
          values={filters.module}
          onChange={(module) => setFilters((current) => ({ ...current, module }))}
          options={[{ value: 'none', label: 'Sin módulo' }, ...modules.map((module) => ({ value: module.id, label: module.name }))]}
        />
        <PillFilter
          title="prioridad"
          values={filters.priority}
          onChange={(priority) => setFilters((current) => ({ ...current, priority }))}
          options={PRIORITIES.map((priority) => ({ value: priority.value, label: priority.label, icon: <PriorityIcon priority={priority.value} /> }))}
        />
        <PillFilter
          title="asignado"
          values={filters.assignee}
          onChange={(assignee) => setFilters((current) => ({ ...current, assignee }))}
          options={meta.users.map((user) => ({ value: user.id, label: user.fullName, icon: <UserAvatar user={user} size="xs" /> }))}
        />
      </div>

      <PageBody className="tf-fade">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : all.length === 0 ? (
          <EmptyState
            icon={() => <TypeIcon type="STORY" size={28} />}
            title="Todavía no hay historias"
            description={
              manager
                ? 'Escribe la primera con «Nueva historia»: el qué y el porqué, con sus criterios. Después pártela en tareas.'
                : 'El project manager escribe las historias y las parte en tareas.'
            }
            action={manager ? <Button onClick={() => setCreating(true)}>Nueva historia</Button> : null}
          />
        ) : (
          <div className="flex min-h-full flex-col gap-3">
            <div className="overflow-hidden rounded-2xl border bg-card">
              <div className="grid grid-cols-[24px_minmax(0,1fr)_150px_88px_96px_120px_104px_132px] gap-3 border-b bg-subtle px-4 py-2.5 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                <span />
                <span>Historia</span>
                <span>Progreso</span>
                <span>Personas</span>
                <span>Ciclo</span>
                <span>Módulo</span>
                <span>Prioridad</span>
                <span>Estado</span>
              </div>
              {filtered.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {hasStoryFilters(filters) ? 'Ninguna historia en esta pestaña con esos filtros.' : 'Ninguna historia en esta pestaña.'}
                </p>
              ) : (
                <ul>
                  {filtered.map((row, index) => (
                    <StoryRowItem
                      key={row.story.id}
                      row={row}
                      manager={manager}
                      expanded={expanded.has(row.story.id)}
                      onToggle={() => toggle(row.story.id)}
                      onOpen={openIssue}
                      active={openIssueId === row.story.id}
                      buttonRef={(element) => (rowRefs.current[index] = element)}
                      onFocus={() => setFocusIndex(index)}
                    />
                  ))}
                </ul>
              )}
              {tab === 'open' && closedRows.length > 0 && (
                <button
                  type="button"
                  onClick={() => setParam('tab', 'closed')}
                  className="flex w-full items-center gap-2.5 border-t bg-subtle px-4 py-3 text-left text-[13px] text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="size-3.5" />
                  <span className="font-semibold text-foreground">
                    {closedRows.length} {closedRows.length === 1 ? 'cerrada' : 'cerradas'}
                  </span>
                  <span className="truncate">
                    <span className="font-mono text-xs">{closedRows[0].story.code}</span> {closedRows[0].story.title}
                    {closedRows.length > 1 && ` y ${closedRows.length - 1} más`}
                  </span>
                </button>
              )}
              {tab === 'closed' && (
                <p className="flex items-center gap-2 border-t bg-subtle px-4 py-3 text-[13px] text-muted-foreground">
                  <Lock className="size-3.5" aria-hidden="true" />
                  Las tareas y los criterios de una historia cerrada quedan como documentación. Solo el project manager la reabre.
                </p>
              )}
            </div>
            <footer className="mt-auto flex flex-wrap items-center gap-4 rounded-xl border bg-card px-3.5 py-2 font-mono text-[11px] text-muted-foreground">
              <span>
                <kbd className="text-foreground">J K</kbd> moverse
              </span>
              <span>
                <kbd className="text-foreground">→</kbd> expandir
              </span>
              {manager && (
                <span>
                  <kbd className="text-foreground">P</kbd> partir en tareas
                </span>
              )}
              <span>
                <kbd className="text-foreground">Enter</kbd> abrir
              </span>
              <span className="ml-auto font-sans text-xs">
                Solo el project manager crea historias y las parte en tareas. Los miembros las ven aquí y en el tablero.
              </span>
            </footer>
          </div>
        )}
      </PageBody>

      <IssuePeekSheet
        slug={workspace.slug}
        project={project}
        issueId={openIssueId}
        onClose={() => setParam('issue', null)}
        onOpenIssue={openIssue}
      />
      {manager && (
        <CreateIssueDialog
          slug={workspace.slug}
          project={project}
          open={creating}
          onOpenChange={setCreating}
          defaults={{ templateType: 'STORY' }}
        />
      )}
    </>
  )
}

/** Una fila de «Historias» (y, desplegada, sus tareas y bugs). */
function StoryRowItem({ row, manager, expanded, onToggle, onOpen, active, buttonRef, onFocus }) {
  const { story, people, children } = row
  const flags = storyFlags(story)
  const tasks = children.filter((child) => typeOf(child) !== 'BUG')
  const bugs = children.filter((child) => typeOf(child) === 'BUG')
  const summary = markdownToPlainText(story.description ?? '', { maxLength: 140 })
  const modules = (story.modules ?? []).map((module) => module.name).join(', ')

  return (
    <li className={cn('border-t first:border-t-0', expanded && 'bg-subtle')}>
      <div
        ref={buttonRef}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onFocus={onFocus}
        onClick={() => onOpen(story.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onOpen(story.id)
          if (event.key === 'ArrowRight' && !expanded) onToggle()
          if (event.key === 'ArrowLeft' && expanded) onToggle()
        }}
        className={cn(
          'grid cursor-pointer grid-cols-[24px_minmax(0,1fr)_150px_88px_96px_120px_104px_132px] items-center gap-3 px-4 py-3 outline-none hover:bg-subtle focus-visible:bg-accent',
          active && 'bg-accent-soft hover:bg-accent-soft',
        )}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label={expanded ? 'Plegar' : 'Desplegar tareas'}
          onClick={(event) => {
            event.stopPropagation()
            onToggle()
          }}
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground"
        >
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        <div className="flex min-w-0 items-start gap-2.5">
          <TypeIcon type="STORY" className="mt-0.5" />
          <span className="mt-0.5 min-w-14 shrink-0 font-mono text-xs whitespace-nowrap text-muted-foreground">{story.code}</span>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-sm font-semibold">{story.title}</span>
            <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {flags.unsplit && (
                <>
                  <UnsplitBadge />
                  {manager && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpen(story.id)
                      }}
                      className="font-medium text-accent-text underline underline-offset-2"
                    >
                      Partir en tareas →
                    </button>
                  )}
                </>
              )}
              {flags.ready && (
                <>
                  <ReadyBadge />
                  <span>{manager ? 'revisa los criterios y ciérrala' : 'el project manager la revisa'}</span>
                </>
              )}
              <BugCountBadge count={flags.openBugs} />
              <BugCountBadge count={flags.bugsAfterClose} afterClose />
              {row.related.map((related) => (
                <span key={related.id} className="rounded-md border px-1.5 py-0.5">
                  relacionada: <span className="font-mono font-semibold text-ty-story-text">{related.code}</span>
                </span>
              ))}
              {!flags.unsplit && !flags.ready && !flags.openBugs && !flags.bugsAfterClose && row.related.length === 0 && summary && (
                <span className="truncate">{summary}</span>
              )}
            </span>
          </div>
        </div>
        <StoryProgress story={story} />
        <span>{people.length > 0 ? <AvatarStack users={people} size="xs" /> : <span className="text-muted-foreground">—</span>}</span>
        <span className={cn('truncate text-[13px]', !story.cycle && 'text-muted-foreground')}>{story.cycle?.name ?? 'Sin ciclo'}</span>
        <span className={cn('truncate text-[13px]', !modules && 'text-muted-foreground')}>{modules || '—'}</span>
        <span>
          <PriorityChip priority={story.priority} iconOnlyWhenEmpty />
        </span>
        <span className="flex min-w-0 items-start gap-1.5 text-[13px]">
          <StateIcon group={story.state?.group} color={story.state?.color} className="mt-0.5" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{story.state?.name}</span>
            <span className="font-mono text-[10.5px] leading-tight text-muted-foreground">
              {flags.closed
                ? `por ${story.closedBy?.fullName.split(' ')[0] ?? '—'}${story.closedAt ? ` · ${formatShortDate(story.closedAt)}` : ''}`
                : 'automático'}
            </span>
          </span>
        </span>
      </div>
      {expanded && (
        <div className="px-4 pb-3 pl-12">
          <div className="overflow-hidden rounded-xl border bg-card">
            <p className="border-b bg-subtle px-3 py-2 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
              Tareas de la historia · {storyProgress(story).label}
            </p>
            {tasks.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">Sin tareas todavía.</p>}
            {tasks.map((child) => (
              <ChildRow key={child.id} child={child} onOpen={onOpen} />
            ))}
            {bugs.length > 0 && (
              <>
                <p className="border-y bg-subtle px-3 py-2 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                  Bugs · {flags.closed ? 'no cuentan en el progreso' : 'aparecieron en esta historia'}
                </p>
                {bugs.map((child) => (
                  <ChildRow key={child.id} child={child} onOpen={onOpen} />
                ))}
              </>
            )}
            <button
              type="button"
              onClick={() => onOpen(story.id)}
              className="flex w-full items-center gap-2 border-t border-dashed px-3 py-2 text-left text-[13px] font-medium text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-3.5" strokeWidth={2.5} />
              {flags.closed ? 'agregar tarea · pregunta si reabrir' : 'agregar tareas'}
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

function ChildRow({ child, onOpen }) {
  const done = child.state?.group === 'COMPLETED' || child.state?.group === 'CANCELLED'
  return (
    <button
      type="button"
      onClick={() => onOpen(child.id)}
      className={cn('flex w-full items-center gap-3 border-t px-3 py-2 text-left text-sm first:border-t-0 hover:bg-subtle', child.afterClose && 'bg-late-soft/60')}
    >
      <TypeIcon type={typeOf(child)} size={14} />
      <StateIcon group={child.state?.group} color={child.state?.color} />
      <span className="min-w-14 shrink-0 font-mono text-xs whitespace-nowrap text-muted-foreground">{child.code}</span>
      <span className={cn('min-w-0 flex-1 truncate', done && 'text-muted-foreground line-through')}>{child.title}</span>
      {child.afterClose && <span className="shrink-0 font-mono text-[11px] font-semibold text-late">después de cerrar</span>}
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{child.state?.name}</span>
      <span className="w-6">{child.assignees?.[0] && <UserAvatar user={child.assignees[0]} size="xs" />}</span>
    </button>
  )
}

/** Filtro de la barra como pastilla con varios valores (punteada mientras está vacía). */
function PillFilter({ title, values, onChange, options }) {
  const selected = new Set(values)
  const chosen = options.filter((option) => selected.has(option.value))
  const toggle = (value) => {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange([...next])
  }
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring',
          chosen.length
            ? 'bg-foreground font-semibold text-background'
            : 'border border-dashed border-dash text-muted-foreground hover:border-foreground/40 hover:text-foreground',
        )}
      >
        {chosen.length ? `${title}: ${chosen.length === 1 ? chosen[0].label : chosen.length}` : title}
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Filtrar por ${title}…`} />
          <CommandList>
            <CommandEmpty>Sin resultados</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option.value} value={`${option.label} ${option.value}`} onSelect={() => toggle(option.value)}>
                  <span
                    className={cn(
                      'flex size-4 items-center justify-center rounded-sm border',
                      selected.has(option.value) && 'border-foreground bg-foreground text-background',
                    )}
                  >
                    {selected.has(option.value) && <Check className="size-3" />}
                  </span>
                  {option.icon}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
