import { useEffect, useState } from 'react'

/**
 * Si el elemento ya entró en pantalla alguna vez (no vuelve a false). Sirve para pedir datos de una tarjeta
 * solo cuando se ve. Sin IntersectionObserver (tests) cuenta como visible.
 * @param {React.RefObject<Element>} ref
 * @param {string} [rootMargin] margen para empezar a cargar un poco antes de que aparezca
 */
export function useInView(ref, rootMargin = '200px') {
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const element = ref.current
    if (seen || !element) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setSeen(true)
      },
      { rootMargin },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, rootMargin, seen])

  return seen
}
