import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Command as CommandPrimitive } from 'cmdk'
import { ArrowRight, Ban, Info, Link2, Lock, X } from 'lucide-react'
import { Command, CommandItem, CommandList } from '@/components/ui/command'
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { StateIcon } from '@/components/common/StateIcon'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useIssues } from '@/features/issues/hooks'
import { blockedCount, joinCodes } from '@/features/issues/issueFlags'
import { ProjectIcon } from '@/features/projects/components/ProjectIcon'
import { useProjects } from '@/features/projects/hooks'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useLocalEscape } from '@/hooks/useLocalEscape'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useAddRelation, useRelations, useRemoveRelation, useWorkspaceIssueSearch } from '../hooks'
import { mergeCandidates, projectOf, relationTarget } from '../relationCandidates'

/** @typedef {import('@/api/types').IssueResponse} IssueResponse */
/** @typedef {import('@/api/types').IssueRelation} IssueRelation */

/** Tipos al agregar, en el orden del selector (la API habla desde esta tarea). */
const TYPES = [
  { value: 'BLOCKS', label: 'Bloquea' },
  { value: 'BLOCKED_BY', label: 'Bloqueada por' },
  { value: 'RELATES', label: 'Relacionada con' },
]

/** Grupos de la sección, en el orden en que se muestran. */
const GROUPS = [
  { key: 'blockedBy', label: 'Bloqueada por', icon: Ban },
  { key: 'blocks', label: 'Bloquea', icon: ArrowRight },
  { key: 'related', label: 'Relacionada con', icon: Link2 },
]

const isOpen = (issue) => issue?.state?.group !== 'COMPLETED' && issue?.state?.group !== 'CANCELLED'

/** Lo que bloquea a la tarea y sigue abierto. */
const openBlockers = (relations) => (relations?.blockedBy ?? []).filter((relation) => isOpen(relation.issue))

/**
 * Enlace a una tarea relacionada: en este proyecto la abre en el panel; en otro proyecto lleva a ese proyecto;
 * sin acceso a su proyecto no es un enlace.
 */
