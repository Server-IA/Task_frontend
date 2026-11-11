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
      Object.assign(ghost.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` })
      document.body.append(ghost)
      // Solo transform y opacidad (el navegador la mueve sin recalcular la página): se traslada y se encoge hasta `to`
      const landed = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`
      const animation = ghost.animate(
        [
          { transformOrigin: '0 0', transform: 'none', opacity: 0.9 },
          { transformOrigin: '0 0', transform: landed, opacity: 0.2 },
        ],
        { duration: 420, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' },
      )
      const remove = () => ghost.remove()
      animation.finished.then(remove, remove)
      return
    }
    if (performance.now() - started < wait) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
