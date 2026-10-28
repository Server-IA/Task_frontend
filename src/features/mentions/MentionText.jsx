import { Fragment, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/sessionStore'
import { parseMentions } from './mentions'

/**
 * Texto con las menciones guardadas (`@[Nombre](id)`) resaltadas como «@Nombre». La mención a quien mira
 * va con el color de acento; las demás, en gris.
 * @param {{ body?: string | null }} props
 */
export function MentionText({ body }) {
  const currentUserId = useSessionStore((state) => state.user?.id)
  const segments = useMemo(() => parseMentions(body ?? ''), [body])
  return segments.map((segment, index) =>
    segment.type === 'text' ? (
      <Fragment key={index}>{segment.text}</Fragment>
    ) : (
      <MentionChip key={index} name={segment.name} me={Boolean(segment.userId) && segment.userId === currentUserId} />
    ),
  )
}

export function MentionChip({ name, me = false, className }) {
  return (
    <span
      className={cn(
        'rounded-md px-1 py-px font-semibold [box-decoration-break:clone]',
        me ? 'bg-accent-soft text-accent-text' : 'bg-muted text-foreground',
        className,
      )}
    >
      @{name}
    </span>
  )
}
