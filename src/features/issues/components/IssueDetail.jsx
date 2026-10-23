import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Link2, Maximize2, MoreHorizontal, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { AvatarStack } from '@/components/common/AvatarStack'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CenteredSpinner } from '@/components/common/Loaders'
import { ErrorState } from '@/components/common/States'
import { StateIcon } from '@/components/common/StateIcon'
import { UserAvatar } from '@/components/common/UserAvatar'
import { formatDateTime, formatRelative } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { useDeleteIssue, useIssue, useSubIssues } from '../hooks'
import { isOverdue, useIssueUpdater, useProjectMeta } from '../useIssueHelpers'
import { CreateIssueDialog } from './CreateIssueDialog'
import { EditableText } from './EditableText'
import { ParentPicker } from './ParentPicker'
import { AssigneesPicker, DatePicker, LabelsPicker, PriorityPicker, StatePicker } from './PropertyPickers'

/**
 * Detalle completo de un issue. Se usa en el panel lateral (`variant="panel"`) y en la página propia.
 * `renderActivity` y `renderPlanning` permiten agregar secciones de otras features (comentarios,
 * historial, ciclo y módulos) sin que este componente dependa de ellas.
 */
export function IssueDetail({ slug, project, issueId, variant = 'page', onClose, onOpenIssue, renderActivity, renderPlanning }) {
  const { data: issue, isLoading, error, refetch } = useIssue(slug, project.id, issueId)
  const meta = useProjectMeta(slug, project.id)
  const { update } = useIssueUpdater(slug, project.id, issueId)
  const [subIssueOpen, setSubIssueOpen] = useState(false)

  if (isLoading) return <CenteredSpinner className="flex-1" />
  if (error) return <ErrorState error={error} onRetry={refetch} homeLink={`/${slug}/projects/${project.id}/issues`} />
  if (!issue) return null

  const pageUrl = `/${slug}/projects/${project.id}/issues/${issue.id}`

  return (
    <div className="flex h-full min-h-0 flex-col">
      <IssueTopBar slug={slug} project={project} issue={issue} variant={variant} pageUrl={pageUrl} onClose={onClose} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_17rem]">
          <div className="min-w-0 space-y-6">
            {issue.parent && (
              <button
                type="button"
                onClick={() => onOpenIssue(issue.parent.id)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <span className="font-mono">{issue.parent.code}</span>
                <span className="truncate">{issue.parent.title}</span>
              </button>
            )}
            <div className="space-y-1">
              <EditableText
                singleLine
                value={issue.title}
                maxLength={255}
                onSave={(title) => update({ title })}
                className="-mx-2 text-xl font-semibold"
                placeholder="Título del issue"
              />
              <EditableText
                value={issue.description ?? ''}
                maxLength={50000}
                onSave={(description) => update({ description })}
                className="-mx-2 min-h-20 text-sm leading-relaxed whitespace-pre-wrap"
                placeholder="Agrega una descripción…"
              />
            </div>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Sub-issues</h3>
                <Button variant="ghost" size="sm" className="h-7" onClick={() => setSubIssueOpen(true)}>
                  <Plus />
                  Agregar
                </Button>
              </div>
              <SubIssues slug={slug} projectId={project.id} issueId={issue.id} onOpenIssue={onOpenIssue} />
            </section>

            {renderActivity?.(issue)}
          </div>

          <aside className="space-y-1 lg:border-l lg:pl-5">
            <h3 className="mb-2 text-sm font-semibold">Propiedades</h3>
            <PropertyRow label="Estado">
              <StatePicker states={meta.states} value={issue.state?.id} onChange={(stateId) => update({ stateId })} />
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
            {renderPlanning?.(issue)}
            <Separator className="my-3" />
            <div className="space-y-2 px-1 text-xs text-muted-foreground">
              {issue.createdBy && (
                <p className="flex items-center gap-1.5">
                  <UserAvatar user={issue.createdBy} size="xs" />
                  Creado por {issue.createdBy.fullName}
                </p>
              )}
              <p title={formatDateTime(issue.createdAt)}>Creado {formatRelative(issue.createdAt)}</p>
              <p title={formatDateTime(issue.updatedAt)}>Actualizado {formatRelative(issue.updatedAt)}</p>
            </div>
          </aside>
        </div>
      </div>

      <CreateIssueDialog
        slug={slug}
        project={project}
        open={subIssueOpen}
        onOpenChange={setSubIssueOpen}
        defaults={{ parentId: issue.id, parentCode: issue.code, stateId: issue.state?.id }}
      />
    </div>
  )
}

export function PropertyRow({ label, children }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function IssueTopBar({ slug, project, issue, variant, pageUrl, onClose }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const remove = useDeleteIssue(slug, project.id)
  const navigate = useNavigate()

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
        toast.success(`${issue.code} eliminado`)
        setConfirmDelete(false)
        if (variant === 'panel') onClose?.()
        else navigate(`/${slug}/projects/${project.id}/issues`, { replace: true })
      },
      onError: (error) => notifyError(error),
    })
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <StateIcon group={issue.state?.group} color={issue.state?.color} />
      <span className="font-mono text-sm text-muted-foreground">{issue.code}</span>
      {issue.assignees?.length > 0 && <AvatarStack users={issue.assignees} size="xs" className="ml-1" />}
      <div className="ml-auto flex items-center gap-1">
        {variant === 'panel' && (
          <Button asChild variant="ghost" size="icon" className="size-8" aria-label="Abrir en página completa" title="Abrir en página completa">
            <Link to={pageUrl}>
              <Maximize2 />
            </Link>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Más acciones">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={copyLink}>
              <Link2 />
              Copiar enlace
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
              <Trash2 />
              Eliminar issue
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {variant === 'panel' && (
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose} aria-label="Cerrar">
            <X />
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`¿Eliminar ${issue.code}?`}
        description="Se borrarán sus comentarios e historial. Sus sub-issues se conservan sin padre."
        confirmLabel="Eliminar"
        loading={remove.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}

function SubIssues({ slug, projectId, issueId, onOpenIssue }) {
  const { data: subIssues, isLoading } = useSubIssues(slug, projectId, issueId)
  if (isLoading) return <CenteredSpinner className="p-4" />
  if (!subIssues?.length) {
    return <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">Sin sub-issues</p>
  }
  const done = subIssues.filter((sub) => sub.state?.group === 'COMPLETED').length
  return (
    <div className="rounded-lg border">
      <p className="border-b px-3 py-1.5 text-xs text-muted-foreground">
        {done} de {subIssues.length} completados
      </p>
      <ul className="divide-y">
        {subIssues.map((sub) => (
          <li key={sub.id}>
            <button
              type="button"
              onClick={() => onOpenIssue(sub.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent/50"
            >
              <StateIcon group={sub.state?.group} color={sub.state?.color} />
              <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">{sub.code}</span>
              <span className="min-w-0 flex-1 truncate">{sub.title}</span>
              {sub.assignees?.length > 0 && <AvatarStack users={sub.assignees} size="xs" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
