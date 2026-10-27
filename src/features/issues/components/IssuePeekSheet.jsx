import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { IssueDetailWithExtras } from './IssueDetailWithExtras'

/** Panel flotante a la derecha con el detalle de la tarea abierta (?issue=<id>). */
export function IssuePeekSheet({ slug, project, issueId, onClose, onOpenIssue }) {
  return (
    <Sheet open={Boolean(issueId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="top-2.5 right-2.5 bottom-2.5 h-auto w-[calc(100%-1.25rem)] gap-0 overflow-hidden rounded-[20px] border p-0 shadow-2xl sm:max-w-[780px] [&>button:last-child]:hidden"
      >
        <SheetTitle className="sr-only">Detalle de la tarea</SheetTitle>
        <SheetDescription className="sr-only">Propiedades, subtareas y actividad</SheetDescription>
        {issueId && (
          <IssueDetailWithExtras
            key={issueId}
            slug={slug}
            project={project}
            issueId={issueId}
            variant="panel"
            onClose={onClose}
            onOpenIssue={onOpenIssue}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
