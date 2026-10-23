import { useEffect, useState } from 'react'

/** Valor que solo se actualiza después de `delay` ms sin cambios (búsquedas mientras se escribe). */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
