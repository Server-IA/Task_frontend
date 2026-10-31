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
import { formatDateTime, formatRelative, formatShortDate } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { canDeleteIssue } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/sessionStore'
import { useDeleteIssue, useIssue, useSubIssues } from '../hooks'
import { useCriteriaGuard } from '../useCriteriaGuard'
import { isStory, stateOptionsFor, storyFlags, storyStateLocked, typeOf } from '../issueTypes'
import { isOverdue, useIssueUpdater, useProjectMeta } from '../useIssueHelpers'
import { closedStoryActions, useStoryClosedGuard } from '../useStoryClosedGuard'
import { CreateIssueDialog } from './CreateIssueDialog'
import { StoryProgressSummary, TypePill } from './IssueTypeBits'
import { TypePicker } from './TypePicker'
import { EditableText } from './EditableText'
import { ParentPicker } from './ParentPicker'
import { AssigneesPicker, DatePicker, LabelsPicker, PriorityPicker, StatePicker } from './PropertyPickers'

/**
 * Detalle completo de una tarea. Se usa en el panel lateral (`variant="panel"`) y en la página propia.
 * Las secciones de otras features entran por props, sin que este componente dependa de ellas:
 * `renderDescription` (la descripción con su editor; recibe la tarea y `{ showMarkdown, onHideMarkdown }`),
 * `renderBanner` (aviso sobre el título), `renderSections` (criterios y checklist, antes de las subtareas),
 * `renderAfterSubIssues` (relaciones), `renderActivity` (comentarios e historial) y `renderProperties`
 * (filas extra de propiedades: ciclo, módulos, progreso). Para los tipos: `renderUnderTitle` (la historia de una
 * tarea o un bug) y `renderChildren` (las tareas y bugs de una historia, en lugar de «Subtareas»; si devuelve null,
 * van las subtareas de siempre).
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
  renderUnderTitle,
  renderChildren,
}) {
  const { data: issue, isLoading, error, refetch } = useIssue(slug, project.id, issueId)
  const meta = useProjectMeta(slug, project.id)
  const { update } = useIssueUpdater(slug, project.id, issueId)
  const { guard, dialog: criteriaDialog } = useCriteriaGuard()
  // Estado, tipo o padre que reabrirían una historia cerrada: 409 STORY_CLOSED → preguntar
  const { onStoryClosed, dialog: storyClosedDialog, manager } = useStoryClosedGuard(slug)
  const [subIssueOpen, setSubIssueOpen] = useState(false)
  // «Ver Markdown» del menú ⋯: la descripción tal como se guarda
  const [showMarkdown, setShowMarkdown] = useState(false)

  if (isLoading) return <CenteredSpinner className="flex-1" />
  if (error) return <ErrorState error={error} onRetry={refetch} homeLink={`/${slug}/projects/${project.id}/issues`} />
  if (!issue) return null

  const pageUrl = `/${slug}/projects/${project.id}/issues/${issue.id}`
  const story = isStory(issue)
  const flags = story ? storyFlags(issue) : null
  // Cerrar o reabrir una historia es del project manager: un miembro solo la mueve entre estados abiertos
  const stateOptions = stateOptionsFor(issue, meta.states, manager)
  const childrenSection = renderChildren?.(issue)
  /** Cambio que la historia cerrada de la tarea rechaza (409): se reintenta reabriéndola. */
  const updateReopening = (changes, action) =>
    update(changes, { onError: onStoryClosed(issue, action, () => update({ ...changes, reopenParent: true })) })

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
        manager={manager}
        onChangeType={(type) => updateReopening({ type }, closedStoryActions.type(issue))}
      />

      <div className="flex min-h-0 flex-1 flex-wrap overflow-y-auto">
        <div className="flex min-w-0 flex-[999_1_380px] flex-col gap-5.5 px-6 pt-5 pb-6">
          {renderBanner?.(issue)}
          <div>
            {issue.parent && issue.parent.type !== 'STORY' && (
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
          {renderUnderTitle?.(issue)}
          {renderDescription ? (
            renderDescription(issue, { showMarkdown, onHideMarkdown: () => setShowMarkdown(false) })
          ) : (
            <MarkdownView markdown={issue.description} slug={slug} projectId={project.id} onOpenIssue={onOpenIssue} />
          )}

          {renderSections?.(issue)}

          {childrenSection ?? (
            <SubIssues
              slug={slug}
              projectId={project.id}
              issueId={issue.id}
              onOpenIssue={onOpenIssue}
              onAdd={() => setSubIssueOpen(true)}
            />
          )}

          {renderAfterSubIssues?.(issue)}

          {renderActivity?.(issue)}
        </div>

        <aside className="flex flex-[1_1_240px] flex-col gap-1 border-l bg-column px-4.5 py-5">
          <p className="mb-2 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Propiedades</p>
          <PropertyRow label="Tipo">
            <TypePill type={typeOf(issue)} className="ml-2" />
          </PropertyRow>
          <PropertyRow label="Estado">
            <span className="flex min-w-0 flex-col items-start">
            <StatePicker
              states={stateOptions}
              disabled={storyStateLocked(issue, manager)}
              value={issue.state?.id}
              onChange={(stateId) => {
                const state = meta.states.find((item) => item.id === stateId)
                guard(issue, state, () => updateReopening({ stateId }, closedStoryActions.move(issue, state)))
              }}
            />
            {story && (
              <span className="-mt-1 pl-2 font-mono text-[10.5px] text-muted-foreground" title="El estado de la historia sigue a sus tareas">
                {flags.closed ? 'cerrada' : 'automático'}
              </span>
            )}
            </span>
          </PropertyRow>
          {story && (
            <PropertyRow label="Progreso">
              <StoryProgressSummary story={issue} />
            </PropertyRow>
          )}
          {story && issue.closedAt && (
            <PropertyRow label="Cerrada por">
              <span className="truncate px-2 text-xs">
                {issue.closedBy?.fullName.split(' ')[0] ?? '—'} · {formatShortDate(issue.closedAt)}
              </span>
            </PropertyRow>
          )}
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
          <PropertyRow label={issue.parent?.type === 'STORY' ? 'Historia' : 'Padre'}>
            <ParentPicker
              slug={slug}
              projectId={project.id}
              issue={issue}
              onChange={(parentId) =>
                parentId ? updateReopening({ parentId }, closedStoryActions.parent(issue)) : update({ clearParent: true })
              }
            />
          </PropertyRow>
          {renderProperties?.(issue)}
          <div className="mt-3.5 space-y-0.5 border-t pt-3.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
            <p title={formatDateTime(issue.createdAt)}>
              {story ? 'escrita' : 'creada'}
              {issue.createdBy ? ` por ${issue.createdBy.fullName.split(' ')[0]}` : ''} · {formatRelative(issue.createdAt)}
            </p>
            {story && issue.closedAt && (
              <p title={formatDateTime(issue.closedAt)}>
                cerrada{issue.closedBy ? ` por ${issue.closedBy.fullName.split(' ')[0]}` : ''} · {formatShortDate(issue.closedAt)}
              </p>
            )}
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
      {storyClosedDialog}
    </div>
  )
}

export function PropertyRow({ label, children }) {
  return (
    <div className="grid min-h-[34px] grid-cols-[76px_minmax(0,1fr)] items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function IssueTopBar({ slug, project, issue, variant, pageUrl, onClose, showMarkdown, onToggleMarkdown, manager, onChangeType }) {
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
      <TypePicker issue={issue} isManager={manager} onChange={onChangeType} />
      {/* El código no se parte (en el panel quedaba «QAVISUALLONG-» / «1»); un estado de nombre largo se corta */}
      <span className="shrink-0 font-mono text-[13px] whitespace-nowrap text-muted-foreground">{issue.code}</span>
      <span className="hidden truncate font-mono text-xs text-muted-foreground sm:inline">· {project.name.toLowerCase()}</span>
      <span className="flex max-w-60 shrink-0 items-center gap-1.5 text-[13px]" title={issue.state?.name}>
        <StateIcon group={issue.state?.group} color={issue.state?.color} />
        <span className="truncate">{issue.state?.name}</span>
        {isStory(issue) && issue.state?.group !== 'COMPLETED' && issue.state?.group !== 'CANCELLED' && (
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">automático</span>
        )}
      </span>
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
