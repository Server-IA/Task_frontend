import { cn } from '@/lib/utils'

/** Ícono de TaskFlow: un check que termina en flecha (tarea hecha que sigue avanzando). */
export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8 shrink-0', className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#23201B" />
      <path
        d="M8.5 16.5l5 5L23.5 11 M17.5 11h6v6"
        fill="none"
        stroke="#EAD9B0"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Logo({ className, withText = true }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {withText && <span className="font-display text-xl font-extrabold tracking-[-0.01em]">TaskFlow</span>}
    </span>
  )
}
