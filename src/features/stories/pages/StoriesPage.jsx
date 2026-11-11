import { useCallback, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ChevronDown, ChevronRight, Lock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckMark } from '@/components/common/CheckMark'
import { AvatarStack } from '@/components/common/AvatarStack'
import { EmptyState, ErrorState } from '@/components/common/States'
import { StateIcon } from '@/components/common/StateIcon'
import { UserAvatar } from '@/components/common/UserAvatar'
import { CreateIssueDialog } from '@/features/issues/components/CreateIssueDialog'
import { IssuePeekSheet } from '@/features/issues/components/IssuePeekSheet'
import { BugCountBadge, ReadyBadge, StoryProgress, TypeIcon, UnsplitBadge } from '@/features/issues/components/IssueTypeBits'
import { PriorityChip, PriorityIcon } from '@/features/issues/components/PriorityIcon'
import { PRIORITIES, ROW_FOCUS } from '@/features/issues/constants'
import { inStoryTab, STORY_TABS, storyFlags, storyProgress, storyTabCounts, typeOf } from '@/features/issues/issueTypes'
import { useProjectMeta } from '@/features/issues/useIssueHelpers'
import { usePlanningList } from '@/features/planning/hooks'
import { useCurrentProject } from '@/features/projects/hooks'
import { useCan, useCurrentWorkspace } from '@/features/workspaces/hooks'
import { useHotkey } from '@/hooks/useHotkey'
import { stateName, t, tn, tx } from '@/i18n'
import { formatShortDate } from '@/lib/dates'
import { projectPath } from '@/lib/paths'
import { cn } from '@/lib/utils'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { focusRowMain } from '@/lib/focusReturn'
import { useStories } from '../hooks'
import { filterStories, hasStoryFilters } from '../storyFilters'
import { storySummary } from '../storySummary'
import { nextRowIndex } from '../rowNavigation'
import { SPLIT_PARAM } from '../splitLines'

/** @typedef {import('@/api/types').StoryRow} StoryRow */

const TAB_VALUES = new Set(STORY_TABS.map((tab) => tab.value))

/**
 * Columnas de la tabla. Por debajo de 1360 px «Personas» y «Módulo» se ocultan: con todas, en 1024 px la columna
 * «Historia» quedaba en 0 (el título desaparecía, los encabezados se montaban y «Estado» se cortaba a la derecha).
 */
const TABLE_COLUMNS =
  'grid-cols-[24px_minmax(0,1fr)_120px_96px_104px_132px] min-[1360px]:grid-cols-[24px_minmax(0,1fr)_150px_88px_96px_120px_104px_132px]'
const WIDE_ONLY = 'hidden min-[1360px]:block'

/**
 * «Historias» (la página del project manager; los miembros la ven sin crear ni partir): pestañas Abiertas, Sin
 * partir, Para revisar y Cerradas; cada fila con su progreso «x de y tareas», las personas de sus tareas, ciclo,
 * módulo, prioridad, el estado (automático) y sus marcas. Una fila se despliega con sus tareas y bugs. La pestaña va en
 * la URL (`?tab=`) y la historia abierta en el panel (`?issue=`).
 */
