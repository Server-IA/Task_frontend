import { useRef } from 'react'

/** A dónde volver: el elemento enfocado o, si es una opción de un menú (que se cierra), el botón del menú. */
export function focusOrigin(element) {
  if (!element || element === document.body) return null
  const menu = element.closest('[role="menu"]')
  const trigger = menu?.getAttribute('aria-labelledby') ? document.getElementById(menu.getAttribute('aria-labelledby')) : null
  return trigger ?? element
}

export function isFocusable(element) {
  return Boolean(element?.isConnected) && !element.disabled && element.getAttribute('aria-hidden') !== 'true'
}

const OPEN_MODAL = '[role="dialog"][data-state="open"],[role="alertdialog"][data-state="open"]'

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
  const entered = useRef(false)
  return {
    onOpenAutoFocus: (event) => {
      if (!entered.current) {
        entered.current = true
        // Todavía no se movió el foco: es el elemento que abrió el diálogo
        origin.current = focusOrigin(document.activeElement)
      }
      onOpenAutoFocus?.(event)
    },
    onFocusCapture: (event) => {
      if (!entered.current) {
        entered.current = true
        const from = event.relatedTarget
        origin.current = from instanceof Element && !event.currentTarget.contains(from) ? focusOrigin(from) : null
      }
      onFocusCapture?.(event)
    },
    onCloseAutoFocus: (event) => {
      const target = origin.current
      origin.current = null
      entered.current = false
      onCloseAutoFocus?.(event)
      if (event.defaultPrevented || !isFocusable(target)) return
      const otherOpen = [...document.querySelectorAll(OPEN_MODAL)].some((modal) => !modal.contains(target))
      if (otherOpen) return
      event.preventDefault()
      target.focus()
    },
  }
}
