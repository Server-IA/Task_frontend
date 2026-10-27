import { useCallback, useState } from 'react'
import { useIsFetching } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/common/Segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCurrentProject } from '@/features/projects/hooks'
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { useHotkey } from '@/hooks/useHotkey'
import { projectPath } from '@/lib/paths'
import { cn } from '@/lib/utils'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { SORT_OPTIONS } from '../constants'
import { CreateIssueDialog } from '../components/CreateIssueDialog'
import { IssueBoardView } from '../components/IssueBoardView'
import { IssueFiltersBar } from '../components/IssueFiltersBar'
import { IssueListView } from '../components/IssueListView'
import { IssuePeekSheet } from '../components/IssuePeekSheet'
import { useIssueFilters } from '../useIssueFilters'
import { useProjectMeta } from '../useIssueHelpers'

/** Tareas del proyecto en lista o tablero, con filtros en la URL y panel de detalle. */
export function IssuesPage() {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  const meta = useProjectMeta(workspace.slug, project.id)
  const issueFilters = useIssueFilters()
  const { filters, activeCount, view, sort, page, openIssueId } = issueFilters
  const [createState, setCreateState] = useState({ open: false, stateId: undefined })

  const openCreate = useCallback((stateId) => setCreateState({ open: true, stateId }), [])
  useHotkey('c', openCreate)

  return (
    <>
      <PageHeader
        path={[...projectPath(workspace, project), { label: 'tareas' }]}
        title="Tareas"
        documentTitle={['Tareas', project.name]}
        description={<IssueCounts project={project} />}
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
      <IssueFiltersBar
        filters={filters}
        activeCount={activeCount}
        setFilter={issueFilters.setFilter}
        clearFilters={issueFilters.clearFilters}
        meta={meta}
      >
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
        open={createState.open}
        onOpenChange={(open) => setCreateState((current) => ({ ...current, open }))}
        defaults={{ stateId: createState.stateId }}
      />
    </>
  )
}

/** «10 tareas abiertas · 1 vencida» con los conteos que manda el backend en el proyecto. */
function IssueCounts({ project }) {
  const open = project.openIssueCount ?? 0
  const overdue = project.overdueIssueCount ?? 0
  return (
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
        <kbd className="text-foreground">I Y M</kbd> secciones
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        <span aria-hidden="true" className={cn('size-1.5 rounded-full bg-ok-dot', fetching && 'animate-pulse bg-soon')} />
        {fetching ? 'sincronizando…' : 'sincronizado'}
      </span>
    </footer>
  )
}
