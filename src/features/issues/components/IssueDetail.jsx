import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { FileCode2, Link2, Maximize2, MoreHorizontal, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AvatarStack } from '@/components/common/AvatarStack'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CenteredSpinner } from '@/components/common/Loaders'
import { ErrorState } from '@/components/common/States'
import { StateIcon } from '@/components/common/StateIcon'
import { MarkdownView } from '@/features/editor/components/MarkdownView'
import { useWorkspace } from '@/features/workspaces/hooks'
import { formatDateTime, formatRelative } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { canDeleteIssue } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/sessionStore'
import { useDeleteIssue, useIssue, useSubIssues } from '../hooks'
import { useCriteriaGuard } from '../useCriteriaGuard'
import { isOverdue, useIssueUpdater, useProjectMeta } from '../useIssueHelpers'
import { CreateIssueDialog } from './CreateIssueDialog'
import { EditableText } from './EditableText'
import { ParentPicker } from './ParentPicker'
import { AssigneesPicker, DatePicker, LabelsPicker, PriorityPicker, StatePicker } from './PropertyPickers'

/**
 * Detalle completo de una tarea. Se usa en el panel lateral (`variant="panel"`) y en la página propia.
 * Las secciones de otras features entran por props, sin que este componente dependa de ellas:
 * `renderDescription` (la descripción con su editor; recibe la tarea y `{ showMarkdown, onHideMarkdown }`),
 * `renderBanner` (aviso sobre el título), `renderSections` (criterios y checklist, antes de las subtareas),
 * `renderAfterSubIssues` (relaciones), `renderActivity` (comentarios e historial) y `renderProperties`
 * (filas extra de propiedades: ciclo, módulos, progreso).
 */
