/**
 * Entrada escalonada: cada elemento de una lista empieza su animación (`tf-enter`, `tf-pop`…) un poco después del
 * anterior. Se corta en `max` para que una lista larga no tarde en aparecer.
 * @returns {{ animationDelay: string }} para el `style` del elemento
 */
export function stagger(index, step = 40, max = 8) {
  return { animationDelay: `${Math.min(index, max) * step}ms` }
}
