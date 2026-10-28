import { ChecklistProgressRow, IssueChecklist } from '@/features/checklist/components/IssueChecklist'
import { IssueActivity } from '@/features/comments/IssueActivity'
import { IssuePlanningProperties } from '@/features/planning/components/IssuePlanningProperties'
import { BlockedBanner, IssueRelations } from '@/features/relations/components/IssueRelations'
import { IssueDetail } from './IssueDetail'

/**
 * IssueDetail con las secciones de otras features: aviso de bloqueo, criterios y checklist, relaciones,
 * comentarios e historial; y en las propiedades, ciclo, módulos y progreso.
 * Se mantiene aparte para que IssueDetail no dependa de esas features.
 */
export function IssueDetailWithExtras(props) {
  const { slug, project, onOpenIssue } = props
  return (
    <IssueDetail
      {...props}
      renderBanner={(issue) => <BlockedBanner slug={slug} projectId={project.id} issue={issue} onOpenIssue={onOpenIssue} />}
      renderSections={(issue) => <IssueChecklist slug={slug} projectId={project.id} issue={issue} />}
      renderAfterSubIssues={(issue) => (
        <IssueRelations slug={slug} projectId={project.id} issue={issue} onOpenIssue={onOpenIssue} />
      )}
      renderActivity={(issue) => (
        <IssueActivity slug={slug} projectId={project.id} issueId={issue.id} issueCode={issue.code} />
      )}
      renderProperties={(issue) => (
        <>
          <IssuePlanningProperties slug={slug} projectId={project.id} issue={issue} />
          <ChecklistProgressRow issue={issue} />
        </>
      )}
    />
  )
}
