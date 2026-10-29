import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useIsFetching } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/common/Segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePlanningList } from '@/features/planning/hooks'
import { useCurrentProject } from '@/features/projects/hooks'
import { SavedViewsBar } from '@/features/saved-views/components/SavedViewsBar'
import { searchApi } from '@/features/search/api'
import { useActiveSavedView } from '@/features/saved-views/hooks'
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { useHotkey } from '@/hooks/useHotkey'
import { notifyError } from '@/lib/notify'
import { projectPath } from '@/lib/paths'
import { slugify } from '@/lib/slug'
import { cn } from '@/lib/utils'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { BOARD_GROUP_OPTIONS, GROUP_BY_OPTIONS, SORT_OPTIONS } from '../constants'
import { BUGS_VIEW_ID, BugsView, openStateIds } from '../components/BugsView'
import { CreateIssueDialog } from '../components/CreateIssueDialog'
import { TypeIcon } from '../components/IssueTypeBits'
import { IssueBoardView } from '../components/IssueBoardView'
import { IssueFiltersBar } from '../components/IssueFiltersBar'
import { IssueListView } from '../components/IssueListView'
import { IssuePeekSheet } from '../components/IssuePeekSheet'
import { useIssues } from '../hooks'
import { bugGroups } from '../issueTypes'
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
  const { filters, queryFilters, types, activeCount, view, sort, groupBy, page, openIssueId } = issueFilters
  const { active: activeView, changed: changedFromView } = useActiveSavedView(workspace.slug, project.id, issueFilters)
  // Vista «Bugs»: viene con cada proyecto (no está en la base de datos)
  const bugsView = issueFilters.activeViewId === BUGS_VIEW_ID
  const storiesUrl = `/${workspace.slug}/projects/${project.id}/stories`
  const [createState, setCreateState] = useState({ open: false, stateId: undefined })
  // La paleta de comandos (Ctrl/⌘ K) pide crear una tarea con ?create=1 (y lo que se escribió en ?title=)
  const [searchParams, setSearchParams] = useSearchParams()
  const createFromUrl = searchParams.get('create') === '1'

  const navigate = useNavigate()

  /** «WEB-12» + Enter en la búsqueda: abre esa tarea (si es de otro proyecto, va a ese proyecto con el panel abierto). */
  const jumpToCode = async (code) => {
    try {
      const results = await searchApi.issues(workspace.slug, code, 5)
      const match = results.find((issue) => issue.code.toUpperCase() === code)
      if (!match) {
        toast(`No encontramos la tarea ${code}`, { description: 'Revisa el código o busca por el título.' })
        return
      }
      const projectId = match.project?.id ?? project.id
      if (projectId !== project.id) {
        navigate(`/${workspace.slug}/projects/${projectId}/issues?issue=${match.id}`)
        return
      }
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          next.delete('search')
          next.delete('page')
          next.set('issue', match.id)
          return next
        },
        { replace: true },
      )
    } catch (error) {
      notifyError(error, 'No se pudo buscar la tarea')
    }
  }

  const openCreate = useCallback((stateId) => setCreateState({ open: true, stateId }), [])
  const reportBug = useCallback(() => setCreateState({ open: true, templateType: 'BUG' }), [])
  useHotkey('c', bugsView ? reportBug : openCreate)

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
          ...(bugsView ? [{ label: 'vistas' }, { label: 'bugs' }] : []),
        ]}
        title="Tareas"
        documentTitle={['Tareas', project.name]}
        description={
          bugsView ? (
            <BugsCounts slug={workspace.slug} project={project} states={meta.states} />
          ) : (
            <IssueCounts
              slug={workspace.slug}
              project={project}
              filters={queryFilters}
              activeView={activeView}
              filtered={activeCount > 0}
              onShowBlocked={() => issueFilters.setFilter('blocked', true)}
              storiesHidden={!types.includes('STORY')}
              storiesUrl={storiesUrl}
            />
          )
        }
        actions={
          bugsView ? (
            <Button className="h-10 rounded-xl px-3.5" onClick={reportBug}>
              <Plus strokeWidth={3} />
              Reportar bug
              <kbd className="rounded-[5px] bg-foreground/10 px-1.5 text-[11px] font-normal">C</kbd>
            </Button>
          ) : (
            <>
              <ViewSwitch value={view} onChange={issueFilters.setView} />
              <Button className="h-10 rounded-xl px-3.5" onClick={() => openCreate()}>
                <Plus strokeWidth={3} />
                Nueva tarea
                <kbd className="rounded-[5px] bg-foreground/10 px-1.5 text-[11px] font-normal">C</kbd>
              </Button>
            </>
          )
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
        onJumpToCode={jumpToCode}
        codeExample={`${project.identifier}-12`}
        storiesUrl={storiesUrl}
        hideType={bugsView}
        hideState={bugsView}
        fixedChips={
          bugsView && (
            <>
              <span className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-[13px]">
                <span className="font-mono text-xs text-muted-foreground">tipo:</span>
                <TypeIcon type="BUG" size={14} />
                Bug
              </span>
              <span className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-[13px]">
                <span className="font-mono text-xs text-muted-foreground">estado:</span>
                abiertas
              </span>
            </>
          )
        }
      >
        {bugsView && <span className="rounded-full border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground">agrupar: prioridad</span>}
        {view === 'board' && !bugsView && (
          <Select value={groupBy === 'story' ? 'story' : 'state'} onValueChange={issueFilters.setGroupBy}>
            <SelectTrigger
              size="sm"
              className={cn(
                'h-8 rounded-full bg-card font-mono text-xs',
                groupBy === 'story' && 'border-accent-text bg-accent-soft text-accent-text',
                changedFromView.includes('groupBy') && 'border-accent-text',
              )}
              aria-label="Agrupar el tablero"
            >
              <span className={groupBy === 'story' ? '' : 'text-muted-foreground'}>agrupar:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {BOARD_GROUP_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {view === 'list' && !bugsView && (
          <Select value={groupBy === 'story' ? 'state' : groupBy} onValueChange={issueFilters.setGroupBy}>
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
        {bugsView ? null : view === 'list' ? (
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

      <PageBody key={bugsView ? 'bugs' : view} className={cn('tf-fade', view === 'board' && !bugsView && 'flex flex-col overflow-hidden')}>
        {bugsView ? (
          <BugsView
            slug={workspace.slug}
            project={project}
            meta={meta}
            filters={queryFilters}
            openIssue={issueFilters.openIssue}
            openIssueId={openIssueId}
          />
        ) : view === 'board' ? (
          <IssueBoardView
            slug={workspace.slug}
            project={project}
            meta={meta}
            filters={queryFilters}
            openIssue={issueFilters.openIssue}
            onCreateInState={openCreate}
            groupBy={groupBy}
          />
        ) : (
          <IssueListView
            slug={workspace.slug}
            project={project}
            meta={meta}
            filters={queryFilters}
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
      {view === 'board' && !bugsView && <ShortcutsBar />}

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
        defaults={{
          stateId: createState.stateId,
          templateType: createState.templateType,
          title: createFromUrl ? (searchParams.get('title') ?? '') : undefined,
        }}
      />
    </>
  )
}

/**
 * Conteos del encabezado. Los dos números van siempre sobre lo mismo:
 * - Sin filtros ni búsqueda, todo el proyecto: «10 tareas abiertas · 1 vencida · 2 bloqueadas».
 * - Con filtros o búsqueda, lo que hay en pantalla: «4 tareas con estos filtros · 1 bloqueada».
 * - Con una vista guardada aplicada: «Vista «Para la daily» · 4 tareas · 1 bloqueada».
 * Abiertas y vencidas vienen en el proyecto; las demás se cuentan con los filtros. «N bloqueadas» aplica el filtro.
 */
export function IssueCounts({ slug, project, filters, activeView, filtered = false, onShowBlocked, storiesHidden, storiesUrl }) {
  const countParams = { ...filters, page: 0, size: 1 }
  const narrowed = Boolean(activeView) || filtered
  const { data: blockedPage } = useIssues(slug, project.id, { ...countParams, blocked: true })
  const { data: shownPage } = useIssues(slug, project.id, countParams, { enabled: narrowed })
  const blocked = blockedPage?.totalElements ?? 0
  const open = project.openIssueCount ?? 0
  const overdue = project.overdueIssueCount ?? 0
  const shown = shownPage?.totalElements
  const tasks = (count) => `${count} ${count === 1 ? 'tarea' : 'tareas'}`

  return (
    <>
      {activeView ? (
        <>
          Vista «{activeView.name}»
          {shown != null && ` · ${tasks(shown)}`}
        </>
      ) : filtered ? (
        <span title="Cuentan solo las tareas que pasan los filtros y la búsqueda">
          {shown != null ? `${tasks(shown)} con estos filtros` : 'Con estos filtros'}
        </span>
      ) : (
        <>
          <span title="En todo el proyecto">
            {open} {open === 1 ? 'tarea abierta' : 'tareas abiertas'}
          </span>
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
      {storiesHidden && project.openStoryCount > 0 && (
        <>
          {' · las historias se ven en '}
          <Link to={storiesUrl} className="font-medium underline underline-offset-2 hover:text-foreground">
            Historias
          </Link>
        </>
      )}
    </>
  )
}

/** «Vista «Bugs» · 5 abiertos · 1 por triar» (los bugs abiertos del proyecto, sin los demás filtros). */
function BugsCounts({ slug, project, states }) {
  const { data } = useIssues(
    slug,
    project.id,
    { type: ['BUG'], state: openStateIds(states), page: 0, size: 200 },
    { enabled: states.length > 0 },
  )
  const bugs = data?.content ?? []
  const triage = bugGroups(bugs).find((group) => group.triage)?.issues.length ?? 0
  return (
    <>
      Vista «Bugs» · {bugs.length} {bugs.length === 1 ? 'abierto' : 'abiertos'}
      {triage > 0 && (
        <>
          {' · '}
          <span className="font-semibold text-soon">{triage} por triar</span>
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
        <kbd className="text-foreground">I H Y D M R S</kbd> secciones
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        <span aria-hidden="true" className={cn('size-1.5 rounded-full bg-ok-dot', fetching && 'animate-pulse bg-soon')} />
        {fetching ? 'sincronizando…' : 'sincronizado'}
      </span>
    </footer>
  )
}
