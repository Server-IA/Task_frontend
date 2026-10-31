import { cn } from '@/lib/utils'
import { fileBadge } from '../attachmentView'

/**
 * Insignia del tipo de archivo («PDF», «DOCX»): una hoja con la esquina doblada, del color de su tipo.
 * @param {{ name: string, className?: string }} props
 */
export function FileBadge({ name, className }) {
  const badge = fileBadge(name)
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative flex h-9 w-7.5 shrink-0 items-end justify-center overflow-hidden rounded-md pb-1.25 font-mono text-[8.5px] font-bold tracking-[0.02em]',
        badge.className,
        className,
      )}
    >
      {badge.label}
      <span className="absolute top-0 right-0 size-2.25 rounded-[0_6px_0_4px] bg-current opacity-20" />
    </span>
  )
}
