import { canAnimate } from '@/lib/intro'

/**
 * Entrar y salir de «Presentar». Un solo elemento y solo `transform` y `opacity` (lo que el navegador mueve sin volver
 * a pintar): la tarjeta grande crece desde donde estaba la tarjeta de la persona. Antes era una transición de vista
 * del navegador, que funde una foto de la tarjeta chica con otra de la grande: se veían las dos encimadas, con el
 * texto en dos tamaños, y la página entera fundiéndose detrás.
 */

/**
 * La tarjeta de «Presentar» (`node`, ya en pantalla) crece desde `origin`: el lugar de la tarjeta de esa persona en la
 * vista normal, medido antes de cambiar de vista. Sin `origin`, o con «menos movimiento», no hace nada.
 * @param {Element | null | undefined} node
 * @param {{ left: number, top: number, width: number } | null | undefined} origin
 */
export function growFrom(node, origin) {
  if (!node || !origin || !canAnimate()) return
  const rect = node.getBoundingClientRect()
  if (rect.width === 0) return
  // A escala pareja (no se deforma): del ancho de la tarjeta chica al suyo, sin pasar de un tercio para que no sea un punto
  const scale = Math.min(1, Math.max(0.34, origin.width / rect.width))
  node.animate(
    [
      { transformOrigin: '0 0', transform: `translate(${origin.left - rect.left}px, ${origin.top - rect.top}px) scale(${scale})`, opacity: 0 },
      { opacity: 1, offset: 0.4 },
      { transformOrigin: '0 0', transform: 'none', opacity: 1 },
    ],
    { duration: 340, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  )
}

/**
 * «Presentar» se va con un fundido corto antes de volver a la vista normal (cuyas tarjetas ya entran con su animación
 * de siempre). Devuelve `null` si no hay nada que animar: quien llama cambia de vista de una vez.
 * @param {Element | null | undefined} node
 * @returns {Promise<void> | null}
 */
export function fadeAway(node) {
  if (!node || !canAnimate()) return null
  const animation = node.animate(
    [
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: 'scale(0.985)' },
    ],
    { duration: 130, easing: 'ease-in', fill: 'forwards' },
  )
  return animation.finished.then(
    () => {},
    () => {},
  )
}
