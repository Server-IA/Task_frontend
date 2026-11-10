import { UserAvatar } from '@/components/common/UserAvatar'
import { useSessionStore } from '@/stores/sessionStore'
import { personMeta } from '../daily'
import { DailyBlock, personBlocks } from './DailyBlocks'

/**
 * Tarjeta de una persona en la vista general de la daily: «3 tareas asignadas · 1 hecha» (del ciclo en curso)
 * y sus bloques Ayer, Hoy y Bloqueos.
 * @param {{ person: import('@/api/types').DailyPerson, cycle: import('@/api/types').DailyCycle | null,
 *           date: string, previousDate?: string, projectId: string,
 *           blocking?: { code: string, blockedCode: string, ownerName: string }[], onOpenIssue: (issueId: string) => void,
 *           sections?: { yesterday?: boolean, today?: boolean, blockers?: boolean } }} props
 */
export function DailyPersonCard({ person, cycle, date, previousDate, projectId, blocking, onOpenIssue, sections }) {
  const me = useSessionStore((state) => state.user?.id) === person.user?.id
  const blocks = personBlocks({ person, date, previousDate, projectId, blocking, onOpenIssue, sections })
  const open = person.openCount ?? 0
  return (
    <article aria-label={person.user?.fullName} className="tf-enter flex min-w-0 flex-col gap-3 rounded-[18px] border bg-card px-4 py-3.5">
      <header className="flex items-center gap-2.5">
        <UserAvatar user={person.user} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">
            {person.user?.fullName}
            {me && <span className="font-normal text-muted-foreground"> · tú</span>}
          </span>
          <span
            className="block truncate font-mono text-[11px] text-muted-foreground"
            title={cycle ? `En ${cycle.name} · ${open} ${open === 1 ? 'tarea abierta' : 'tareas abiertas'} en el proyecto` : undefined}
          >
            {personMeta(person, cycle)}
          </span>
        </span>
      </header>
      {/* Con pocas personas la tarjeta es ancha: los bloques van lado a lado en vez de dejar media tarjeta vacía */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] items-start gap-x-5 gap-y-3">
        {blocks.map((block) => (
          <DailyBlock key={block.key} block={block} />
        ))}
      </div>
    </article>
  )
}
