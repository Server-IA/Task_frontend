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
  // Una historia no está en la lista de Tareas (sale en Historias): la ruta lleva ahí
  const story = issue?.type === 'STORY'
  const listCrumb = story ? { label: 'historias', to: `/${workspace.slug}/projects/${project.id}/stories` } : { label: 'tareas', to: issuesUrl }

  return (
    <>
      <PageHeader
        path={[...projectPath(workspace, project), listCrumb]}
        title={issue?.code ?? '…'}
        documentTitle={[issue?.code ?? 'Tarea', project.name]}
      />
      <div className="tf-panel min-h-0 flex-1 overflow-hidden">
        {/* Con key: al pasar a otra tarea (subtarea, relación) no se arrastran borradores de la anterior */}
        <IssueDetailWithExtras
          key={issueId}
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
