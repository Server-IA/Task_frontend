import { cn } from '@/lib/utils'
import { PRIORITY_LABELS } from '../constants'

/** Colores por prioridad: barra llena, y fondo + texto de la pastilla. */
const STYLES = {
  URGENT: {
    fill: 'fill-[#D93025] dark:fill-[#E5484D]',
    chip: 'bg-[#FFE4E0] text-[#B3261E] dark:bg-[#3D1A17] dark:text-[#FF8A80]',
  },
  HIGH: {
    fill: 'fill-[#E8710A] dark:fill-[#F6A35C]',
    chip: 'bg-[#FFEBD9] text-[#A84E06] dark:bg-[#3A2614] dark:text-[#F6A35C]',
  },
  MEDIUM: {
    fill: 'fill-[#B08A3A] dark:fill-[#EAD9B0]',
    chip: 'bg-accent-soft text-accent-text',
  },
  LOW: { fill: 'fill-[#958E83] dark:fill-[#A59E93]', chip: 'text-muted-foreground' },
  NONE: { fill: '', chip: 'text-muted-foreground' },
}
const FILLED_BARS = { URGENT: 0, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 }
const EMPTY = 'fill-[#DAD5CB] dark:fill-[#45403A]'
const BARS = [
  { x: 3, y: 9, height: 4 },
  { x: 6.7, y: 6, height: 7 },
  { x: 10.4, y: 3, height: 10 },
]

/** Ícono de prioridad: tres barras ascendentes; urgente es un cuadro rojo con «!». */
export function PriorityIcon({ priority = 'NONE', className }) {
  const style = STYLES[priority] ?? STYLES.NONE
  const common = { viewBox: '0 0 16 16', className: cn('size-4 shrink-0', className), 'aria-label': PRIORITY_LABELS[priority] }

  if (priority === 'URGENT') {
    return (
      <svg {...common}>
        <rect x="0.5" y="0.5" width="15" height="15" rx="4" className={style.fill} />
        <path d="M7 3h2v6.5H7z M8 10.8a1.3 1.3 0 1 1 0 2.6a1.3 1.3 0 1 1 0-2.6z" fill="#FFFFFF" />
      </svg>
    )
  }
  const filled = FILLED_BARS[priority]
  return (
    <svg {...common}>
      {BARS.map((bar, index) => (
        <rect key={index} x={bar.x} y={bar.y} width="2.6" height={bar.height} rx="0.8" className={index < filled ? style.fill : EMPTY} />
      ))}
    </svg>
  )
}

/** Pastilla con el ícono y el nombre en minúscula («alta»), como en las tarjetas del tablero. */
export function PriorityChip({ priority = 'NONE', iconOnlyWhenEmpty = false, className }) {
  const style = STYLES[priority] ?? STYLES.NONE
  const label = PRIORITY_LABELS[priority] ?? ''
  // En espacios angostos (filas de la lista) «sin prioridad» no cabe: se deja solo el ícono
  const iconOnly = iconOnlyWhenEmpty && priority === 'NONE'
  return (
    <span
      title={`Prioridad ${label.toLowerCase()}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md py-0.5 font-mono text-[11.5px] font-semibold whitespace-nowrap',
        iconOnly ? 'px-1' : 'pr-2 pl-1',
        style.chip,
        className,
      )}
    >
      <PriorityIcon priority={priority} />
      {iconOnly ? <span className="sr-only">{label}</span> : label.toLowerCase()}
    </span>
  )
}
