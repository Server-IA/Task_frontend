import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useIsFetching } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/common/Segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePlanningList } from '@/features/planning/hooks'
import { useCurrentProject } from '@/features/projects/hooks'
import { SavedViewsBar } from '@/features/saved-views/components/SavedViewsBar'
import { useActiveSavedView } from '@/features/saved-views/hooks'
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { useHotkey } from '@/hooks/useHotkey'
import { projectPath } from '@/lib/paths'
import { slugify } from '@/lib/slug'
import { cn } from '@/lib/utils'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { GROUP_BY_OPTIONS, SORT_OPTIONS } from '../constants'
import { CreateIssueDialog } from '../components/CreateIssueDialog'
import { IssueBoardView } from '../components/IssueBoardView'
import { IssueFiltersBar } from '../components/IssueFiltersBar'
import { IssueListView } from '../components/IssueListView'
import { IssuePeekSheet } from '../components/IssuePeekSheet'
import { useIssues } from '../hooks'
import { useIssueFilters } from '../useIssueFilters'
import { useProjectMeta } from '../useIssueHelpers'

/** Tareas del proyecto en lista o tablero, con filtros en la URL y panel de detalle. */
export function IssuesPage() {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  const projectMeta = useProjectMeta(workspace.slug, project.id)
  const { data: cycles } = usePlanningList('cycles', workspace.slug, project.id)
  const { data: modules } = usePlanningList('modules', workspace.slug, project.id)
  // Ciclos y módulos para sus filtros y para el resumen de las vistas guardadas
  const meta = useMemo(() => ({ ...projectMeta, cycles: cycles ?? [], modules: modules ?? [] }), [projectMeta, cycles, modules])
  const issueFilters = useIssueFilters()
  const { filters, activeCount, view, sort, groupBy, page, openIssueId } = issueFilters
  const { active: activeView, changed: changedFromView } = useActiveSavedView(workspace.slug, project.id, issueFilters)
  const [createState, setCreateState] = useState({ open: false, stateId: undefined })
  // La paleta de comandos (Ctrl/⌘ K) pide crear una tarea con ?create=1 (y lo que se escribió en ?title=)
  const [searchParams, setSearchParams] = useSearchParams()
  const createFromUrl = searchParams.get('create') === '1'

  const openCreate = useCallback((stateId) => setCreateState({ open: true, stateId }), [])
  useHotkey('c', openCreate)

  const onCreateOpenChange = (open) => {
    setCreateState((current) => ({ ...current, open }))
    if (!open && createFromUrl) {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          next.delete('create')
          next.delete('title')
          return next
        },
        { replace: true },
      )
    }
  }

  return (
    <>
      <PageHeader
        path={[
          ...projectPath(workspace, project),
          { label: 'tareas' },
          ...(activeView ? [{ label: 'vistas' }, { label: slugify(activeView.name) || 'vista' }] : []),
        ]}
        title="Tareas"
        documentTitle={['Tareas', project.name]}
        description={
          <IssueCounts
            slug={workspace.slug}
            project={project}
            filters={filters}
            activeView={activeView}
            onShowBlocked={() => issueFilters.setFilter('blocked', true)}
          />
        }
        actions={
          <>
            <ViewSwitch value={view} onChange={issueFilters.setView} />
            <Button className="h-10 rounded-xl px-3.5" onClick={() => openCreate()}>
              <Plus strokeWidth={3} />
              Nueva tarea
              <kbd className="rounded-[5px] bg-foreground/10 px-1.5 text-[11px] font-normal">C</kbd>
            </Button>
          </>
        }
      />
      <SavedViewsBar slug={workspace.slug} project={project} meta={meta} issueFilters={issueFilters} />
      <IssueFiltersBar
        filters={filters}
        activeCount={activeCount}
        setFilter={issueFilters.setFilter}
        clearFilters={issueFilters.clearFilters}
        meta={meta}
        compact={Boolean(activeView)}
        changed={changedFromView}
      >
        {view === 'list' && (
          <Select value={groupBy} onValueChange={issueFilters.setGroupBy}>
            <SelectTrigger
              size="sm"
              className={cn('h-8 rounded-full bg-card font-mono text-xs', changedFromView.includes('groupBy') && 'border-accent-text')}
              aria-label="Agrupar"
            >
              <span className="text-muted-foreground">agrupar:</span>
              <SelectValue />
              {changedFromView.includes('groupBy') && (
                <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">cambiado</span>
              )}
            </SelectTrigger>
            <SelectContent align="end">
              {GROUP_BY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {view === 'list' ? (
          <Select value={sort} onValueChange={issueFilters.setSort}>
            <SelectTrigger size="sm" className="h-8 rounded-full bg-card font-mono text-xs" aria-label="Ordenar">
              <span className="text-muted-foreground">orden:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="font-mono text-xs text-muted-foreground">orden: manual</span>
        )}
      </IssueFiltersBar>

      <PageBody key={view} className={cn('tf-fade', view === 'board' && 'flex flex-col overflow-hidden')}>
        {view === 'board' ? (
          <IssueBoardView
            slug={workspace.slug}
            project={project}
            meta={meta}
            filters={filters}
            openIssue={issueFilters.openIssue}
            onCreateInState={openCreate}
          />
        ) : (
          <IssueListView
            slug={workspace.slug}
            project={project}
            meta={meta}
            filters={filters}
            sort={sort}
            page={page}
            setPage={issueFilters.setPage}
            openIssue={issueFilters.openIssue}
            onCreate={() => openCreate()}
            onCreateInState={openCreate}
            hasFilters={activeCount > 0}
            groupBy={groupBy}
          />
        )}
      </PageBody>
      {view === 'board' && <ShortcutsBar />}

      <IssuePeekSheet
        slug={workspace.slug}
        project={project}
        issueId={openIssueId}
        onClose={issueFilters.closeIssue}
        onOpenIssue={issueFilters.openIssue}
      />
      <CreateIssueDialog
        slug={workspace.slug}
        project={project}
        open={createState.open || createFromUrl}
        onOpenChange={onCreateOpenChange}
        defaults={{ stateId: createState.stateId, title: createFromUrl ? (searchParams.get('title') ?? '') : undefined }}
      />
    </>
  )
}

/**
 * «10 tareas abiertas · 1 vencida · 2 bloqueadas», o con una vista guardada aplicada «Vista «Para la daily» ·
 * 4 tareas · 1 bloqueada». Abiertas y vencidas vienen en el proyecto; las bloqueadas (y las tareas de la vista)
 * se cuentan con los filtros que hay en pantalla. «N bloqueadas» aplica el filtro.
 */
function IssueCounts({ slug, project, filters, activeView, onShowBlocked }) {
  const countParams = { ...filters, page: 0, size: 1 }
  const { data: blockedPage } = useIssues(slug, project.id, { ...countParams, blocked: true })
  const { data: viewPage } = useIssues(slug, project.id, countParams, { enabled: Boolean(activeView) })
  const blocked = blockedPage?.totalElements ?? 0
  const open = project.openIssueCount ?? 0
  const overdue = project.overdueIssueCount ?? 0
  const shown = viewPage?.totalElements

  return (
    <>
      {activeView ? (
        <>
          Vista «{activeView.name}»
          {shown != null && ` · ${shown} ${shown === 1 ? 'tarea' : 'tareas'}`}
        </>
      ) : (
        <>
          {open} {open === 1 ? 'tarea abierta' : 'tareas abiertas'}
          {overdue > 0 && (
            <>
              {' · '}
              <span className="font-semibold text-late">
                {overdue} {overdue === 1 ? 'vencida' : 'vencidas'}
              </span>
            </>
          )}
        </>
      )}
      {blocked > 0 && (
        <>
          {' · '}
          {filters.blocked ? (
            <span className="font-semibold text-late">
              {blocked} {blocked === 1 ? 'bloqueada' : 'bloqueadas'}
            </span>
          ) : (
            <button
              type="button"
              onClick={onShowBlocked}
              title="Ver solo las bloqueadas"
              className="tf-fade rounded-sm font-semibold text-late underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {blocked} {blocked === 1 ? 'bloqueada' : 'bloqueadas'}
            </button>
          )}
        </>
      )}
    </>
  )
}

/** Selector Lista / Tablero: el fondo de la opción activa se desliza. */
function ViewSwitch({ value, onChange }) {
  return (
    <Segmented
      label="Vista"
      value={value}
      onChange={onChange}
      options={[
        { value: 'list', label: 'Lista' },
        { value: 'board', label: 'Tablero' },
      ]}
    />
  )
}

/** Barra inferior con los atajos y el estado de sincronización. */
function ShortcutsBar() {
  const fetching = useIsFetching() > 0
  return (
    <footer className="hidden shrink-0 flex-wrap items-center gap-4 rounded-xl border bg-card px-3.5 py-2 font-mono text-[11px] text-muted-foreground md:flex">
      <span>
        <kbd className="text-foreground">C</kbd> crear
      </span>
      <span>
        <kbd className="text-foreground">/</kbd> buscar
      </span>
      <span>
        <kbd className="text-foreground">Enter</kbd> abrir
      </span>
      <span>
        <kbd className="text-foreground">I Y M R S</kbd> secciones
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        <span aria-hidden="true" className={cn('size-1.5 rounded-full bg-ok-dot', fetching && 'animate-pulse bg-soon')} />
        {fetching ? 'sincronizando…' : 'sincronizado'}
      </span>
    </footer>
  )
}
