import { IssueActivity } from '@/features/comments/IssueActivity'
import { IssuePlanningProperties } from '@/features/planning/components/IssuePlanningProperties'
import { IssueDetail } from './IssueDetail'

/**
 * IssueDetail con las secciones de otras features (comentarios e historial; ciclo y módulos).
 * Se mantiene aparte para que IssueDetail no dependa de esas features.
 */
export function IssueDetailWithExtras(props) {
  const { slug, project } = props
  return (
    <IssueDetail
      {...props}
      renderActivity={(issue) => <IssueActivity slug={slug} projectId={project.id} issueId={issue.id} />}
      renderPlanning={(issue) => <IssuePlanningProperties slug={slug} projectId={project.id} issue={issue} />}
    />
  )
}
