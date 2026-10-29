import { useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { IssueDetailWithExtras } from './IssueDetailWithExtras'

/**
 * Panel flotante a la derecha con el detalle de la tarea abierta (?issue=<id>). `focusCommentId` lleva la vista
 * hasta ese comentario.
 */
export function IssuePeekSheet({ slug, project, issueId, onClose, onOpenIssue, focusCommentId }) {
  // Al cerrar, la URL pierde ?issue enseguida: se sigue mostrando la última tarea mientras el panel sale
  const [lastIssueId, setLastIssueId] = useState(issueId)
  if (issueId && issueId !== lastIssueId) setLastIssueId(issueId)
  const shownId = issueId ?? lastIssueId

  return (
    <Sheet open={Boolean(issueId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="top-2.5 right-2.5 bottom-2.5 h-auto w-[calc(100%-1.25rem)] gap-0 overflow-hidden rounded-[20px] border p-0 shadow-2xl data-[state=closed]:duration-200 data-[state=open]:duration-300 sm:max-w-[780px] [&>button:last-child]:hidden"
      >
        <SheetTitle className="sr-only">Detalle de la tarea</SheetTitle>
        <SheetDescription className="sr-only">Propiedades, subtareas y actividad</SheetDescription>
        {shownId && project && (
          // Al pasar de una tarea a otra (subtarea, padre) el contenido cambia con un fundido
          <div key={shownId} className="tf-fade h-full min-h-0">
            <IssueDetailWithExtras
              slug={slug}
              project={project}
              issueId={shownId}
              variant="panel"
              focusCommentId={focusCommentId}
              onClose={onClose}
              onOpenIssue={onOpenIssue}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
