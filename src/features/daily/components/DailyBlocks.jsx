import { Ban } from 'lucide-react'
import { StateIcon } from '@/components/common/StateIcon'
import { cn } from '@/lib/utils'
import { changeKind, changeLabel, firstName } from '../daily'

/** Color y peso de la nota bajo cada tarea. */
const TONES = {
  normal: 'font-normal text-muted-foreground',
  ok: 'font-semibold text-ok',
  late: 'font-semibold text-late',
}

/**
 * Los tres bloques de una persona: «Ayer» (tarea + qué cambió), «Hoy» (en curso o con fecha hasta hoy) y
 * «Bloqueos» (con las tareas que la bloquean). Cada tarea abre el panel lateral.
 * @param {{ person: import('@/api/types').DailyPerson, index: Map<string, import('@/api/types').IssueRef>,
 *           blocking?: { code: string, blockedCode: string, ownerName: string }[],
 *           onOpenIssue: (issueId: string) => void, size?: 'card' | 'focus' }} props
 */
export function personBlocks({ person, index, blocking = [], onOpenIssue, size = 'card' }) {
  const userId = person.user?.id
  const yesterday = (person.yesterday ?? []).map((entry) => ({
    key: `y-${entry.issue?.id}`,
    issue: entry.issue,
    note: changeLabel(entry.change),
    tone: changeKind(entry.change) === 'completed' ? 'ok' : 'normal',
  }))
  const today = (person.today ?? []).map((issue) => {
    const others = (issue.assignees ?? []).filter((user) => user.id !== userId)
    return {
      key: `t-${issue.id}`,
      issue,
      note: [issue.state?.name, others.length > 0 && `compartida con ${others.map(firstName).join(' y ')}`]
        .filter(Boolean)
        .join(' · '),
      tone: 'normal',
    }
  })
  const blockers = (person.blockers ?? []).map((blocker) => ({
    key: `b-${blocker.issue?.id}`,
    issue: blocker.issue,
    blockedBy: (blocker.blockedBy ?? []).map((by) => {
      const owners = (index.get(by.id)?.assignees ?? []).filter((user) => user.id !== userId)
      return { ...by, owner: owners.length > 0 ? owners.map(firstName).join(' y ') : null }
    }),
    tone: 'late',
  }))

  const blockingText =
    blocking.length > 0
      ? ` ${blocking.map((item) => `Su ${item.code} bloquea a ${item.blockedCode} de ${item.ownerName}`).join('. ')}.`
      : ''

  return [
    { key: 'yesterday', title: 'Ayer', items: yesterday, empty: 'Sin cambios registrados.' },
    { key: 'today', title: 'Hoy', items: today, empty: 'Nada en curso ni con fecha para hoy.' },
    {
      key: 'blockers',
      title: 'Bloqueos',
      items: blockers,
      empty: blocking.length > 0 ? `Nada lo bloquea.${blockingText}` : 'Sin bloqueos.',
      late: blockers.length > 0,
    },
  ].map((block) => ({ ...block, size, onOpenIssue }))
}

/** Un bloque («Ayer», «Hoy», «Bloqueos») con sus tareas o el texto de vacío. */
export function DailyBlock({ block, className, headingClassName }) {
  const focus = block.size === 'focus'
  return (
    <section className={cn('flex min-w-0 flex-col', focus ? 'gap-2' : 'gap-1.5', className)}>
      <h3
        className={cn(
          'flex items-center gap-1.5 font-mono font-semibold tracking-[0.08em] uppercase',
          focus ? 'text-xs' : 'text-[11px]',
          block.late ? 'text-late' : 'text-muted-foreground',
          headingClassName,
        )}
      >
        {block.late && <Ban className="size-3" strokeWidth={2.5} aria-hidden="true" />}
        {block.title}
        {block.items.length > 0 && <span className="font-normal">· {block.items.length}</span>}
      </h3>
      {block.items.length === 0 ? (
        <p className={cn('text-muted-foreground', focus ? 'text-[15px]' : 'text-[13px]')}>{block.empty}</p>
      ) : (
        <ul className={cn('flex flex-col', focus ? 'gap-2' : 'gap-1')}>
          {block.items.map((item) => (
            <DailyIssueItem key={item.key} item={item} size={block.size} onOpenIssue={block.onOpenIssue} />
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Tarea de la daily: estado, código, título y una nota (qué cambió, estado, bloqueada por…). Toda la fila abre
 * la tarea; los códigos de las tareas que la bloquean abren esas.
 */
function DailyIssueItem({ item, size, onOpenIssue }) {
  const focus = size === 'focus'
  const { issue } = item
  if (!issue) return null
  const blocked = Boolean(item.blockedBy)

  return (
    <li
      className={cn(
        'relative flex items-start gap-2 transition-colors duration-150',
        focus ? 'gap-2.5 rounded-xl border bg-card px-3 py-2.5 hover:border-dash' : 'rounded-[10px] px-2.25 py-1.75 hover:bg-subtle',
        blocked && 'bg-late-soft hover:bg-late-soft',
        blocked && focus && 'border-late/30 hover:border-late/50',
      )}
    >
      <StateIcon group={issue.state?.group} color={issue.state?.color} className={cn('mt-0.5', focus && 'mt-[3px]')} />
      <span className={cn('min-w-0 flex-1 leading-snug', focus ? 'text-base' : 'text-[13px]')}>
        <button
          type="button"
          onClick={() => onOpenIssue(issue.id)}
          title={`Abrir ${issue.code}`}
          className="text-left outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          <span className={cn('font-mono text-muted-foreground', focus ? 'text-[13px]' : 'text-xs')}>{issue.code}</span>{' '}
          <span className="break-words">{issue.title}</span>
        </button>
        {blocked ? (
          <span className={cn('mt-0.5 flex flex-wrap items-center gap-x-1', focus ? 'text-[13px]' : 'text-xs', TONES.late)}>
            <Ban className="size-3" strokeWidth={2.5} aria-hidden="true" />
            bloqueada por
            {item.blockedBy.map((by, index) => (
              <span key={by.id}>
                <button
                  type="button"
                  onClick={() => onOpenIssue(by.id)}
                  title={by.title}
                  className="relative z-10 rounded font-mono underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {by.code}
                </button>
                {by.owner && <span className="font-normal"> ({by.owner})</span>}
                {index < item.blockedBy.length - 1 && ','}
              </span>
            ))}
          </span>
        ) : (
          item.note && (
            <span className={cn('mt-0.5 block', focus ? 'text-[13px]' : 'text-xs', TONES[item.tone])}>{item.note}</span>
          )
        )}
      </span>
    </li>
  )
}

/** «2 ayer · 3 hoy · 1 bloqueo». */
export function personMeta(person) {
  const parts = [`${person.yesterday?.length ?? 0} ayer`, `${person.today?.length ?? 0} hoy`]
  const blockers = person.blockers?.length ?? 0
  if (blockers > 0) parts.push(`${blockers} ${blockers === 1 ? 'bloqueo' : 'bloqueos'}`)
  return parts.join(' · ')
}
