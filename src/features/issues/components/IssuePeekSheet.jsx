import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { IssueDetailWithExtras } from './IssueDetailWithExtras'

/** Panel lateral con el detalle del issue abierto (?issue=<id>), como el «peek» de Plane. */
export function IssuePeekSheet({ slug, project, issueId, onClose, onOpenIssue }) {
  return (
    <Sheet open={Boolean(issueId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-3xl [&>button:last-child]:hidden">
        <SheetTitle className="sr-only">Detalle del issue</SheetTitle>
        <SheetDescription className="sr-only">Propiedades, sub-issues y actividad</SheetDescription>
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
