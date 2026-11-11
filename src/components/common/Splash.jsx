import { useState } from 'react'
import { markSplash, splashElapsed } from '@/lib/intro'
import { cn } from '@/lib/utils'

/**
 * El logo de carga, centrado en su contenedor: el cuadro aparece, el check se dibuja y termina en la flecha. Se dibuja
 * una vez por carga de la página: si ya estuvo a la vista (otra pantalla de carga, o la entrada del login que la
 * continúa), sigue donde iba en vez de empezar de nuevo.
 * @param {{ line?: boolean, markRef?: React.Ref<HTMLSpanElement>, className?: string }} props
 *   `line`: la línea de «cargando» bajo el logo. `markRef`: el logo, para moverlo (la entrada del login).
 */
export function SplashStage({ line = true, markRef, className }) {
  // Negativo: la animación arranca «ya empezada» lo que lleva el logo a la vista
  const [delay] = useState(() => {
    markSplash()
    return -Math.round(splashElapsed())
  })
  return (
    <div className={cn('absolute inset-0 flex items-center justify-center', className)} style={{ '--splash-delay': `${delay}ms` }}>
      <span ref={markRef} className="block size-28">
        <svg viewBox="0 0 32 32" className="tf-splash size-full" aria-hidden="true">
          {/* Igual que LogoMark: más claro y con borde en tema oscuro, para que se vea sobre el fondo */}
          <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" strokeWidth="1" className="fill-[#23201B] dark:fill-[#38332b] dark:stroke-[#5a5246]" />
          <path
            className="tf-splash-check"
            pathLength="1"
            d="M8.5 16.5l5 5L23.5 11"
            fill="none"
            stroke="#EAD9B0"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            className="tf-splash-arrow"
            pathLength="1"
            d="M17.5 11h6v6"
            fill="none"
            stroke="#EAD9B0"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-[calc(50%+84px)] h-1 w-36 overflow-hidden rounded-full bg-foreground/10 transition-opacity duration-150',
          !line && 'opacity-0',
        )}
      >
        <span className="tf-splash-line block h-full w-2/5 rounded-full bg-ring" />
      </span>
    </div>
  )
}
