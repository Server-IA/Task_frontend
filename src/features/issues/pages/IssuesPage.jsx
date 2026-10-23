import { useCallback, useState } from 'react'
import { Kanban, List, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCurrentProject } from '@/features/projects/hooks'
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { useHotkey } from '@/hooks/useHotkey'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { SORT_OPTIONS } from '../constants'
import { CreateIssueDialog } from '../components/CreateIssueDialog'
import { IssueBoardView } from '../components/IssueBoardView'
import { IssueFiltersBar } from '../components/IssueFiltersBar'
import { IssueListView } from '../components/IssueListView'
import { IssuePeekSheet } from '../components/IssuePeekSheet'
import { useIssueFilters } from '../useIssueFilters'
import { useProjectMeta } from '../useIssueHelpers'

/** Issues del proyecto en lista o Kanban, con filtros en la URL y panel de detalle. */
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
        breadcrumbs={[
          { label: workspace.name, to: `/${workspace.slug}` },
          { label: project.name, to: `/${workspace.slug}/projects/${project.id}/issues` },
          { label: 'Issues' },
        ]}
        actions={
          <>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={view}
              onValueChange={(value) => value && issueFilters.setView(value)}
              aria-label="Vista"
            >
              <ToggleGroupItem value="list" aria-label="Vista de lista" title="Lista">
                <List />
              </ToggleGroupItem>
              <ToggleGroupItem value="board" aria-label="Vista Kanban" title="Kanban">
                <Kanban />
              </ToggleGroupItem>
            </ToggleGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" onClick={() => openCreate()}>
                  <Plus />
                  <span className="hidden sm:inline">Nuevo issue</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Atajo: <kbd className="rounded border px-1 font-mono">C</kbd>
              </TooltipContent>
            </Tooltip>
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
        {view === 'list' && (
          <Select value={sort} onValueChange={issueFilters.setSort}>
            <SelectTrigger size="sm" className="h-8 w-48" aria-label="Ordenar">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </IssueFiltersBar>

      <PageBody className={view === 'board' ? 'overflow-hidden' : undefined}>
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
            hasFilters={activeCount > 0}
          />
        )}
      </PageBody>

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
