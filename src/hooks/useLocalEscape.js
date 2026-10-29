import { useEffect, useRef } from 'react'

/**
 * Escape con el foco dentro de `ref` (un campo, una lista de sugerencias) llama a `onEscape` y no sigue:
 * así no cierra también el panel lateral o el diálogo que lo contiene. Radix escucha Escape en `document`
 * en fase de captura; este listener va en `window`, que en la captura llega antes.
 * @param {React.RefObject<HTMLElement>} ref
 * @param {() => void} onEscape
 * @param {boolean} [enabled]
 */
export function useLocalEscape(ref, onEscape, enabled = true) {
  const handler = useRef(onEscape)
  useEffect(() => {
    handler.current = onEscape
  })

  useEffect(() => {
    if (!enabled) return undefined
    const onKeyDown = (event) => {
      if (event.key !== 'Escape' || !ref.current?.contains(event.target)) return
      event.stopPropagation()
      event.preventDefault()
      handler.current()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [ref, enabled])
}
