import { ChecklistProgressRow, IssueChecklist } from '@/features/checklist/components/IssueChecklist'
import { IssueActivity } from '@/features/comments/IssueActivity'
import { IssuePlanningProperties } from '@/features/planning/components/IssuePlanningProperties'
import { BlockedBanner, IssueRelations } from '@/features/relations/components/IssueRelations'
import { IssueDescription } from './IssueDescription'
import { IssueDetail } from './IssueDetail'

/**
 * IssueDetail con las secciones de otras features: la descripción con su editor (menciones, checklist), aviso de bloqueo, criterios y checklist, relaciones,
 * comentarios e historial; y en las propiedades, ciclo, módulos y progreso. `focusCommentId` lleva la vista hasta ese
 * comentario (al abrir la tarea desde un aviso de la Bandeja).
 * Se mantiene aparte para que IssueDetail no dependa de esas features.
 */
export function IssueDetailWithExtras({ focusCommentId, ...props }) {
  const { slug, project, onOpenIssue, variant } = props
  return (
    <IssueDetail
      {...props}
      renderDescription={(issue, markdownView) => (
        <IssueDescription
          key={issue.id}
          slug={slug}
          project={project}
          issue={issue}
          variant={variant}
          onOpenIssue={onOpenIssue}
          showMarkdown={markdownView.showMarkdown}
          onHideMarkdown={markdownView.onHideMarkdown}
        />
      )}
      renderBanner={(issue) => <BlockedBanner slug={slug} projectId={project.id} issue={issue} onOpenIssue={onOpenIssue} />}
      renderSections={(issue) => <IssueChecklist slug={slug} projectId={project.id} issue={issue} />}
      renderAfterSubIssues={(issue) => (
        <IssueRelations slug={slug} projectId={project.id} issue={issue} onOpenIssue={onOpenIssue} />
      )}
      renderActivity={(issue) => (
        <IssueActivity
          slug={slug}
          projectId={project.id}
          issueId={issue.id}
          issueCode={issue.code}
          projectIdentifier={project.identifier}
          focusCommentId={focusCommentId}
          onOpenIssue={onOpenIssue}
        />
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
