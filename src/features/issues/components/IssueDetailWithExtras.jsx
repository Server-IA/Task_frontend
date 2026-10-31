import { ChecklistProgressRow, IssueChecklist } from '@/features/checklist/components/IssueChecklist'
import { IssueActivity } from '@/features/comments/IssueActivity'
import { IssueAttachments } from '@/features/files/components/IssueAttachments'
import { TaskFileDropZone } from '@/features/files/components/TaskFileDropZone'
import { TaskImagesProvider } from '@/features/files/components/TaskImagesProvider'
import { formatSize } from '@/features/files/fileTypes'
import { useAttachFiles, useStorageUsage } from '@/features/files/hooks'
import { IssuePlanningProperties } from '@/features/planning/components/IssuePlanningProperties'
import { BlockedBanner, IssueRelations } from '@/features/relations/components/IssueRelations'
import { StoryBanner, StoryParentCard, StorySections, useAddToStory } from '@/features/stories/components/StoryPanel'
import { useIssue } from '../hooks'
import { isStory } from '../issueTypes'
import { IssueDescription } from './IssueDescription'
import { IssueDetail } from './IssueDetail'

/**
 * IssueDetail con las secciones de otras features: la descripción con su editor (menciones, checklist), aviso de bloqueo, criterios y checklist, relaciones,
 * comentarios e historial; y en las propiedades, ciclo, módulos y progreso. `focusCommentId` lleva la vista hasta ese
 * comentario (al abrir la tarea desde un aviso de la Bandeja). En una historia, además: «Lista para revisar» o
 * «Cerrada por…», sus tareas y bugs y «Partir en tareas»; en una tarea o un bug de una historia, la historia.
 * Todas las imágenes de la tarea (descripción, adjuntos y comentarios) se abren en el mismo visor (TaskImagesProvider).
 * Adjuntos va antes de la actividad, y los archivos que se sueltan en cualquier parte de la tarea (fuera de un editor)
 * se adjuntan (TaskFileDropZone).
 * Se mantiene aparte para que IssueDetail no dependa de esas features.
 */
export function IssueDetailWithExtras({ focusCommentId, ...props }) {
  const { slug, project, onOpenIssue, variant, issueId } = props
  const { data: issue } = useIssue(slug, project.id, issueId)
  const story = issue && isStory(issue) ? issue : null
  const { addTask, reportBug, dialogs } = useAddToStory({ slug, project, story })
  const attachFiles = useAttachFiles(slug, project.id, issueId)
  const { data: storage } = useStorageUsage(slug)
  return (
    <TaskImagesProvider slug={slug} projectId={project.id} issue={issue}>
      <TaskFileDropZone
        issue={issue}
        storageFull={Boolean(storage?.full)}
        quotaLabel={storage ? formatSize(storage.quotaBytes) : undefined}
        onFiles={attachFiles}
      >
        <IssueDetail
          {...props}
          renderDescription={(current, markdownView) => (
            <IssueDescription
              key={current.id}
              slug={slug}
              project={project}
              issue={current}
              variant={variant}
              onOpenIssue={onOpenIssue}
              showMarkdown={markdownView.showMarkdown}
              onHideMarkdown={markdownView.onHideMarkdown}
            />
          )}
          renderBanner={(current) => (
            <>
              <StoryBanner slug={slug} project={project} issue={current} onOpenIssue={onOpenIssue} onAddTask={addTask} />
              <BlockedBanner slug={slug} projectId={project.id} issue={current} onOpenIssue={onOpenIssue} />
            </>
          )}
          renderUnderTitle={(current) => <StoryParentCard slug={slug} project={project} issue={current} onOpenIssue={onOpenIssue} />}
          renderSections={(current) => <IssueChecklist slug={slug} projectId={project.id} issue={current} />}
          renderChildren={(current) =>
            isStory(current) ? (
              <StorySections
                slug={slug}
                project={project}
                issue={current}
                onOpenIssue={onOpenIssue}
                onAdd={addTask}
                onReportBug={reportBug}
              />
            ) : null
          }
          renderAfterSubIssues={(current) => (
            <>
              <IssueRelations slug={slug} projectId={project.id} issue={current} onOpenIssue={onOpenIssue} />
              <IssueAttachments slug={slug} projectId={project.id} issue={current} variant={variant === 'panel' ? 'panel' : 'page'} />
            </>
          )}
          renderActivity={(current) => (
            <IssueActivity
              slug={slug}
              projectId={project.id}
              issueId={current.id}
              issueCode={current.code}
              projectIdentifier={project.identifier}
              focusCommentId={focusCommentId}
              onOpenIssue={onOpenIssue}
            />
          )}
          renderProperties={(current) => (
            <>
              <IssuePlanningProperties slug={slug} projectId={project.id} issue={current} />
              {/* En una historia el progreso es el de sus tareas (va arriba); sus criterios se ven en su sección */}
              {!isStory(current) && <ChecklistProgressRow issue={current} />}
            </>
          )}
        />
      </TaskFileDropZone>
      {dialogs}
    </TaskImagesProvider>
  )
}