export function StoriesPage() {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  // «manager»: quien gestiona historias (las crea y las parte en tareas)
  const manager = useCan('STORY_MANAGE')
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
  // «P»: la historia con «Partir en tareas» abierto (aunque ya tenga tareas; sin tareas se abre solo)
  const openSplit = useCallback(
    (issueId) =>
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          next.set('issue', issueId)
          next.set(SPLIT_PARAM, '1')
          return next
        },
        { replace: true },
      ),
    [setSearchParams],
  )

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
    const onRow = rowRefs.current.includes(document.activeElement)
    const index = nextRowIndex({ current: focusIndex, step, count: filtered.length, onRow })
    setFocusIndex(index)
    rowRefs.current[index]?.focus()
  }
  useHotkey('j', () => move(1))
  useHotkey('k', () => move(-1))
  useHotkey('p', () => {
    const row = filtered[focusIndex]
    if (row && manager) openSplit(row.story.id)
  })

  const ready = counts.review
  const description =
    tab === 'closed' ? (
      <>
        {tn(counts.closed, '{count} cerrada', '{count} cerradas')}
        {(() => {
          const withBugs = stories.filter((story) => storyFlags(story).bugsAfterClose > 0).length
          return withBugs > 0 ? (
            <>
              {' · '}
              <span className="font-semibold text-late">
                {tn(withBugs, '{count} con un bug después de cerrar', '{count} con bugs después de cerrar')}
              </span>
            </>
          ) : null
        })()}
      </>
    ) : (
      <>
        {tn(counts.open, '{count} abierta', '{count} abiertas')}
        {counts.unsplit > 0 && (
          <>
            {' · '}
            <span className="font-semibold text-soon">{t('{count} sin partir', { count: counts.unsplit })}</span>
          </>
        )}
        {ready > 0 && (
          <>
            {' · '}
            <span className="font-semibold text-ok">
              {tn(ready, '{count} lista para revisar', '{count} listas para revisar')}
            </span>
          </>
        )}
      </>
    )

  return (
    <>
      <PageHeader
        path={[...projectPath(workspace, project), { label: t('historias') }]}
        title={t('Historias')}
        documentTitle={[t('Historias'), project.name]}
        description={rows ? description : null}
        actions={
          manager && (
            <Button className="h-10 rounded-xl px-3.5" onClick={() => setCreating(true)}>
              <Plus strokeWidth={3} />
              {t('Nueva historia')}
              <kbd className="rounded-[5px] bg-foreground/10 px-1.5 text-[11px] font-normal">C</kbd>
            </Button>
          )
        }
      />
      <div className="flex flex-wrap items-center gap-2 px-1">
        <div role="tablist" aria-label={t('Historias')} className="flex items-center gap-0.5 rounded-full border bg-card p-1">
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
              {/* Sin datos (cargando o con error) no hay cuenta: un «0» junto al error diría que no hay ninguna */}
              {rows && <span className="font-mono text-[11px]">{counts[option.value]}</span>}
            </button>
          ))}
        </div>
        <label className="flex w-72 items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 font-mono text-[13px] focus-within:ring-2 focus-within:ring-ring/40">
          <span aria-hidden="true" className="font-semibold text-accent-text">
            &gt;
          </span>
          <span className="sr-only">{t('Buscar historias')}</span>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder={t('buscar historias')}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </label>
        <PillFilter
          title={t('ciclo')}
          placeholder={t('Filtrar por ciclo…')}
          values={filters.cycle}
          onChange={(cycle) => setFilters((current) => ({ ...current, cycle }))}
          options={[{ value: 'none', label: t('Sin ciclo') }, ...cycles.map((cycle) => ({ value: cycle.id, label: cycle.name }))]}
        />
        <PillFilter
          title={t('módulo')}
          placeholder={t('Filtrar por módulo…')}
          values={filters.module}
          onChange={(module) => setFilters((current) => ({ ...current, module }))}
          options={[{ value: 'none', label: t('Sin módulo') }, ...modules.map((module) => ({ value: module.id, label: module.name }))]}
        />
        <PillFilter
          title={t('prioridad')}
          placeholder={t('Filtrar por prioridad…')}
          values={filters.priority}
          onChange={(priority) => setFilters((current) => ({ ...current, priority }))}
          options={PRIORITIES.map((priority) => ({ value: priority.value, label: priority.label, icon: <PriorityIcon priority={priority.value} /> }))}
        />
        <PillFilter
          title={t('asignado')}
          placeholder={t('Filtrar por asignado…')}
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
            title={t('Todavía no hay historias')}
            description={
              manager
                ? t('Escribe la primera con «Nueva historia»: el qué y el porqué, con sus criterios. Después pártela en tareas.')
                : t('Las escribe y las parte en tareas quien gestiona historias.')
            }
            action={manager ? <Button onClick={() => setCreating(true)}>{t('Nueva historia')}</Button> : null}
          />
        ) : (
          <div className="flex min-h-full flex-col gap-3">
            <div className="overflow-hidden rounded-2xl border bg-card">
              <div
                className={cn(
                  'grid gap-3 border-b bg-subtle px-4 py-2.5 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase',
                  TABLE_COLUMNS,
                )}
              >
                <span />
                <span>{t('Historia')}</span>
                <span>{t('Progreso')}</span>
                <span className={WIDE_ONLY}>{t('Personas')}</span>
                <span>{t('Ciclo')}</span>
                <span className={WIDE_ONLY}>{t('Módulo')}</span>
                <span>{t('Prioridad')}</span>
                <span>{t('Estado')}</span>
              </div>
              {filtered.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {hasStoryFilters(filters) ? t('Ninguna historia en esta pestaña con esos filtros.') : t('Ninguna historia en esta pestaña.')}
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
                    {tn(closedRows.length, '{count} cerrada', '{count} cerradas')}
                  </span>
                  <span className="truncate">
                    <span className="font-mono text-xs">{closedRows[0].story.code}</span> {closedRows[0].story.title}
                    {closedRows.length > 1 && ` ${t('y {count} más', { count: closedRows.length - 1 })}`}
                  </span>
                </button>
              )}
              {tab === 'closed' && (
                <p className="flex items-center gap-2 border-t bg-subtle px-4 py-3 text-[13px] text-muted-foreground">
                  <Lock className="size-3.5" aria-hidden="true" />
                  {t('Las tareas y los criterios de una historia cerrada quedan como documentación. La reabre quien puede cerrar historias.')}
                </p>
              )}
            </div>
            <footer className="mt-auto flex flex-wrap items-center gap-4 rounded-xl border bg-card px-3.5 py-2 font-mono text-[11px] text-muted-foreground">
              <span>{tx('{keys} moverse', { keys: <kbd className="text-foreground">J K</kbd> })}</span>
              <span>{tx('{key} expandir', { key: <kbd className="text-foreground">→</kbd> })}</span>
              {manager && <span>{tx('{key} partir en tareas', { key: <kbd className="text-foreground">P</kbd> })}</span>}
              <span>{tx('{key} abrir', { key: <kbd className="text-foreground">Enter</kbd> })}</span>
              {!manager && (
                <span className="ml-auto font-sans text-xs">
                  {t('Tu rol no permite crear historias ni partirlas en tareas: las ves aquí y en el tablero.')}
                </span>
              )}
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
  const summary = storySummary(story.description)
  const modules = (story.modules ?? []).map((module) => module.name).join(', ')

  return (
    <li className={cn('border-t first:border-t-0', expanded && 'bg-subtle')}>
      {/* Un clic en la fila la abre; con el teclado, el título es el botón (nombre corto: código y título; Enter abre,
          → y ← despliegan) y los demás botones van aparte */}
      <div
        onClick={(event) => {
          focusRowMain(event.currentTarget)
          onOpen(story.id)
        }}
        className={cn(
          'grid cursor-pointer items-center gap-3 px-4 py-3 hover:bg-subtle',
          ROW_FOCUS,
          TABLE_COLUMNS,
          active && 'bg-accent-soft hover:bg-accent-soft',
        )}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label={expanded ? t('Plegar') : t('Desplegar tareas')}
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
            <button
              ref={buttonRef}
              type="button"
              data-row-main=""
              aria-label={`${story.code} ${story.title}`}
              aria-expanded={expanded}
              title={story.title}
              onFocus={onFocus}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' && !expanded) onToggle()
                if (event.key === 'ArrowLeft' && expanded) onToggle()
              }}
              className="min-w-0 cursor-pointer truncate text-left text-sm font-semibold outline-none"
            >
              {story.title}
            </button>
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
                      {t('Partir en tareas →')}
                    </button>
                  )}
                </>
              )}
              {flags.ready && (
                <>
                  <ReadyBadge />
                  <span>{manager ? t('revisa los criterios y ciérrala') : t('falta revisarla y cerrarla')}</span>
                </>
              )}
              <BugCountBadge count={flags.openBugs} />
              <BugCountBadge count={flags.bugsAfterClose} afterClose />
              {row.related.map((related) => (
                <span key={related.id} className="rounded-md border px-1.5 py-0.5">
                  {tx('relacionada: {code}', { code: <span className="font-mono font-semibold text-ty-story-text">{related.code}</span> })}
                </span>
              ))}
              {!flags.unsplit && !flags.ready && !flags.openBugs && !flags.bugsAfterClose && row.related.length === 0 && summary && (
                <span className="truncate">{summary}</span>
              )}
            </span>
          </div>
        </div>
        <StoryProgress story={story} />
        <span className={WIDE_ONLY}>{people.length > 0 ? <AvatarStack users={people} size="xs" /> : <span className="text-muted-foreground">—</span>}</span>
        <span className={cn('truncate text-[13px]', !story.cycle && 'text-muted-foreground')}>{story.cycle?.name ?? t('Sin ciclo')}</span>
        <span className={cn('truncate text-[13px]', WIDE_ONLY, !modules && 'text-muted-foreground')}>{modules || '—'}</span>
        <span>
          <PriorityChip priority={story.priority} iconOnlyWhenEmpty />
        </span>
        <span className="flex min-w-0 items-start gap-1.5 text-[13px]">
          <StateIcon group={story.state?.group} color={story.state?.color} className="mt-0.5" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{stateName(story.state)}</span>
            <span className="font-mono text-[10.5px] leading-tight text-muted-foreground">
              {flags.closed ? closedBy(story) : t('automático')}
            </span>
          </span>
        </span>
      </div>
      {expanded && (
        <div className="px-4 pb-3 pl-12">
          <div className="overflow-hidden rounded-xl border bg-card">
            <p className="border-b bg-subtle px-3 py-2 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
              {t('Tareas de la historia · {progress}', { progress: storyProgress(story).label })}
            </p>
            {tasks.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">{t('Sin tareas todavía.')}</p>}
            {tasks.map((child) => (
              <ChildRow key={child.id} child={child} onOpen={onOpen} />
            ))}
            {bugs.length > 0 && (
              <>
                <p className="border-y bg-subtle px-3 py-2 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                  {flags.closed ? t('Bugs · no cuentan en el progreso') : t('Bugs · aparecieron en esta historia')}
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
              {flags.closed ? t('agregar tarea · pregunta si reabrir') : t('agregar tareas')}
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

/** «por Ana · 12 nov»: quién cerró la historia y cuándo. */
function closedBy(story) {
  const name = story.closedBy?.fullName.split(' ')[0] ?? '—'
  return story.closedAt ? t('por {name} · {date}', { name, date: formatShortDate(story.closedAt) }) : t('por {name}', { name })
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
      {child.afterClose && <span className="shrink-0 font-mono text-[11px] font-semibold text-late">{t('después de cerrar')}</span>}
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{stateName(child.state)}</span>
      <span className="w-6">{child.assignees?.[0] && <UserAvatar user={child.assignees[0]} size="xs" />}</span>
    </button>
  )
}

/** Filtro de la barra como pastilla con varios valores (punteada mientras está vacía). */
function PillFilter({ title, placeholder, values, onChange, options }) {
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
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{t('Sin resultados')}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option.value} value={`${option.label} ${option.value}`} onSelect={() => toggle(option.value)}>
                  <CheckMark checked={selected.has(option.value)} />
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
