import { useEffect, useState } from 'react'
import { canAnimate } from '@/lib/intro'
import { cn } from '@/lib/utils'

/**
 * Un valor que hace un pulso cuando cambia (el contador de una columna del tablero, la insignia de la bandeja). La
 * primera vez que se pinta no se anima: solo los cambios. Mientras el valor no se conoce (`undefined`, por ejemplo
 * cargando) tampoco: conocerlo no es un cambio. Con `show` en falso no pinta nada, pero sigue recordando el valor,
 * así lo que aparece por un cambio (la insignia que pasa de cero a uno) sí hace el pulso. Con `hold` el valor se
 * muestra al día pero sin pulso (mientras se arrastra una tarjeta por el tablero); al soltarlo hace uno solo, si el
 * valor quedó distinto del que había.
 * @param {{ value: unknown, show?: boolean, hold?: boolean, className?: string, children?: React.ReactNode }} props
 */
export function PulseOnChange({ value, show = true, hold = false, className, children }) {
  const [last, setLast] = useState(value)
  const [beat, setBeat] = useState(0)
  if (!hold && value !== last) {
    setLast(value)
    if (last !== undefined) setBeat((count) => count + 1)
  }
  if (!show) return null
  return (
    // La clave cambia con cada pulso: el elemento se vuelve a montar y la animación arranca de nuevo
    <span key={beat} className={cn('inline-block', className, beat > 0 && 'tf-pulse')}>
      {children ?? value}
    </span>
  )
}

/**
 * Un número que, con `animate`, cuenta hacia arriba hasta `value` (arranca cerca de la mitad, para no mostrar un cero
 * de paso). Sin `animate`, o si la persona pidió menos movimiento, es el número y ya.
 * @param {{ value: number, animate?: boolean, duration?: number }} props
 */
export function CountUp({ value, animate: wanted = false, duration = 800 }) {
  const animate = wanted && canAnimate()
  // La cuenta arranca en el mismo render en que se pide: si esperara al efecto, se vería el valor final un instante
  const [progress, setProgress] = useState(animate ? 0 : 1)
  const [wasAnimating, setWasAnimating] = useState(animate)
  if (animate !== wasAnimating) {
    setWasAnimating(animate)
    setProgress(animate ? 0 : 1)
  }
  useEffect(() => {
    if (!animate) return undefined
    let frame
    const start = performance.now()
    const tick = (now) => {
      // La marca de tiempo del cuadro puede ser anterior al arranque: sin el tope de abajo la cuenta retrocedería
      const next = Math.max(0, Math.min(1, (now - start) / duration))
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
