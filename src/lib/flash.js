import { flushSync } from 'react-dom'
import { create } from 'zustand'
import { canAnimate } from './intro'

/**
 * Marcas de corta vida para animar UNA cosa concreta justo después de una acción: la tarjeta que se acaba de soltar en
 * el tablero (`settled`), la tarea recién creada (`created`) y el ciclo recién cerrado (`closedCycle`). Quien pinta esa
 * cosa pregunta con `useFlash` y se anima solo mientras dura la marca; el resto de la pantalla no se entera.
 */
export const useFlashStore = create(() => ({ settled: null, created: null, closedCycle: null }))

const timers = {}

/** Marca `id` durante `ms` milisegundos (una marca nueva del mismo tipo reemplaza a la anterior). */
export function flash(kind, id, ms = 1500) {
  useFlashStore.setState({ [kind]: id })
  clearTimeout(timers[kind])
  timers[kind] = setTimeout(() => useFlashStore.setState({ [kind]: null }), ms)
}

/** Si `id` es lo que se acaba de marcar. */
export const useFlash = (kind, id) => useFlashStore((state) => id != null && state[kind] === id)

/**
 * Una caja «fantasma» que va desde `from` (el lugar de lo que se cierra, por ejemplo un diálogo) hasta el elemento que
 * cumpla `selector`, encogiéndose hasta su tamaño. Espera hasta `wait` ms a que ese elemento aparezca y esté a la
 * vista; si no llega, no pasa nada.
 * @param {DOMRect | null | undefined} from
 * @param {string} selector
 */
export function flyGhost(from, selector, { wait = 1600 } = {}) {
  if (!canAnimate() || !from || from.width === 0) return
  const started = performance.now()
  const tick = () => {
    const to = document.querySelector(selector)?.getBoundingClientRect()
    if (to && to.width > 0 && to.bottom > 0 && to.top < window.innerHeight) {
      const ghost = document.createElement('div')
      ghost.className = 'tf-ghost'
      ghost.setAttribute('aria-hidden', 'true')
      document.body.append(ghost)
      const box = (rect, radius, opacity) => ({
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        borderRadius: radius,
        opacity,
      })
      const animation = ghost.animate([box(from, '22px', 0.9), box(to, '8px', 0.2)], {
        duration: 420,
        easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
        fill: 'forwards',
      })
      const remove = () => ghost.remove()
      animation.finished.then(remove, remove)
      return
    }
    if (performance.now() - started < wait) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

/**
 * Aplica un cambio de estado de React como una transición de vista del navegador: lo que tenga el mismo
 * `view-transition-name` antes y después se transforma de una forma a la otra (la tarjeta que crece en «Presentar»).
 * Sin soporte, o con «menos movimiento», el cambio se aplica sin más.
 * @param {() => void} change
 * @returns {Promise<void>} cuando terminó la transición (o enseguida, si no la hubo)
 */
export function withViewTransition(change) {
  if (!canAnimate() || typeof document.startViewTransition !== 'function') {
    change()
    return Promise.resolve()
  }
  const transition = document.startViewTransition(() => flushSync(change))
  return transition.finished.catch(() => {})
}
