import { useNavigate, useParams } from 'react-router'
import { useCurrentProject } from '@/features/projects/hooks'
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { projectPath } from '@/lib/paths'
import { PageHeader } from '@/layouts/PageHeader'
import { useIssue } from '../hooks'
import { IssueDetailWithExtras } from '../components/IssueDetailWithExtras'

/** Tarea en página completa (/:slug/projects/:projectId/issues/:issueId). */
export function IssuePage() {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  const { issueId } = useParams()
  const navigate = useNavigate()
  const { data: issue } = useIssue(workspace.slug, project.id, issueId)
  const issuesUrl = `/${workspace.slug}/projects/${project.id}/issues`

  return (
    <>
      <PageHeader
        path={[...projectPath(workspace, project), { label: 'tareas', to: issuesUrl }]}
        title={issue?.code ?? '…'}
        documentTitle={[issue?.code ?? 'Tarea', project.name]}
      />
      <div className="tf-panel min-h-0 flex-1 overflow-hidden">
        <IssueDetailWithExtras
          slug={workspace.slug}
          project={project}
          issueId={issueId}
          variant="page"
          onOpenIssue={(id) => navigate(`${issuesUrl}/${id}`)}
        />
      </div>
    </>
  )
}
