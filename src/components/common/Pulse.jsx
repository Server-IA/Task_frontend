import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Un valor que hace un pulso cuando cambia (el contador de una columna del tablero, la insignia de la bandeja). La
 * primera vez que se pinta no se anima: solo los cambios.
 * @param {{ value: unknown, className?: string, children?: React.ReactNode }} props
 */
export function PulseOnChange({ value, className, children }) {
  const [last, setLast] = useState(value)
  const [beat, setBeat] = useState(0)
  if (value !== last) {
    setLast(value)
    setBeat((count) => count + 1)
  }
  return (
    // La clave cambia con cada pulso: el elemento se vuelve a montar y la animación arranca de nuevo
    <span key={beat} className={cn('inline-block', className, beat > 0 && 'tf-pulse')}>
      {children ?? value}
    </span>
  )
}

/**
 * Un número que, con `animate`, cuenta hacia arriba hasta `value` (arranca cerca de la mitad, para no mostrar un cero
 * de paso). Sin `animate` es el número y ya.
 * @param {{ value: number, animate?: boolean, duration?: number }} props
 */
export function CountUp({ value, animate = false, duration = 800 }) {
  const [progress, setProgress] = useState(1)
  useEffect(() => {
    if (!animate) return undefined
    let frame
    const start = performance.now()
    const tick = (now) => {
      const next = Math.min(1, (now - start) / duration)
      setProgress(next)
      if (next < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [animate, duration])

  if (!animate || progress >= 1) return value
  const from = Math.ceil(value / 2)
  return Math.round(from + (value - from) * (1 - (1 - progress) ** 3))
}

/**
 * Texto que se tacha cuando `done` pasa a ser cierto mientras está en pantalla (el tachado aparece en vez de saltar).
 * Lo que ya estaba hecho al pintarse va tachado sin animación.
 * @param {{ done: boolean, className?: string, children: React.ReactNode }} props
 */
export function StrikeText({ done, className, children }) {
  const [last, setLast] = useState(done)
  const [justDone, setJustDone] = useState(false)
  if (done !== last) {
    setLast(done)
    setJustDone(Boolean(done))
  }
  return <span className={cn(className, done && (justDone ? 'tf-strike-in' : 'line-through'))}>{children}</span>
}
