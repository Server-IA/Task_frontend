import { cn } from '@/lib/utils'

/**
 * Etiqueta como pastilla teñida con su color: fondo suave y texto del mismo tono mezclado con el de la página,
 * para que se lea en claro y en oscuro.
 * @param {{ label: import('@/api/types').LabelResponse, className?: string }} props
 */
export function LabelChip({ label, className }) {
  return (
    <span
      className={cn(
        'inline-flex h-5.5 max-w-40 items-center rounded-full px-2.5 text-xs font-medium',
        'bg-[color-mix(in_oklab,var(--label)_18%,transparent)] text-[color-mix(in_oklab,var(--label)_62%,var(--foreground))]',
        className,
      )}
      style={{ '--label': label.color }}
    >
      <span className="truncate">{label.name}</span>
    </span>
  )
}

export function ColorDot({ color, className }) {
  return <span className={cn('size-2.5 shrink-0 rounded-full', className)} style={{ backgroundColor: color }} />
}
