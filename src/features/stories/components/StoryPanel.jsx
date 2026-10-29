import { useState } from 'react'
import { CircleCheck, GitBranch, Info, Link2, Lock, LockKeyhole, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AvatarStack } from '@/components/common/AvatarStack'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CenteredSpinner } from '@/components/common/Loaders'
import { StateIcon } from '@/components/common/StateIcon'
import { CreateIssueDialog } from '@/features/issues/components/CreateIssueDialog'
import { BugCountBadge, StoryProgress, TypeIcon } from '@/features/issues/components/IssueTypeBits'
import { useIssue, useSubIssues } from '@/features/issues/hooks'
import { pendingCriteria } from '@/features/issues/issueFlags'
import { isStory, storyFlags, storyProgress, typeOf } from '@/features/issues/issueTypes'
import { useProjectMeta } from '@/features/issues/useIssueHelpers'
import { useRelations } from '@/features/relations/hooks'
import { useWorkspace } from '@/features/workspaces/hooks'
import { formatShortDate } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { isManager as isManagerRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useCloseStory, useReopenStory } from '../hooks'
import { SplitComposer } from './SplitComposer'

/** Si el usuario es project manager del workspace de la tarea (el panel también se abre desde la Bandeja). */
function useManager(slug) {
  return isManagerRole(useWorkspace(slug).data?.myRole)
}

const firstName = (user) => user?.fullName?.trim().split(/\s+/)[0] ?? 'alguien'

/**
 * Aviso sobre el título de una historia: «Lista para revisar» (con «Agregar tarea» y «Cerrar historia», que solo
 * puede el project manager) o «Cerrada por Ana · 12 nov» (con «Reabrir»), y debajo los bugs después de cerrar y las
 * historias relacionadas.
 */
