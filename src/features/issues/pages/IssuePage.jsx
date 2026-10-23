import { useNavigate, useParams } from 'react-router'
import { useCurrentProject } from '@/features/projects/hooks'
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { PageHeader } from '@/layouts/PageHeader'
import { useIssue } from '../hooks'
import { IssueDetailWithExtras } from '../components/IssueDetailWithExtras'

/** Issue en página completa (/:slug/projects/:projectId/issues/:issueId). */
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
        breadcrumbs={[
          { label: workspace.name, to: `/${workspace.slug}` },
          { label: project.name, to: issuesUrl },
          { label: 'Issues', to: issuesUrl },
          { label: issue?.code ?? '…' },
        ]}
      />
      <div className="min-h-0 flex-1">
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
