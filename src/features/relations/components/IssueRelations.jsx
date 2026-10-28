import { useRef, useState } from 'react'
import { Command as CommandPrimitive } from 'cmdk'
import { ArrowRight, Ban, Info, Link2, X } from 'lucide-react'
import { Command, CommandItem, CommandList } from '@/components/ui/command'
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { StateIcon } from '@/components/common/StateIcon'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useIssues } from '@/features/issues/hooks'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useLocalEscape } from '@/hooks/useLocalEscape'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useAddRelation, useRelations, useRemoveRelation } from '../hooks'

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
 * Aviso rojo sobre el título cuando otra tarea abierta la bloquea: a quién espera y un enlace para abrirla.
 * @param {{ slug: string, projectId: string, issue: IssueResponse, onOpenIssue: (id: string) => void }} props
 */
export function BlockedBanner({ slug, projectId, issue, onOpenIssue }) {
  const count = issue.blockedByCount ?? 0
  const { data: relations } = useRelations(slug, projectId, issue.id, { enabled: count > 0 })
  if (count === 0) return null
  const blockers = relations ? openBlockers(relations).map((relation) => relation.issue) : []
  const code = (blocker) => <span className="font-mono text-[13px]">{blocker.code}</span>

  return (
    <p role="status" className="tf-fade flex items-start gap-2.5 rounded-xl bg-late-soft px-3 py-2.5 text-sm text-late">
      <Ban className="mt-0.5 size-4 shrink-0" strokeWidth={2.3} aria-hidden="true" />
      <span className="min-w-0 flex-1 leading-relaxed">
        <strong className="font-semibold">Bloqueada.</strong>{' '}
        {blockers.length === 1 ? (
          <>
            Espera a {code(blockers[0])} {blockers[0].title}, que sigue en {blockers[0].state?.name}.
          </>
        ) : blockers.length > 1 ? (
          <>
            Espera a{' '}
            {blockers.map((blocker, index) => (
              <span key={blocker.id}>
                {index > 0 && (index === blockers.length - 1 ? ' y ' : ', ')}
                <button type="button" className="underline-offset-2 hover:underline" onClick={() => onOpenIssue(blocker.id)}>
                  {code(blocker)}
                </button>
              </span>
            ))}
            , que siguen abiertas.
          </>
        ) : (
          `Espera a ${count} ${count === 1 ? 'tarea abierta' : 'tareas abiertas'}.`
        )}
      </span>
      {blockers.length === 1 && (
        <button
          type="button"
          className="shrink-0 text-[13px] font-semibold underline-offset-2 hover:underline"
          onClick={() => onOpenIssue(blockers[0].id)}
        >
          Abrir {blockers[0].code}
        </button>
      )}
    </p>
  )
}

/**
 * Sección «Relaciones» del detalle: bloqueada por, bloquea y relacionada con, con quitar y agregar
 * (buscando entre las tareas del proyecto). Al hacer clic en una tarea se abre en el panel.
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
      { relationId: relation.relationId, otherId: relation.issue.id },
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
                    onOpen={() => onOpenIssue(relation.issue.id)}
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

/** @param {{ relation: IssueRelation, first: boolean, onOpen: () => void, onRemove: () => void }} props */
function RelationRow({ relation, first, onOpen, onRemove }) {
  const other = relation.issue
  const assignee = other.assignees?.[0]
  const closed = !isOpen(other)
  return (
    <li className={cn('flex items-center gap-2.5 py-1.5 pr-1.5 pl-3 transition-colors duration-150 hover:bg-subtle', !first && 'border-t')}>
      <StateIcon group={other.state?.group} color={other.state?.color} className="size-3.5" />
      <span className="shrink-0 font-mono text-xs text-muted-foreground">{other.code}</span>
      <button
        type="button"
        onClick={onOpen}
        className={cn('min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline', closed && 'text-muted-foreground line-through')}
        title={`Abrir ${other.code}`}
      >
        {other.title}
      </button>
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{other.state?.name}</span>
      {assignee ? (
        <UserAvatar user={assignee} size="xs" className="size-5.5" />
      ) : (
        <span
          title="Sin asignar"
          aria-label="Sin asignar"
          className="size-5.5 shrink-0 rounded-full border border-dashed border-dash"
        />
      )}
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
  const codes = blockers.map((blocker) => blocker.code)
  const who = (issue.assignees ?? []).map((user) => user.fullName.split(' ')[0])
  const list = (items) => (items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`)
  return (
    <p className="flex items-start gap-2 text-xs leading-normal text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>
        Cuando {list(codes)} {codes.length === 1 ? 'se complete' : 'se completen'}, {issue.code} deja de estar bloqueada
        {who.length > 0 ? ` y ${list(who)} ${who.length === 1 ? 'recibe' : 'reciben'} un aviso en su bandeja.` : '.'}
      </span>
    </p>
  )
}

/**
 * Recuadro para agregar una relación: tipo (Tab lo cambia), búsqueda de tareas del proyecto y Enter para agregar.
 * Queda abierto para agregar varias; Escape lo cierra sin cerrar el panel.
 */
function RelationAdder({ slug, projectId, issue, relatedIds, onClose }) {
  const ref = useRef(null)
  const [type, setType] = useState('BLOCKED_BY')
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search, 300)
  const add = useAddRelation(slug, projectId, issue.id)
  const { data, isFetching } = useIssues(slug, projectId, { search: debounced || undefined, size: 20, sort: 'sequenceId,desc' })
  const candidates = (data?.content ?? []).filter((candidate) => candidate.id !== issue.id)
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
      { type, otherId: candidate.id },
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
          <span className="sr-only">Buscar tarea para relacionar</span>
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
        <CommandList className="max-h-[240px] px-1.5 pb-1.5">
          {!isFetching && candidates.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">Ninguna tarea coincide</p>
          )}
          {candidates.map((candidate) => {
            const already = relatedIds.has(candidate.id)
            return (
              <CommandItem
                key={candidate.id}
                value={candidate.id}
                disabled={already}
                onSelect={() => choose(candidate)}
                className="group gap-2.5 rounded-[10px] px-2.5 py-2 data-[disabled=true]:opacity-60 data-[selected=true]:bg-accent-soft"
              >
                <StateIcon group={candidate.state?.group} color={candidate.state?.color} className="size-3.5" />
                <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">{candidate.code}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{candidate.title}</span>
                {already ? (
                  <span className="font-mono text-[11px] text-muted-foreground">ya relacionada</span>
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