export function StoryBanner({ slug, project, issue, onOpenIssue, onAddTask }) {
  const manager = useManager(slug)
  const close = useCloseStory(slug, project.id)
  const reopen = useReopenStory(slug, project.id)
  const [confirmClose, setConfirmClose] = useState(false)
  const { data: relations } = useRelations(slug, project.id, issue.id, { enabled: isStory(issue) })
  if (!isStory(issue)) return null
  const flags = storyFlags(issue)
  const progress = storyProgress(issue)
  const related = (relations?.related ?? []).filter((relation) => relation.accessible !== false)
  const missing = pendingCriteria(issue)

  const doClose = () =>
    close.mutate(issue.id, {
      onSuccess: () => {
        setConfirmClose(false)
        toast.success(`${issue.code} cerrada`)
      },
      onError: (error) => notifyError(error, 'No se pudo cerrar la historia'),
    })
  const askClose = () => (missing > 0 ? setConfirmClose(true) : doClose())
  const doReopen = () =>
    reopen.mutate(issue.id, {
      onSuccess: () => toast.success(`${issue.code} reabierta`),
      onError: (error) => notifyError(error, 'No se pudo reabrir la historia'),
    })

  return (
    <div className="flex flex-col gap-2.5">
      {flags.ready && (
        <section className="tf-pop flex gap-3 rounded-2xl border border-ok/25 bg-ok-soft px-4 py-3.5" aria-label="Lista para revisar">
          <CircleCheck className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div>
              <h2 className="text-[15px] font-semibold text-ok">Lista para revisar</h2>
              <p className="text-sm text-foreground/85">
                {progress.total === 1 ? 'La tarea está terminada' : `Las ${progress.total} tareas están terminadas`} y no queda ningún bug
                abierto ligado (uno abierto la bloquea). {manager ? 'Revisa los criterios de aceptación y cierra la historia.' : 'El project manager revisa los criterios.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="bg-card" onClick={onAddTask}>
                Agregar tarea
              </Button>
              {manager ? (
                <Button size="sm" onClick={askClose} disabled={close.isPending}>
                  Cerrar historia
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled className="border-dashed bg-transparent">
                  <Lock />
                  Cerrar historia
                </Button>
              )}
            </div>
            {!manager && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3" aria-hidden="true" />
                Solo el project manager cierra la historia
              </p>
            )}
          </div>
        </section>
      )}
      {flags.closed && (
        <section className="tf-pop flex items-start gap-3 rounded-2xl border bg-subtle px-4 py-3.5" aria-label="Historia cerrada">
          <LockKeyhole className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold">
              Cerrada{issue.closedBy ? ` por ${firstName(issue.closedBy)}` : ''}
              {issue.closedAt ? ` · ${formatShortDate(issue.closedAt)}` : ''}
            </h2>
            <p className="text-sm text-muted-foreground">
              Sus tareas y criterios quedan como documentación. Lo nuevo va en una tarea o una historia relacionada.
            </p>
          </div>
          {manager ? (
            <div className="flex flex-col items-end gap-1">
              <Button variant="outline" size="sm" className="bg-card" onClick={doReopen} disabled={reopen.isPending}>
                <RotateCcw />
                Reabrir
              </Button>
              <span className="font-mono text-[10px] text-muted-foreground">solo el PM</span>
            </div>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="size-3" aria-hidden="true" />
              solo el PM la reabre
            </span>
          )}
        </section>
      )}
      {(flags.bugsAfterClose > 0 || related.length > 0) && (
        <div className="flex flex-col items-start gap-1.5">
          <BugCountBadge count={flags.bugsAfterClose} afterClose />
          {related.map((relation) => (
            <button
              key={relation.relationId}
              type="button"
              onClick={() => onOpenIssue(relation.issue.id)}
              className="flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-0.5 text-xs text-muted-foreground hover:bg-subtle"
            >
              <Link2 className="size-3 shrink-0" aria-hidden="true" />
              relacionada:
              <span className={cn('font-mono font-semibold', typeOf(relation.issue) === 'STORY' ? 'text-ty-story-text' : 'text-foreground')}>
                {relation.issue.code}
              </span>
              <span className="truncate text-foreground">{relation.issue.title}</span>
            </button>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title={`¿Cerrar ${issue.code} con ${missing} ${missing === 1 ? 'criterio' : 'criterios'} sin marcar?`}
        description={`Tiene ${missing} de ${issue.criteriaTotal} criterios de aceptación sin marcar.`}
        confirmLabel="Cerrar igual"
        destructive={false}
        loading={close.isPending}
        onConfirm={doClose}
      />
    </div>
  )
}

/**
 * Tareas y bugs de una historia (en lugar de «Subtareas»): «Tareas de la historia 3 de 5» con su barra, la lista de
 * tareas, los bugs aparte («no cuentan en x de y») y «Partir en tareas» (project manager). Con la historia sin tareas
 * el compositor se abre solo. `onAdd` agrega una tarea (en una historia cerrada, pregunta antes).
 */
export function StorySections({ slug, project, issue, onOpenIssue, onAdd, onReportBug }) {
  const manager = useManager(slug)
  const meta = useProjectMeta(slug, project.id)
  const { data: children = [], isLoading } = useSubIssues(slug, project.id, issue.id)
  const flags = storyFlags(issue)
  const progress = storyProgress(issue)
  const [splitting, setSplitting] = useState(false)
  const tasks = children.filter((child) => typeOf(child) !== 'BUG')
  const bugs = children.filter((child) => typeOf(child) === 'BUG')
  const canSplit = manager && !flags.closed
  const showComposer = canSplit && (splitting || (flags.unsplit && tasks.length === 0))
  const closedAt = issue.closedAt ? new Date(issue.closedAt) : null

  return (
    <section className="flex flex-col gap-2.5" aria-label="Tareas de la historia">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">
          Tareas de la historia{' '}
          <span className="font-mono text-xs font-normal text-muted-foreground">
            {progress.total > 0 ? `${progress.done} de ${progress.total}` : '0'}
          </span>
        </h2>
        {flags.unsplit && (
          <span className="inline-flex items-center gap-1 rounded-[7px] bg-soon-soft px-2 py-0.5 text-xs font-semibold text-soon">
            sin partir
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          {canSplit && !showComposer && (
            <button
              type="button"
              className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-accent"
              onClick={() => setSplitting(true)}
            >
              <GitBranch className="size-3" />
              Partir en tareas
            </button>
          )}
          <button type="button" className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent" onClick={onReportBug}>
            + bug
          </button>
          <button type="button" className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent" onClick={onAdd}>
            + agregar
          </button>
        </span>
      </div>
      {flags.unsplit && tasks.length === 0 && (
        <p className="text-right text-xs text-muted-foreground">Nadie trabaja la historia: el trabajo va en sus tareas.</p>
      )}
      {progress.total > 0 && <StoryProgress story={issue} compact barClassName="h-1.5" />}
      {isLoading ? (
        <CenteredSpinner className="p-4" />
      ) : (
        tasks.length > 0 && <ChildList items={tasks} onOpenIssue={onOpenIssue} />
      )}
      {showComposer && (
        <SplitComposer
          slug={slug}
          project={project}
          story={issue}
          members={meta.users}
          onDone={() => setSplitting(false)}
          onCancel={() => setSplitting(false)}
        />
      )}
      {bugs.length > 0 && (
        <>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">// bugs de la historia · no cuentan en «x de y»</p>
          <ChildList
            items={bugs}
            onOpenIssue={onOpenIssue}
            note={(bug) => {
              const after = closedAt && new Date(bug.createdAt) > closedAt
              return (
                <span className={cn('shrink-0 font-mono text-[11px]', after ? 'font-semibold text-late' : 'text-muted-foreground')}>
                  {after ? 'después de cerrar' : 'apareció aquí'}
                </span>
              )
            }}
            highlight={(bug) => closedAt && new Date(bug.createdAt) > closedAt}
          />
        </>
      )}
    </section>
  )
}

function ChildList({ items, onOpenIssue, note, highlight }) {
  return (
    <ul className="overflow-hidden rounded-xl border">
      {items.map((child, index) => {
        const closed = child.state?.group === 'COMPLETED' || child.state?.group === 'CANCELLED'
        return (
          <li key={child.id} className={cn(index > 0 && 'border-t', highlight?.(child) && 'bg-late-soft/60')}>
            <button
              type="button"
              onClick={() => onOpenIssue(child.id)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-subtle"
            >
              <StateIcon group={child.state?.group} color={child.state?.color} />
              <TypeIcon type={typeOf(child)} size={14} />
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{child.code}</span>
              <span className={cn('min-w-0 flex-1 truncate', closed && 'text-muted-foreground')}>{child.title}</span>
              {note?.(child)}
              {child.assignees?.length > 0 && <AvatarStack users={child.assignees} size="xs" />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * «WEB-15 está cerrada. ¿La reabres o creas la tarea suelta relacionada?»: «Reabrir y agregar» (solo el project
 * manager; la historia vuelve a In Progress) o «Crear tarea relacionada» (la historia sigue cerrada).
 */
export function ClosedStoryDialog({ story, open, onOpenChange, manager, onReopenAndAdd, onCreateRelated }) {
  if (!story) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3.5 sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-[17px] leading-snug">
            <span className="font-mono text-ty-story-text">{story.code}</span> está cerrada. ¿La reabres o creas la tarea suelta
            relacionada?
          </DialogTitle>
          <DialogDescription className="sr-only">Elige cómo agregar el trabajo nuevo.</DialogDescription>
        </DialogHeader>
        <button
          type="button"
          disabled={!manager}
          onClick={onReopenAndAdd}
          className="flex items-start gap-3 rounded-xl border bg-card p-3.5 text-left outline-none hover:border-dash focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55"
        >
          <StateIcon group="STARTED" color="var(--started)" className="mt-0.5" />
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 text-sm font-semibold">
              Reabrir y agregar
              <span className="rounded-md bg-muted px-1.5 font-mono text-[10px] font-normal text-muted-foreground">solo PM</span>
            </span>
            <span className="text-[13px] text-muted-foreground">La historia vuelve a In Progress y queda anotado en la actividad.</span>
          </span>
        </button>
        <button
          type="button"
          autoFocus
          onClick={onCreateRelated}
          className="flex items-start gap-3 rounded-xl border border-ring/60 bg-accent-soft p-3.5 text-left outline-none hover:border-ring focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Link2 className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden="true" />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">Crear tarea relacionada</span>
            <span className="text-[13px] text-muted-foreground">
              La historia sigue cerrada. La tarea va suelta, con el vínculo «relacionada con {story.code}».
            </span>
          </span>
        </button>
        {!manager && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Lock className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            Solo el project manager cierra y reabre la historia.
          </p>
        )}
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Agregar trabajo a una historia: abre «Nueva tarea» con la historia como padre; si está cerrada, pregunta antes
 * (reabrir y agregar, o crear la tarea suelta relacionada). Un bug se liga directo, sin reabrirla.
 * Devuelve `addTask()`, `reportBug()` y los diálogos para pintar.
 */
export function useAddToStory({ slug, project, story }) {
  const manager = useManager(slug)
  const [asking, setAsking] = useState(false)
  const [create, setCreate] = useState(null)
  const closed = story ? storyFlags(story).closed : false
  const parent = story ? { parentId: story.id, parentCode: story.code, parentType: 'STORY' } : {}

  const addTask = () => (closed ? setAsking(true) : setCreate({ ...parent, type: 'TASK' }))
  const reportBug = () => setCreate({ ...parent, templateType: 'BUG' })

  const dialogs = story ? (
    <>
      <ClosedStoryDialog
        story={story}
        open={asking}
        onOpenChange={setAsking}
        manager={manager}
        onReopenAndAdd={() => {
          setAsking(false)
          setCreate({ ...parent, type: 'TASK', reopenParent: true })
        }}
        onCreateRelated={() => {
          setAsking(false)
          setCreate({ type: 'TASK', relatesToId: story.id, relatesToCode: story.code })
        }}
      />
      <CreateIssueDialog
        slug={slug}
        project={project}
        open={Boolean(create)}
        onOpenChange={(open) => !open && setCreate(null)}
        defaults={create ?? {}}
      />
    </>
  ) : null

  return { addTask, reportBug, dialogs }
}

/**
 * La historia de una tarea o un bug, sobre el título: «apareció en WEB-15 · Pantalla de perfil» (bugs) o «historia
 * WEB-15» con su progreso. En un bug abierto avisa que frena «lista para revisar».
 */
export function StoryParentCard({ slug, project, issue, onOpenIssue }) {
  const parent = issue.parent
  const enabled = parent?.type === 'STORY'
  const { data: story } = useIssue(slug, project.id, enabled ? parent.id : null)
  if (!enabled) return null
  const bug = typeOf(issue) === 'BUG'
  const flags = story ? storyFlags(story) : null
  const open = issue.state?.group !== 'COMPLETED' && issue.state?.group !== 'CANCELLED'
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => onOpenIssue(parent.id)}
        className="flex w-full flex-col gap-2 rounded-xl border border-l-[3px] border-l-ty-story bg-subtle px-3 py-2.5 text-left hover:bg-accent"
      >
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <TypeIcon type="STORY" size={14} />
          <span className="font-mono text-xs text-muted-foreground">{bug ? 'apareció en' : 'historia'}</span>
          <span className="font-mono text-xs font-semibold text-ty-story-text">{parent.code}</span>
          <span className="min-w-0 truncate font-medium">{parent.title}</span>
        </span>
        {story && (
          <span className="flex items-center gap-3">
            <StoryProgress story={story} compact className="flex-1" />
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
              {storyProgress(story).label}
              {flags.openBugs > 0 && ` · ${flags.openBugs} ${flags.openBugs === 1 ? 'bug abierto' : 'bugs abiertos'}`}
            </span>
          </span>
        )}
      </button>
      {bug && open && story && !flags.closed && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3" aria-hidden="true" />
          Mientras {issue.code} siga abierto, {parent.code} no queda lista para revisar.
        </p>
      )}
    </div>
  )
}
