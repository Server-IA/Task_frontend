import { ChevronLeft, ChevronRight, CircleDot, CornerDownRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/common/States'
import { cn } from '@/lib/utils'
import { LIST_PAGE_SIZE } from '../constants'
import { useIssues } from '../hooks'
import { InlineIssueProperties } from './IssueProperties'

/** Vista de lista: filas con propiedades editables y paginación. */
export function IssueListView({ slug, project, meta, filters, sort, page, setPage, openIssue, onCreate, hasFilters, extraParams }) {
  const params = { ...filters, ...extraParams, sort, page, size: LIST_PAGE_SIZE }
  const { data, isLoading, error, refetch, isFetching } = useIssues(slug, project.id, params)

  if (isLoading) {
    return (
      <div className="space-y-1 p-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-11 w-full" />
        ))}
      </div>
    )
  }
  if (error) return <ErrorState error={error} onRetry={refetch} />

  if (data.totalElements === 0) {
    return hasFilters ? (
      <EmptyState icon={CircleDot} title="Ningún issue coincide" description="Prueba con otros filtros o búsqueda." />
    ) : (
      <EmptyState
        icon={CircleDot}
        title="Todavía no hay issues"
        description="Crea el primero con el botón «Nuevo issue» o la tecla C."
        action={<Button onClick={onCreate}>Crear issue</Button>}
      />
    )
  }

  const from = data.page * data.size + 1
  const to = from + data.content.length - 1

  return (
    <div className={cn('flex min-h-full flex-col', isFetching && 'opacity-80')}>
      <ul className="flex-1 divide-y">
        {data.content.map((issue) => (
          <li key={issue.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => openIssue(issue.id)}
              onKeyDown={(event) => event.key === 'Enter' && openIssue(issue.id)}
              className="group flex cursor-pointer flex-col gap-1.5 px-4 py-2 outline-none hover:bg-accent/50 focus-visible:bg-accent/60 md:flex-row md:items-center md:gap-3"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{issue.code}</span>
                {issue.parent && (
                  <span
                    className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground lg:flex"
                    title={`Sub-issue de ${issue.parent.code}`}
                  >
                    <CornerDownRight className="size-3" />
                    {issue.parent.code}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{issue.title}</span>
              </div>
              <InlineIssueProperties slug={slug} projectId={project.id} issue={issue} meta={meta} compact />
            </div>
          </li>
        ))}
      </ul>
      {data.totalPages > 1 && (
        <div className="sticky bottom-0 flex items-center justify-between border-t bg-background px-4 py-2 text-sm text-muted-foreground">
          <span>
            {from}–{to} de {data.totalElements}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-8" disabled={data.first} onClick={() => setPage(page - 1)} aria-label="Página anterior">
              <ChevronLeft />
            </Button>
            <span className="px-2">
              {data.page + 1} / {data.totalPages}
            </span>
            <Button variant="ghost" size="icon" className="size-8" disabled={data.last} onClick={() => setPage(page + 1)} aria-label="Página siguiente">
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
