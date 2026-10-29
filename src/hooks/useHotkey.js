import { useEffect } from 'react'

const isTyping = (target) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/** Menús y selects de Radix usan las letras para saltar a una opción (typeahead). */
const POPUP_ROLES = '[role="menu"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="listbox"],[role="option"],[role="combobox"]'
const OPEN_POPUP = '[role="menu"][data-state="open"],[role="listbox"][data-state="open"]'

const isInPopup = (target) =>
  (target instanceof Element && target.closest(POPUP_ROLES) !== null) || document.querySelector(OPEN_POPUP) !== null

/**
 * Atajo de una tecla (p. ej. «c» para crear una tarea). Se ignora mientras se escribe en un campo, con un
 * diálogo abierto o dentro de un menú o select (ahí la letra elige una opción).
 */
export function useHotkey(key, handler, { enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) return undefined
    const onKeyDown = (event) => {
      if (event.key.toLowerCase() !== key || event.ctrlKey || event.metaKey || event.altKey) return
      if (event.defaultPrevented || isTyping(event.target) || isInPopup(event.target)) return
      if (document.querySelector('[role="dialog"]')) return
      event.preventDefault()
      handler()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key, handler, enabled])
}
