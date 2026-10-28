import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/common/UserAvatar'
import { cn } from '@/lib/utils'
import { firstName, formatTimer, PRESENT_SECONDS, stepStatus } from '../daily'
import { DailyBlock, personBlocks, personMeta } from './DailyBlocks'

const STEP_LABEL = { done: 'lista', current: 'ahora', next: 'sigue', later: '' }

/**
 * Modo «Presentar»: una persona a la vez, con quién ya habló y quién sigue, y un tiempo sugerido por
 * persona (solo visual). ← → cambian de persona y Esc sale (los atajos los pone la página).
 * @param {{ people: import('@/api/types').DailyPerson[], current: number, onSelect: (index: number) => void,
 *           onExit: () => void, index: Map<string, import('@/api/types').IssueRef>,
 *           blocking: Map<string, { code: string, blockedCode: string, ownerName: string }[]>,
 *           onOpenIssue: (issueId: string) => void, cycleName?: string }} props
 */
export function DailyPresenter({ people, current, onSelect, onExit, index, blocking, onOpenIssue }) {
  const person = people[current]
  if (!person) return null
  const previous = people[current - 1]
  const next = people[current + 1]
  const blocks = personBlocks({ person, index, blocking: blocking.get(person.user?.id), onOpenIssue, size: 'focus' })

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
        {/* La clave reinicia el tiempo al cambiar de persona */}
        <PresenterTimer key={current} />
      </nav>

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
              {current + 1} de {people.length} · {personMeta(person)}
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

/** Cuenta regresiva por persona («1:24 / 2:00 por persona»); pasado el tiempo sigue contando en rojo. */
function PresenterTimer() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [])
  const remaining = PRESENT_SECONDS - elapsed
  const over = remaining < 0

  return (
    <span
      role="timer"
      aria-live="off"
      aria-label={over ? `Tiempo excedido por ${formatTimer(remaining).slice(1)}` : `Quedan ${formatTimer(remaining)}`}
      className={cn(
        'ml-auto flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[13px] tabular-nums',
        over && 'border-late/40 bg-late-soft text-late',
      )}
    >
      <Timer className="size-3.5" aria-hidden="true" />
      {formatTimer(remaining)}
      <span className={cn('text-muted-foreground', over && 'text-late')}>/ {formatTimer(PRESENT_SECONDS)} por persona</span>
    </span>
  )
}
