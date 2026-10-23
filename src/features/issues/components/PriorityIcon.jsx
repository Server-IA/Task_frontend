import { cn } from '@/lib/utils'
import { PRIORITY_LABELS } from '../constants'

const BAR_COLORS = {
  HIGH: 'text-orange-500',
  MEDIUM: 'text-amber-500',
  LOW: 'text-sky-500',
}
const FILLED_BARS = { HIGH: 3, MEDIUM: 2, LOW: 1 }

/** Ícono de prioridad como en Plane: barras de señal; urgente = cuadro rojo con «!». */
export function PriorityIcon({ priority = 'NONE', className }) {
  const common = { viewBox: '0 0 16 16', className: cn('size-4 shrink-0', className), 'aria-label': PRIORITY_LABELS[priority] }

  if (priority === 'URGENT') {
    return (
      <svg {...common}>
        <rect x="1" y="1" width="14" height="14" rx="3" className="fill-red-500" />
        <path d="M8 4.5v4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8" cy="11.6" r="1" fill="white" />
      </svg>
    )
  }
  if (priority === 'NONE') {
    return (
      <svg {...common} className={cn(common.className, 'text-muted-foreground')}>
        <path d="M3 8h2M7 8h2M11 8h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  const filled = FILLED_BARS[priority]
  return (
    <svg {...common} className={cn(common.className, BAR_COLORS[priority])}>
      {[0, 1, 2].map((bar) => (
        <rect
          key={bar}
          x={2.5 + bar * 4}
          y={10 - bar * 3}
          width="3"
          height={4 + bar * 3}
          rx="1"
          fill="currentColor"
          opacity={bar < filled ? 1 : 0.25}
        />
      ))}
    </svg>
  )
}
