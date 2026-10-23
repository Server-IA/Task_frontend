import { cn } from '@/lib/utils'

/** @param {{ label: import('@/api/types').LabelResponse, className?: string }} props */
export function LabelChip({ label, className }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 max-w-40 items-center gap-1.5 rounded-full border px-2 text-xs text-foreground/90',
        className,
      )}
    >
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
      <span className="truncate">{label.name}</span>
    </span>
  )
}

export function ColorDot({ color, className }) {
  return <span className={cn('size-2.5 shrink-0 rounded-full', className)} style={{ backgroundColor: color }} />
}
