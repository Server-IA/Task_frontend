import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/common/UserAvatar'
import { cn } from '@/lib/utils'
import { firstName, personMeta, stepStatus } from '../daily'
import { DailyAgenda } from './DailyAgenda'
import { DailyBlock, personBlocks } from './DailyBlocks'

const STEP_LABEL = { done: 'lista', current: 'ahora', next: 'sigue', later: '' }

/**
 * Modo «Presentar»: una persona a la vez, con quién ya habló y quién sigue. Solo se ven los bloques que el proyecto
 * expone (`settings`) y, debajo de las personas, los puntos a tratar. ← → cambian de persona y Esc sale (los atajos
 * los pone la página).
 * @param {{ people: import('@/api/types').DailyPerson[], current: number, onSelect: (index: number) => void,
 *           onExit: () => void, cycle: import('@/api/types').DailyCycle | null, date: string, previousDate?: string,
 *           projectId: string,
 *           blocking: Map<string, { code: string, blockedCode: string, ownerName: string }[]>,
 *           onOpenIssue: (issueId: string) => void, settings?: import('@/api/types').DailySettings }} props
 */
export function DailyPresenter({
  settings,
  people,
  current,
  onSelect,
  onExit,
  cycle,
  date,
  previousDate,
  projectId,
  blocking,
  onOpenIssue,
}) {
  const person = people[current]
  if (!person) return null
  const previous = people[current - 1]
  const next = people[current + 1]
  const blocks = personBlocks({
    person,
    date,
    previousDate,
    projectId,
    blocking: blocking.get(person.user?.id),
    onOpenIssue,
    size: 'focus',
    sections: settings?.sections,
  })

  return (
    <div className="tf-fade flex min-h-0 flex-1 flex-col gap-3.5">
      <nav aria-label="Personas" className="flex flex-wrap items-center gap-2">
        {people.map((item, position) => {
          const status = stepStatus(position, current)
          return (
            <button
              key={item.user?.id ?? position}
              type="button"
              aria-current={status === 'current' ? 'step' : undefined}
              onClick={() => onSelect(position)}
              className={cn(
                'flex items-center gap-2 rounded-full border bg-card py-1.5 pr-3.5 pl-1.5 text-sm font-medium transition-colors duration-150 outline-none hover:border-dash focus-visible:ring-2 focus-visible:ring-ring',
                status === 'current' && 'border-accent-text bg-accent-soft font-semibold text-accent-text hover:border-accent-text',
                status === 'done' && 'text-muted-foreground',
              )}
            >
              <UserAvatar user={item.user} size="sm" />
              {item.user?.fullName}
              {STEP_LABEL[status] && (
                <span className="font-mono text-[11px] font-normal text-muted-foreground">{STEP_LABEL[status]}</span>
              )}
            </button>
          )
        })}
      </nav>
      <DailyAgenda agenda={settings?.agenda} />

      <article
        key={person.user?.id ?? current}
        aria-label={person.user?.fullName}
        className="tf-fade flex flex-1 flex-col gap-4.5 rounded-[22px] border bg-card px-5 py-5 sm:px-6.5"
      >
        <header className="flex items-center gap-3.5">
          <UserAvatar user={person.user} size="lg" className="size-13 text-[17px]" />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[30px] leading-[1.1] font-extrabold tracking-[-0.01em] break-words">
              {person.user?.fullName}
            </span>
            <span className="block font-mono text-xs text-muted-foreground">
              {current + 1} de {people.length} · {personMeta(person, cycle, { long: true })}
            </span>
          </span>
        </header>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] items-start gap-4">
          {blocks.map((block) => (
            <DailyBlock key={block.key} block={block} className="rounded-2xl bg-subtle p-3.5" />
          ))}
        </div>
        <footer className="mt-auto flex flex-wrap items-center gap-2.5 pt-2">
          {previous && (
            <Button variant="outline" className="h-10 rounded-xl px-3.5" onClick={() => onSelect(current - 1)}>
              <ChevronLeft strokeWidth={2.5} />
              {firstName(previous.user)}
            </Button>
          )}
          <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
            <kbd className="text-foreground">← →</kbd> cambiar persona · <kbd className="text-foreground">esc</kbd> salir
          </span>
          <Button className="ml-auto h-10 rounded-xl px-3.5" onClick={next ? () => onSelect(current + 1) : onExit}>
            {next ? `Sigue ${next.user?.fullName}` : 'Terminar'}
            {next && <ChevronRight strokeWidth={2.5} />}
          </Button>
        </footer>
      </article>
    </div>
  )
}
