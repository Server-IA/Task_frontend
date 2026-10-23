import { useCallback, useEffect, useState } from 'react'

/**
 * Cuenta regresiva en segundos. Se usa para deshabilitar un botón después de un 429
 * (el backend indica cuánto esperar con la cabecera Retry-After).
 */
export function useCooldown() {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (secondsLeft <= 0) return undefined
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  const start = useCallback((seconds) => setSecondsLeft(Math.max(0, Math.ceil(seconds))), [])

  return { secondsLeft, active: secondsLeft > 0, start }
}
