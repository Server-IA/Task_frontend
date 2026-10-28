import { UserAvatar } from '@/components/common/UserAvatar'
import { useSessionStore } from '@/stores/sessionStore'
import { personMeta } from '../daily'
import { DailyBlock, personBlocks } from './DailyBlocks'

/**
 * Tarjeta de una persona en la vista general de la daily: «3 tareas asignadas · 1 hecha» (del ciclo en curso)
 * y sus bloques Ayer, Hoy y Bloqueos.
 * @param {{ person: import('@/api/types').DailyPerson, cycle: import('@/api/types').DailyCycle | null,
 *           date: string, projectId: string,
 *           blocking?: { code: string, blockedCode: string, ownerName: string }[], onOpenIssue: (issueId: string) => void }} props
 */
export function DailyPersonCard({ person, cycle, date, projectId, blocking, onOpenIssue }) {
  const me = useSessionStore((state) => state.user?.id) === person.user?.id
  const blocks = personBlocks({ person, date, projectId, blocking, onOpenIssue })
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
      {blocks.map((block) => (
        <DailyBlock key={block.key} block={block} />
      ))}
    </article>
  )
}
