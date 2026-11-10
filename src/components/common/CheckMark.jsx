import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Casilla de los menús donde se eligen varios valores (filtros, personas, tareas para agregar). Marcada va en crema
 * con el visto oscuro, igual en los dos temas: antes era un cuadro casi negro que en el tema claro pesaba demasiado.
 * Es solo visual (la fila que la contiene es la que se elige), por eso va oculta para los lectores de pantalla.
 */
export function CheckMark({ checked, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150',
        checked ? 'border-ring bg-primary text-primary-foreground' : 'border-dash bg-card',
        className,
      )}
    >
      {/* Con color propio: dentro de un CommandItem los íconos sin color se pintan grises */}
      {checked && <Check className="size-3 text-primary-foreground" strokeWidth={3} />}
    </span>
  )
}