export function IssueDetail({
  slug,
  project,
  issueId,
  variant = 'page',
  onClose,
  onOpenIssue,
  renderBanner,
  renderDescription,
  renderSections,
  renderAfterSubIssues,
  renderActivity,
  renderProperties,
}) {
  const { data: issue, isLoading, error, refetch } = useIssue(slug, project.id, issueId)
  const meta = useProjectMeta(slug, project.id)
  const { update } = useIssueUpdater(slug, project.id, issueId)
  const { guard, dialog: criteriaDialog } = useCriteriaGuard()
  const [subIssueOpen, setSubIssueOpen] = useState(false)
  // «Ver Markdown» del menú ⋯: la descripción tal como se guarda
  const [showMarkdown, setShowMarkdown] = useState(false)

  if (isLoading) return <CenteredSpinner className="flex-1" />
  if (error) return <ErrorState error={error} onRetry={refetch} homeLink={`/${slug}/projects/${project.id}/issues`} />
  if (!issue) return null

  const pageUrl = `/${slug}/projects/${project.id}/issues/${issue.id}`

  return (
    <div className="flex h-full min-h-0 flex-col">
      <IssueTopBar
        slug={slug}
        project={project}
        issue={issue}
        variant={variant}
        pageUrl={pageUrl}
        onClose={onClose}
        showMarkdown={showMarkdown}
        onToggleMarkdown={() => setShowMarkdown((current) => !current)}
      />

      <div className="flex min-h-0 flex-1 flex-wrap overflow-y-auto">
        <div className="flex min-w-0 flex-[999_1_380px] flex-col gap-5.5 px-6 pt-5 pb-6">
          {renderBanner?.(issue)}
          <div>
            {issue.parent && (
              <button
                type="button"
                onClick={() => onOpenIssue(issue.parent.id)}
                className="mb-1.5 flex max-w-full items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                <span aria-hidden="true">↰</span>
                <span>{issue.parent.code}</span>
                <span className="truncate">· {issue.parent.title}</span>
              </button>
            )}
            <EditableText
              singleLine
              value={issue.title}
              maxLength={255}
              onSave={(title) => update({ title })}
              className="-mx-2 text-2xl leading-tight font-semibold tracking-[-0.01em]"
              placeholder="Título de la tarea"
            />
          </div>
          {renderDescription ? (
            renderDescription(issue, { showMarkdown, onHideMarkdown: () => setShowMarkdown(false) })
          ) : (
            <MarkdownView markdown={issue.description} slug={slug} projectId={project.id} onOpenIssue={onOpenIssue} />
          )}

          {renderSections?.(issue)}

          <SubIssues
            slug={slug}
            projectId={project.id}
            issueId={issue.id}
            onOpenIssue={onOpenIssue}
            onAdd={() => setSubIssueOpen(true)}
          />

          {renderAfterSubIssues?.(issue)}

          {renderActivity?.(issue)}
        </div>

        <aside className="flex flex-[1_1_240px] flex-col gap-1 border-l bg-column px-4.5 py-5">
          <p className="mb-2 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Propiedades</p>
          <PropertyRow label="Estado">
            <StatePicker
              states={meta.states}
              value={issue.state?.id}
              onChange={(stateId) =>
                guard(
                  issue,
                  meta.states.find((state) => state.id === stateId),
                  () => update({ stateId }),
                )
              }
            />
          </PropertyRow>
          <PropertyRow label="Prioridad">
            <PriorityPicker value={issue.priority} onChange={(priority) => update({ priority })} />
          </PropertyRow>
          <PropertyRow label="Asignados">
            <AssigneesPicker
              members={meta.users}
              value={issue.assignees?.map((user) => user.id) ?? []}
              onChange={(assigneeIds) => update({ assigneeIds })}
            />
          </PropertyRow>
          <PropertyRow label="Etiquetas">
            <LabelsPicker
              labels={meta.labels}
              value={issue.labels?.map((label) => label.id) ?? []}
              onChange={(labelIds) => update({ labelIds })}
            />
          </PropertyRow>
          <PropertyRow label="Inicio">
            <DatePicker
              value={issue.startDate}
              placeholder="Sin fecha"
              maxDate={issue.dueDate}
              onChange={(startDate) => update(startDate ? { startDate } : { clearStartDate: true })}
            />
          </PropertyRow>
          <PropertyRow label="Fecha límite">
            <DatePicker
              value={issue.dueDate}
              placeholder="Sin fecha"
              minDate={issue.startDate}
              isOverdue={isOverdue(issue)}
              onChange={(dueDate) => update(dueDate ? { dueDate } : { clearDueDate: true })}
            />
          </PropertyRow>
          <PropertyRow label="Padre">
            <ParentPicker
              slug={slug}
              projectId={project.id}
              issue={issue}
              onChange={(parentId) => update(parentId ? { parentId } : { clearParent: true })}
            />
          </PropertyRow>
          {renderProperties?.(issue)}
          <div className="mt-3.5 space-y-0.5 border-t pt-3.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
            <p title={formatDateTime(issue.createdAt)}>
              creada{issue.createdBy ? ` por ${issue.createdBy.fullName.split(' ')[0]}` : ''} · {formatRelative(issue.createdAt)}
            </p>
            <p title={formatDateTime(issue.updatedAt)}>actualizada {formatRelative(issue.updatedAt)}</p>
            {issue.checklistUpdatedAt && (
              <p title={formatDateTime(issue.checklistUpdatedAt)}>checklist actualizado {formatRelative(issue.checklistUpdatedAt)}</p>
            )}
          </div>
        </aside>
      </div>

      <CreateIssueDialog
        slug={slug}
        project={project}
        open={subIssueOpen}
        onOpenChange={setSubIssueOpen}
        defaults={{ parentId: issue.id, parentCode: issue.code, stateId: issue.state?.id }}
      />
      {criteriaDialog}
    </div>
  )
}

