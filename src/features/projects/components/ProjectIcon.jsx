import { cn } from '@/lib/utils'

/**
 * Pastilla con el identificador del proyecto en monoespaciada («WEB») y su color (ver «Colores de proyecto» en
 * `globals.css`). `soft`: la versión suave de las tarjetas de Proyectos, distinta en el tema claro y el oscuro.
 * Sin color (por ejemplo, de una tarea cuyo proyecto no se conoce) queda neutra.
 * @param {{ project?: { identifier?: string, color?: string | null } | null, variant?: 'solid' | 'soft',
 *           className?: string }} props
 */
export function ProjectIcon({ project, variant = 'solid', className }) {
  return (
    <span
      data-project-color={project?.color ?? ''}
      className={cn(
        'inline-flex h-5 shrink-0 items-center justify-center rounded-[5px] px-1.5 font-mono text-[10px] font-semibold',
        variant === 'soft' ? 'bg-(--project-soft) text-(--project-soft-ink)' : 'bg-(--project) text-(--project-ink)',
        className,
      )}
    >
      {/* En su propio span para que `truncate` (con un `max-w-*` desde afuera) ponga los puntos suspensivos */}
      <span className="min-w-0 truncate">{project?.identifier ?? '?'}</span>
    </span>
  )
}
