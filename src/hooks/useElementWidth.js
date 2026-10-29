import { useLayoutEffect, useState } from 'react'

/**
 * Ancho en píxeles de un elemento, actualizado cuando cambia de tamaño.
 * Los gráficos lo usan como ancho de su viewBox: así una unidad es un píxel y el texto no se encoge.
 * @param {React.RefObject<HTMLElement>} ref
 * @param {number} fallback ancho mientras no se ha medido
 */
export function useElementWidth(ref, fallback = 560) {
  const [width, setWidth] = useState(fallback)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return undefined
    const measure = () => {
      const next = Math.round(element.getBoundingClientRect().width)
      if (next > 0) setWidth(next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return width
}