export function PropertyRow({ label, children }) {
  return (
    <div className="grid min-h-[34px] grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function IssueTopBar({ slug, project, issue, variant, pageUrl, onClose, showMarkdown, onToggleMarkdown }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const remove = useDeleteIssue(slug, project.id)
  const navigate = useNavigate()
  // Del workspace de la tarea (no de la URL): el panel también se abre desde la Bandeja
  const { data: workspace } = useWorkspace(slug)
  const currentUserId = useSessionStore((state) => state.user?.id)
  // Eliminar: el project manager o quien creó la tarea (el backend responde 403 a los demás)
  const canDelete = canDeleteIssue(workspace?.myRole, issue, currentUserId)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${pageUrl}`)
      toast.success('Enlace copiado')
    } catch {
      toast.error('No se pudo copiar el enlace')
    }
  }

  const handleDelete = () => {
    remove.mutate(issue.id, {
      onSuccess: () => {
        toast.success(`${issue.code} eliminada`)
        setConfirmDelete(false)
        if (variant === 'panel') onClose?.()
        else navigate(`/${slug}/projects/${project.id}/issues`, { replace: true })
      },
      onError: (error) => notifyError(error),
    })
  }

  const iconButton = 'size-8 text-muted-foreground'

  return (
    <div className="flex shrink-0 items-center gap-2.5 border-b px-4 py-3">
      <StateIcon group={issue.state?.group} color={issue.state?.color} />
      <span className="font-mono text-[13px] text-muted-foreground">{issue.code}</span>
      <span className="hidden truncate font-mono text-xs text-muted-foreground sm:inline">· {project.name.toLowerCase()}</span>
      {issue.assignees?.length > 0 && <AvatarStack users={issue.assignees} size="xs" className="ml-1" />}
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" className={iconButton} onClick={copyLink} aria-label="Copiar enlace" title="Copiar enlace">
          <Link2 />
        </Button>
        {variant === 'panel' && (
          <Button asChild variant="ghost" size="icon" className={iconButton} aria-label="Abrir en página completa" title="Abrir en página completa">
            <Link to={pageUrl}>
              <Maximize2 />
            </Link>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={iconButton} aria-label="Más acciones">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onToggleMarkdown}>
              <FileCode2 />
              {showMarkdown ? 'Ver la descripción con formato' : 'Ver Markdown'}
            </DropdownMenuItem>
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                  <Trash2 />
                  Eliminar tarea
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {variant === 'panel' && (
          <Button variant="ghost" size="icon" className={iconButton} onClick={onClose} aria-label="Cerrar">
            <X />
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`¿Eliminar ${issue.code}?`}
        description="Se borrarán sus comentarios e historial. Sus subtareas se conservan sin padre."
        confirmLabel="Eliminar"
        loading={remove.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}

function SubIssues({ slug, projectId, issueId, onOpenIssue, onAdd }) {
  const { data: subIssues, isLoading } = useSubIssues(slug, projectId, issueId)
  const total = subIssues?.length ?? 0
  const done = subIssues?.filter((sub) => sub.state?.group === 'COMPLETED').length ?? 0

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Subtareas{' '}
          {total > 0 && (
            <span className="font-mono text-xs font-normal text-muted-foreground">
              {done}/{total}
            </span>
          )}
        </h2>
        <button type="button" className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent" onClick={onAdd}>
          + agregar
        </button>
      </div>
      {isLoading ? (
        <CenteredSpinner className="p-4" />
      ) : total === 0 ? (
        <p className="rounded-xl border border-dashed border-dash px-3 py-3.5 text-center text-sm text-muted-foreground">
          Sin subtareas
        </p>
      ) : (
        <>
          <div className="h-1 rounded-full bg-column" aria-hidden="true">
            <div className="h-full rounded-full bg-ok-dot" style={{ width: `${Math.round((done / total) * 100)}%` }} />
          </div>
          <ul className="overflow-hidden rounded-xl border">
            {subIssues.map((sub, index) => {
              const closed = sub.state?.group === 'COMPLETED' || sub.state?.group === 'CANCELLED'
              return (
                <li key={sub.id} className={cn(index > 0 && 'border-t')}>
                  <button
                    type="button"
                    onClick={() => onOpenIssue(sub.id)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-subtle"
                  >
                    <StateIcon group={sub.state?.group} color={sub.state?.color} />
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{sub.code}</span>
                    <span className={cn('min-w-0 flex-1 truncate', closed && 'text-muted-foreground line-through')}>{sub.title}</span>
                    {sub.assignees?.length > 0 && <AvatarStack users={sub.assignees} size="xs" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
