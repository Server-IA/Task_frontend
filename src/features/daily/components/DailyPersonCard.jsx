import { UserAvatar } from '@/components/common/UserAvatar'
import { useSessionStore } from '@/stores/sessionStore'
import { DailyBlock, personBlocks, personMeta } from './DailyBlocks'

/**
 * Tarjeta de una persona en la vista general de la daily.
 * @param {{ person: import('@/api/types').DailyPerson, index: Map<string, import('@/api/types').IssueRef>,
 *           blocking?: { code: string, blockedCode: string, ownerName: string }[], onOpenIssue: (issueId: string) => void }} props
 */
export function DailyPersonCard({ person, index, blocking, onOpenIssue }) {
  const me = useSessionStore((state) => state.user?.id) === person.user?.id
  const blocks = personBlocks({ person, index, blocking, onOpenIssue })
  return (
    <article aria-label={person.user?.fullName} className="tf-enter flex min-w-0 flex-col gap-3 rounded-[18px] border bg-card px-4 py-3.5">
      <header className="flex items-center gap-2.5">
        <UserAvatar user={person.user} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">
            {person.user?.fullName}
            {me && <span className="font-normal text-muted-foreground"> · tú</span>}
          </span>
          <span className="block font-mono text-[11px] text-muted-foreground">{personMeta(person)}</span>
        </span>
      </header>
      {blocks.map((block) => (
        <DailyBlock key={block.key} block={block} />
      ))}
    </article>
  )
}
