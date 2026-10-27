import { cn } from '@/lib/utils'

export const STATE_GROUP_LABELS = {
  BACKLOG: 'Backlog',
  UNSTARTED: 'Sin empezar',
  STARTED: 'En curso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
}

/** Colores muy oscuros (luminancia relativa baja) que no se verían sobre el fondo oscuro. */
function isTooDark(hex) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex ?? '')
  if (!match) return false
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(match[1].slice(index, index + 2), 16) / 255)
  const channel = (value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b) < 0.05
}

/**
 * Ícono del estado según su grupo, con el color del estado (como en Plane):
 * Backlog = círculo punteado, Sin empezar = círculo vacío, En curso = medio lleno,
 * Completado = check, Cancelado = cruz.
 * @param {{ group: string, color?: string, className?: string }} props
 */
export function StateIcon({ group, color: stateColor = 'currentColor', className }) {
  // El color va en currentColor; en modo oscuro los colores casi negros se cambian por el gris del texto
  const common = {
    className: cn('size-4 shrink-0 text-(--state)', isTooDark(stateColor) && 'dark:text-muted-foreground', className),
    style: { '--state': stateColor },
    viewBox: '0 0 16 16',
    'aria-hidden': true,
  }
  const color = 'currentColor'
  switch (group) {
    case 'BACKLOG':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.25" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="2.2 2.2" />
        </svg>
      )
    case 'UNSTARTED':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.25" fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
      )
    case 'STARTED':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.25" fill="none" stroke={color} strokeWidth="1.5" />
          <path d="M8 3.5 A4.5 4.5 0 0 1 8 12.5 Z" fill={color} />
        </svg>
      )
    case 'COMPLETED':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="7" fill={color} />
          <path d="M5 8.2l2 2 4-4.2" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'CANCELLED':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="7" fill={color} />
          <path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.25" fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
      )
  }
}

/** @param {{ state: import('@/api/types').StateResponse, className?: string }} props */
export function StateBadge({ state, className }) {
  if (!state) return null
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 text-sm', className)}>
      <StateIcon group={state.group} color={state.color} />
      <span className="truncate">{state.name}</span>
    </span>
  )
}