function RelatedLink({ relation, slug, projectId, onOpenIssue, className, title, children }) {
  const target = relationTarget(relation, { slug, projectId })
  if (target.kind === 'none') return <span className={className}>{children}</span>
  if (target.kind === 'link') {
    return (
      <Link to={target.to} className={className} title={title}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" className={cn('text-left', className)} title={title} onClick={() => onOpenIssue(relation.issue.id)}>
      {children}
    </button>
  )
}

/**
 * Aviso rojo sobre el título cuando otra tarea abierta la bloquea: a quién espera y un enlace para abrirla.
 * Los códigos vienen en la tarea (se ve enseguida); el título y el estado, de sus relaciones.
 * @param {{ slug: string, projectId: string, issue: IssueResponse, onOpenIssue: (id: string) => void }} props
 */
export function BlockedBanner({ slug, projectId, issue, onOpenIssue }) {
  const count = blockedCount(issue)
  const { data: relations } = useRelations(slug, projectId, issue.id, { enabled: count > 0 })
  if (count === 0) return null
  const blockers = relations ? openBlockers(relations) : []
  const codes = issue.blockedByCodes ?? []
  const code = (text) => <span className="font-mono text-[13px]">{text}</span>
  const linkProps = { slug, projectId, onOpenIssue }
  const single = blockers.length === 1 ? blockers[0] : null

  let text
  if (single) {
    const other = single.issue
    text =
      single.accessible === false ? (
        <>Espera a {code(other.code)}, de un proyecto al que no tienes acceso.</>
      ) : (
        <>
          Espera a {code(other.code)} {other.title}, que sigue en {other.state?.name}.
        </>
      )
  } else if (blockers.length > 1) {
    text = (
      <>
        Espera a{' '}
        {blockers.map((blocker, index) => (
          <span key={blocker.relationId}>
            {index > 0 && (index === blockers.length - 1 ? ' y ' : ', ')}
            <RelatedLink relation={blocker} {...linkProps} className="underline-offset-2 hover:underline">
              {code(blocker.issue.code)}
            </RelatedLink>
          </span>
        ))}
        , que siguen abiertas.
      </>
    )
  } else if (codes.length > 0) {
    text = (
      <>
        Espera a {code(joinCodes(codes))}
        {codes.length === 1 ? '.' : ', que siguen abiertas.'}
      </>
    )
  } else {
    text = `Espera a ${count} ${count === 1 ? 'tarea abierta' : 'tareas abiertas'}.`
  }

  return (
    <p role="status" className="tf-fade flex items-start gap-2.5 rounded-xl bg-late-soft px-3 py-2.5 text-sm text-late">
      <Ban className="mt-0.5 size-4 shrink-0" strokeWidth={2.3} aria-hidden="true" />
      <span className="min-w-0 flex-1 leading-relaxed">
        <strong className="font-semibold">Bloqueada.</strong> {text}
      </span>
      {single && single.accessible !== false && (
        <RelatedLink relation={single} {...linkProps} className="shrink-0 text-[13px] font-semibold underline-offset-2 hover:underline">
          Abrir {single.issue.code}
        </RelatedLink>
      )}
    </p>
  )
}

/**
 * Sección «Relaciones» del detalle: bloqueada por, bloquea y relacionada con, con quitar y agregar
 * (buscando en este proyecto y en los demás del workspace). Al hacer clic en una tarea de este proyecto se abre
 * en el panel; las de otro proyecto llevan a ese proyecto y las de un proyecto sin acceso muestran solo el código.
 * @param {{ slug: string, projectId: string, issue: IssueResponse, onOpenIssue: (id: string) => void }} props
 */
export function IssueRelations({ slug, projectId, issue, onOpenIssue }) {
  const { data: relations, isLoading } = useRelations(slug, projectId, issue.id)
  const remove = useRemoveRelation(slug, projectId, issue.id)
  const [adding, setAdding] = useState(false)
  const toggleRef = useRef(null)

  const groups = GROUPS.map((group) => ({ ...group, items: relations?.[group.key] ?? [] })).filter(
    (group) => group.items.length > 0,
  )
  const total = groups.reduce((sum, group) => sum + group.items.length, 0)
  const blockers = openBlockers(relations)
  const relatedIds = new Set(groups.flatMap((group) => group.items.map((relation) => relation.issue.id)))

  const handleRemove = (relation) =>
    remove.mutate(
      { relationId: relation.relationId, otherId: relation.issue.id, otherProjectId: relation.issue.project?.id },
      { onError: (error) => notifyError(error, 'No se pudo quitar la relación') },
    )

  return (
    <section aria-labelledby={`relations-${issue.id}`} className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <h2 id={`relations-${issue.id}`} className="text-sm font-semibold">
          Relaciones {total > 0 && <span className="font-mono text-xs font-normal text-muted-foreground">{total}</span>}
        </h2>
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={adding}
          onClick={() => setAdding((current) => !current)}
          className={cn(
            'ml-auto rounded-full border px-2.5 py-1 text-xs transition-colors duration-150',
            adding ? 'border-accent-text bg-accent-soft font-semibold text-accent-text' : 'hover:bg-accent',
          )}
        >
          + agregar relación
        </button>
      </div>

      {isLoading ? (
        <CenteredSpinner className="p-4" />
      ) : (
        groups.map((group) => {
          const Icon = group.icon
          const late = group.key === 'blockedBy' && blockers.length > 0
          return (
            <div key={group.key} className="flex flex-col gap-1.5">
              <p
                className={cn(
                  'flex items-center gap-1.5 font-mono text-[11px] tracking-[0.06em] uppercase',
                  late ? 'text-late' : 'text-muted-foreground',
                )}
              >
                <Icon className="size-3" strokeWidth={2.5} aria-hidden="true" />
                {group.label}
              </p>
              <ul className="overflow-hidden rounded-xl border">
                {group.items.map((relation, index) => (
                  <RelationRow
                    key={relation.relationId}
                    relation={relation}
                    first={index === 0}
                    slug={slug}
                    projectId={projectId}
                    onOpenIssue={onOpenIssue}
                    onRemove={() => handleRemove(relation)}
                  />
                ))}
              </ul>
            </div>
          )
        })
      )}

      {!isLoading && total === 0 && !adding && (
        <p className="rounded-xl border border-dashed border-dash px-3 py-3.5 text-center text-sm text-muted-foreground">
          Sin relaciones con otras tareas
        </p>
      )}

      {adding && (
        <RelationAdder
          slug={slug}
          projectId={projectId}
          issue={issue}
          relatedIds={relatedIds}
          onClose={() => {
            setAdding(false)
            // El foco vuelve al botón (si no, queda en el panel y se pierde el lugar)
            toggleRef.current?.focus()
          }}
        />
      )}

      {blockers.length > 0 && <UnblockNote issue={issue} blockers={blockers} />}
    </section>
  )
}

/**
 * Fila de una tarea relacionada. Las de otro proyecto llevan la pastilla de su proyecto; si no tengo acceso a ese
 * proyecto, solo se ve el código (sin título, estado ni asignados) y no es un enlace.
 * @param {{ relation: IssueRelation, first: boolean, slug: string, projectId: string,
 *           onOpenIssue: (id: string) => void, onRemove: () => void }} props
 */
function RelationRow({ relation, first, slug, projectId, onOpenIssue, onRemove }) {
  const other = relation.issue
  const accessible = relation.accessible !== false
  const external = Boolean(other.project?.id) && other.project.id !== projectId
  const assignee = other.assignees?.[0]
  const closed = !isOpen(other)

  return (
    <li className={cn('flex items-center gap-2.5 py-1.5 pr-1.5 pl-3 transition-colors duration-150 hover:bg-subtle', !first && 'border-t')}>
      {accessible ? (
        <StateIcon group={other.state?.group} color={other.state?.color} className="size-3.5" />
      ) : (
        <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
      {external && <ProjectIcon project={other.project} />}
      <span className="shrink-0 font-mono text-xs text-muted-foreground">{other.code}</span>
      {accessible ? (
        <RelatedLink
          relation={relation}
          slug={slug}
          projectId={projectId}
          onOpenIssue={onOpenIssue}
          title={external ? `Abrir ${other.code} en ${other.project.name ?? 'su proyecto'}` : `Abrir ${other.code}`}
          className={cn('min-w-0 flex-1 truncate text-sm font-medium hover:underline', closed && 'text-muted-foreground line-through')}
        >
          {other.title}
        </RelatedLink>
      ) : (
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title="No tienes acceso al proyecto de esta tarea">
          sin acceso{other.project?.name ? ` · ${other.project.name}` : ''}
        </span>
      )}
      {accessible && <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{other.state?.name}</span>}
      {accessible &&
        (assignee ? (
          <UserAvatar user={assignee} size="xs" className="size-5.5" />
        ) : (
          <span title="Sin asignar" aria-label="Sin asignar" className="size-5.5 shrink-0 rounded-full border border-dashed border-dash" />
        ))}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar relación con ${other.code}`}
        title="Quitar relación"
        className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </li>
  )
}

/** «Cuando WEB-2 se complete, WEB-15 deja de estar bloqueada y Ana recibe un aviso en su bandeja.» */
function UnblockNote({ issue, blockers }) {
  const codes = blockers.map((blocker) => blocker.issue.code)
  const who = (issue.assignees ?? []).map((user) => user.fullName.split(' ')[0])
  return (
    <p className="flex items-start gap-2 text-xs leading-normal text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>
        Cuando {joinCodes(codes)} {codes.length === 1 ? 'se complete' : 'se completen'}, {issue.code} deja de estar bloqueada
        {who.length > 0 ? ` y ${joinCodes(who)} ${who.length === 1 ? 'recibe' : 'reciben'} un aviso en su bandeja.` : '.'}
      </span>
    </p>
  )
}

/**
 * Recuadro para agregar una relación: tipo (Tab lo cambia), búsqueda de tareas de este proyecto y, al escribir,
 * de los demás proyectos del workspace (cada resultado con su proyecto). Enter agrega.
 * Queda abierto para agregar varias; Escape lo cierra sin cerrar el panel.
 */
function RelationAdder({ slug, projectId, issue, relatedIds, onClose }) {
  const ref = useRef(null)
  const [type, setType] = useState('BLOCKED_BY')
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search, 300)
  const add = useAddRelation(slug, projectId, issue.id)
  const local = useIssues(slug, projectId, { search: debounced || undefined, size: 20, sort: 'sequenceId,desc' })
  const global = useWorkspaceIssueSearch(slug, debounced)
  const { data: projects } = useProjects(slug)
  const projectsById = useMemo(() => new Map((projects ?? []).map((project) => [project.id, project])), [projects])
  const isFetching = local.isFetching || global.isFetching

  const candidates = mergeCandidates({
    projectIssues: local.data?.content,
    // Sin texto, solo las recientes de este proyecto (la búsqueda global necesita texto)
    workspaceIssues: debounced.trim() ? global.data : [],
    projectId,
    issueId: issue.id,
  })
  // Elegida con ↑ ↓; si no hay una (o ya no está en los resultados) va la primera que se puede agregar
  const [selected, setSelected] = useState('')
  const selectable = candidates.filter((candidate) => !relatedIds.has(candidate.id))
  const activeValue = selectable.some((candidate) => candidate.id === selected) ? selected : (selectable[0]?.id ?? '')
  useLocalEscape(ref, onClose)

  const cycleType = (step) => {
    const index = TYPES.findIndex((option) => option.value === type)
    setType(TYPES[(index + step + TYPES.length) % TYPES.length].value)
  }

  const choose = (candidate) => {
    if (add.isPending) return
    add.mutate(
      { type, otherId: candidate.id, otherProjectId: candidate.projectId },
      {
        onSuccess: () => setSearch(''),
        onError: (error) => notifyError(error, 'No se pudo agregar la relación'),
      },
    )
  }

  return (
    <div
      ref={ref}
      role="group"
      aria-label="Agregar relación"
      className="tf-pop flex flex-col overflow-hidden rounded-2xl border border-ring bg-card shadow-lg"
    >
      <div role="radiogroup" aria-label="Tipo de relación" className="flex gap-1 px-2.5 pt-2.5">
        {TYPES.map((option) => {
          const checked = option.value === type
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => setType(option.value)}
              className={cn(
                'flex-1 rounded-[9px] border px-2 py-1.5 text-xs font-medium transition-colors duration-150',
                checked ? 'border-accent-text bg-accent-soft font-semibold text-accent-text' : 'hover:bg-accent',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <Command shouldFilter={false} value={activeValue} onValueChange={setSelected} className="bg-transparent">
        <label className="m-2.5 flex items-center gap-2 rounded-[10px] border border-ring px-3 py-1.5 font-mono text-[13px] shadow-[0_0_0_3px_var(--accent-soft)]">
          <span aria-hidden="true" className="font-semibold text-accent-text">
            &gt;
          </span>
          <span className="sr-only">Buscar tarea para relacionar, en este proyecto o en otros del workspace</span>
          <CommandPrimitive.Input
            autoFocus
            value={search}
            onValueChange={setSearch}
            placeholder="buscar por título o WEB-12"
            className="min-w-0 flex-1 bg-transparent py-0.5 outline-none placeholder:text-muted-foreground"
            onKeyDown={(event) => {
              if (event.key === 'Tab') {
                event.preventDefault()
                cycleType(event.shiftKey ? -1 : 1)
              }
            }}
          />
          {(isFetching || add.isPending) && <Spinner className="size-3.5 text-muted-foreground" />}
        </label>
        <CommandList className="max-h-[260px] px-1.5 pb-1.5">
          {!isFetching && candidates.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">Ninguna tarea coincide</p>
          )}
          {candidates.map((candidate) => {
            const already = relatedIds.has(candidate.id)
            const project = projectOf(candidate, projectsById)
            return (
              <CommandItem
                key={candidate.id}
                value={candidate.id}
                disabled={already}
                onSelect={() => choose(candidate)}
                className="group gap-2.5 rounded-[10px] px-2.5 py-2 data-[disabled=true]:opacity-60 data-[selected=true]:bg-accent-soft"
              >
                <ProjectIcon project={project} className="min-w-10" />
                <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">{candidate.code}</span>
                <span className="min-w-0 flex-1 truncate font-medium" title={project.name ? `${candidate.title} · ${project.name}` : candidate.title}>
                  {candidate.title}
                </span>
                {already ? (
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">ya relacionada</span>
                ) : (
                  <span className="hidden font-mono text-[11px] text-muted-foreground group-data-[selected=true]:inline">↵</span>
                )}
              </CommandItem>
            )
          })}
        </CommandList>
      </Command>
      <p className="flex flex-wrap gap-3.5 border-t bg-subtle px-3 py-2 font-mono text-[11px] text-muted-foreground">
        <span>
          <kbd className="text-foreground">↑ ↓</kbd> elegir
        </span>
        <span>
          <kbd className="text-foreground">↵</kbd> agregar
        </span>
        <span>
          <kbd className="text-foreground">tab</kbd> cambiar tipo
        </span>
        <span>
          <kbd className="text-foreground">esc</kbd> cerrar
        </span>
      </p>
    </div>
  )
}
