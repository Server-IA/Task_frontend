import { Check } from 'lucide-react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { t, tn } from '@/i18n'
import { stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/sessionStore'
import { personMeta } from '../daily'
import { DailyBlock, personBlocks } from './DailyBlocks'

/**
 * Tarjeta de una persona en la vista general de la daily: «3 tareas asignadas · 1 hecha» (del ciclo en curso)
 * y sus bloques Ayer, Hoy y Bloqueos.
 * @param {{ person: import('@/api/types').DailyPerson, cycle: import('@/api/types').DailyCycle | null,
 *           date: string, previousDate?: string, projectId: string,
 *           blocking?: { code: string, blockedCode: string, ownerName: string }[], onOpenIssue: (issueId: string) => void,
 *           sections?: { yesterday?: boolean, today?: boolean, blockers?: boolean }, index?: number,
 *           spoke?: boolean, onToggleSpoke?: () => void }} props
 *   `spoke` / `onToggleSpoke`: si ya habló en la ronda de hoy (la tarjeta se atenúa) y cómo marcarlo.
 */
export function DailyPersonCard({
  person,
  cycle,
  date,
  previousDate,
  projectId,
  blocking,
  onOpenIssue,
  sections,
  morph = false,
  index = 0,
  spoke = false,
  onToggleSpoke,
}) {
  const me = useSessionStore((state) => state.user?.id) === person.user?.id
  const blocks = personBlocks({ person, date, previousDate, projectId, blocking, onOpenIssue, sections })
  const open = person.openCount ?? 0
  return (
    <article
      aria-label={person.user?.fullName}
      // `morph`: la tarjeta desde la que crece la pantalla de «Presentar» (la página mide dónde está)
      data-daily-morph={morph ? '' : undefined}
      style={stagger(index, 50, 6)}
      className={cn(
        'tf-enter flex min-w-0 flex-col gap-3 rounded-[18px] border bg-card px-4 py-3.5 transition-[opacity,border-color] duration-300',
        spoke && 'border-ok/40 opacity-70 hover:opacity-100',
      )}
    >
      <header className="flex items-center gap-2.5">
        <UserAvatar user={person.user} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">
            {person.user?.fullName}
            {me && <span className="font-normal text-muted-foreground"> · {t('tú')}</span>}
          </span>
          <span
            className="block truncate font-mono text-[11px] text-muted-foreground"
            title={
              cycle
                ? tn(open, 'En {cycle} · {count} tarea abierta en el proyecto', 'En {cycle} · {count} tareas abiertas en el proyecto', { cycle: cycle.name })
                : undefined
            }
          >
            {personMeta(person, cycle)}
          </span>
        </span>
        {onToggleSpoke && (
          <button
            type="button"
            aria-pressed={spoke}
            onClick={onToggleSpoke}
            title={spoke ? t('Quitar la marca: todavía no habló') : t('Marcar que ya habló en la daily de hoy')}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring',
              spoke
                ? 'border-ok/40 bg-ok-soft text-ok'
                : 'border-dashed text-muted-foreground hover:border-ring hover:text-foreground',
            )}
          >
            <Check key={spoke ? 'si' : 'no'} className={cn('size-3.5', spoke && 'tf-pop')} strokeWidth={2.5} aria-hidden="true" />
            {spoke ? t('habló') : t('ya habló')}
          </button>
        )}
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
