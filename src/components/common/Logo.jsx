import { cn } from '@/lib/utils'

export function Logo({ className, withText = true }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold', className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <path
          d="M9 16.5l4.5 4.5L23 11.5"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withText && <span className="text-lg tracking-tight">TaskFlow</span>}
    </span>
  )
}
