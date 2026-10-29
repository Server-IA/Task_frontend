import { Clock3 } from 'lucide-react'
import { describeDueDate, formatShortDate } from '@/lib/dates'
import { cn } from '@/lib/utils'

/** Fondo y texto de la pastilla según el tono de la fecha límite (ver describeDueDate). */
export const DUE_TONES = {
  late: 'bg-late-soft text-late',
  soon: 'bg-soon-soft text-soon',
  normal: 'bg-muted text-muted-foreground',
}

/** Fecha límite en lenguaje humano como pastilla de solo lectura («mañana», «venció hace 2 días», «sin fecha»). */
export function DueChip({ value, closed = false, className }) {
  const info = value ? describeDueDate(value, { closed }) : { text: 'sin fecha', tone: 'normal' }
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium whitespace-nowrap',
        DUE_TONES[info.tone],
        className,
      )}
      title={value ? `Fecha límite: ${formatShortDate(value)}` : undefined}
    >
      {value && <Clock3 className="size-3" aria-hidden="true" />}
      {info.text}
    </span>
  )
}
