import { useRef } from 'react'

/** A dónde volver: el elemento enfocado o, si es una opción de un menú (que se cierra), el botón del menú. */
export function focusOrigin(element) {
  if (!element || element === document.body) return null
  const menu = element.closest('[role="menu"]')
  const trigger = menu?.getAttribute('aria-labelledby') ? document.getElementById(menu.getAttribute('aria-labelledby')) : null
  return trigger ?? element
}

/**
 * Antes de abrir una tarea con un clic en su fila o tarjeta: enfoca el control principal (el título), para que al
 * cerrar el panel el foco vuelva ahí y no al principio de la página (un clic en una zona no enfocable no mueve el foco).
 * @param {Element | null} container la fila o tarjeta (`event.currentTarget`)
 */
export function focusRowMain(container) {
  container?.querySelector('[data-row-main], [data-card-activator]')?.focus({ preventScroll: true })
}

export function isFocusable(element) {
  return Boolean(element?.isConnected) && !element.disabled && element.getAttribute('aria-hidden') !== 'true'
}

const OPEN_MODAL = '[role="dialog"][data-state="open"],[role="alertdialog"][data-state="open"]'
const ROW_MAIN = '[data-row-main], [data-card-activator]'

/**
 * Filas y tarjetas que había al abrirse un panel, y en qué lugar estaba lo que lo abrió (la última que queda antes
 * o en ese elemento). Sirve para volver a una vecina si esa fila ya no está al cerrarlo.
 */
function rowsAround(origin) {
  if (!origin) return null
  const rows = [...document.querySelectorAll(ROW_MAIN)]
  let index = -1
  rows.forEach((row, position) => {
    if (row === origin || row.compareDocumentPosition(origin) & Node.DOCUMENT_POSITION_FOLLOWING) index = position
  })
  return { rows, index }
}

/**
 * Lo que tenía el foco ya no está (la fila salió de la lista filtrada al cambiarla en el panel, o se partió la
 * historia de la pestaña «Sin partir»): la fila siguiente que sigue en pantalla, si no la anterior y, sin filas, el
 * contenido de la página. Nunca el `body`, donde con teclado se pierde el sitio.
 */
function fallbackTarget(around) {
  if (around && around.index >= 0) {
    const { rows, index } = around
    const next = rows.slice(index + 1).find(isFocusable) ?? rows.slice(0, index).reverse().find(isFocusable)
    if (next) return next
  }
  const main = document.querySelector('main')
  if (main && !main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1')
  return main
}

const focusLost = () => !document.activeElement || document.activeElement === document.body || !document.activeElement.isConnected

/**
 * Diálogos y paneles de la app se abren por estado (sin `Trigger` de Radix), así que al cerrarse Radix no sabe a
 * dónde devolver el foco y queda en el `body`: con teclado se pierde el sitio. Se recuerda lo que tenía el foco al
 * abrirse y se vuelve ahí, salvo que quien lo usa ya decidiera otra cosa (`preventDefault` en su manejador) o que
 * otro diálogo siga abierto (por ejemplo, el panel de la tarea que se abrió desde la paleta).
 *
 * Si un campo con `autoFocus` toma el foco al montarse, Radix no avisa con `onOpenAutoFocus`: el origen es entonces
 * de dónde vino ese primer foco (`relatedTarget`).
 */
export function useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus, onFocusCapture } = {}) {
  const origin = useRef(null)
  const around = useRef(null)
  const entered = useRef(false)
  const remember = (element) => {
    origin.current = element
    around.current = rowsAround(element)
  }
  return {
    onOpenAutoFocus: (event) => {
      if (!entered.current) {
        entered.current = true
        // Todavía no se movió el foco: es el elemento que abrió el diálogo
        remember(focusOrigin(document.activeElement))
      }
      onOpenAutoFocus?.(event)
    },
    onFocusCapture: (event) => {
      if (!entered.current) {
        entered.current = true
        const from = event.relatedTarget
        remember(from instanceof Element && !event.currentTarget.contains(from) ? focusOrigin(from) : null)
      }
      onFocusCapture?.(event)
    },
    onCloseAutoFocus: (event) => {
      const recorded = origin.current
      const rows = around.current
      origin.current = null
      around.current = null
      entered.current = false
      onCloseAutoFocus?.(event)
      if (event.defaultPrevented || !recorded) return
      // Si lo que lo abrió desapareció mientras estaba abierto, una fila vecina (solo si el foco no fue a otra parte)
      const target = isFocusable(recorded) ? recorded : !recorded.isConnected && focusLost() ? fallbackTarget(rows) : null
      if (!isFocusable(target)) return
      const otherOpen = [...document.querySelectorAll(OPEN_MODAL)].some((modal) => !modal.contains(target))
      if (otherOpen) return
      event.preventDefault()
      target.focus({ preventScroll: target.tagName === 'MAIN' })
    },
  }
}

/**
 * A dónde va el foco después de quitar una fila desde una confirmación (ConfirmDialog): el botón de la fila desaparece
 * y, sin esto, el foco cae al `body`. `done()` (en el `onSuccess`) elige el primero de `fallbacks` que se pueda enfocar
 * («Agregar», y si no está, el título); `start()` (al confirmar) lo limpia, así un intento fallido devuelve el foco a la
 * fila. `ref` va en `focusAfterConfirmRef` del diálogo.
 * @param {...React.RefObject<HTMLElement>} fallbacks
 */
export function useFocusAfterRemoval(...fallbacks) {
  const target = useRef(null)
  return {
    ref: target,
    start: () => {
      target.current = null
    },
    done: () => {
      target.current = fallbacks.map((ref) => ref.current).find(isFocusable) ?? null
    },
  }
}
