import { useEffect } from 'react'

const isTyping = (target) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/** Atajo de una tecla (p. ej. «c» para crear issue). Se ignora mientras se escribe en un campo. */
export function useHotkey(key, handler, { enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) return undefined
    const onKeyDown = (event) => {
      if (event.key.toLowerCase() !== key || event.ctrlKey || event.metaKey || event.altKey) return
      if (isTyping(event.target) || document.querySelector('[role="dialog"]')) return
      event.preventDefault()
      handler()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key, handler, enabled])
}
