import { useLayoutEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Coloca el indicador sobre el elemento activo dentro de `container` y lo mueve con transición.
 * La primera vez se coloca sin animar; también se recoloca si cambian los tamaños (p. ej. al cargar la fuente).
 * @param {React.RefObject<HTMLElement>} containerRef
 * @param {React.RefObject<HTMLElement>} thumbRef
 * @param {string} activeSelector selector del elemento activo dentro del contenedor
 * @param {unknown} activeKey cambia cuando cambia el activo
 */
export function useSlidingThumb(containerRef, thumbRef, activeSelector, activeKey) {
  useLayoutEffect(() => {
    const container = containerRef.current
    const thumb = thumbRef.current
    if (!container || !thumb) return undefined

    const place = () => {
      const active = container.querySelector(activeSelector)
      if (!active) {
        thumb.style.opacity = '0'
        return
      }
      thumb.style.opacity = '1'
      thumb.style.width = `${active.offsetWidth}px`
      thumb.style.height = `${active.offsetHeight}px`
      thumb.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`
    }

    place()
    // Animar solo después de la primera colocación
    const frame = requestAnimationFrame(() => thumb.setAttribute('data-ready', ''))
    const observer = new ResizeObserver(place)
    observer.observe(container)
    for (const child of container.children) if (child !== thumb) observer.observe(child)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [containerRef, thumbRef, activeSelector, activeKey])
}

/** Fondo crema que se desliza detrás de la opción activa. */
export function SlidingThumb({ thumbRef, className }) {
  return (
    <span
      ref={thumbRef}
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute top-0 left-0 rounded-full bg-accent-soft opacity-0',
        'data-[ready]:transition-[transform,width,height,opacity] data-[ready]:duration-300 data-[ready]:ease-[cubic-bezier(0.22,1,0.36,1)]',
        className,
      )}
    />
  )
}

/**
 * Selector de opciones como pastillas («Lista | Tablero»), con el fondo de la activa deslizándose.
 * @param {{ options: { value: string, label: React.ReactNode }[], value: string, onChange: (value: string) => void,
 *           label: string, size?: 'sm' | 'md', className?: string, itemClassName?: string, thumbClassName?: string }} props
 */
export function Segmented({ options, value, onChange, label, size = 'md', className, itemClassName, thumbClassName }) {
  const containerRef = useRef(null)
  const thumbRef = useRef(null)
  useSlidingThumb(containerRef, thumbRef, '[aria-pressed="true"]', value)

  return (
    <div role="group" aria-label={label} className={cn('relative flex rounded-full border p-[3px]', className)}>
      <div ref={containerRef} className="relative flex flex-1">
        <SlidingThumb thumbRef={thumbRef} className={thumbClassName} />
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={cn(
                'relative rounded-full font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground',
                size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3.5 py-1.5 text-sm',
                active && 'font-semibold text-accent-text hover:text-accent-text',
                itemClassName,
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
