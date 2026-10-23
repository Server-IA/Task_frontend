import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const SIZES = {
  xs: 'size-5 text-[10px]',
  sm: 'size-6 text-[11px]',
  md: 'size-8 text-xs',
  lg: 'size-12 text-base',
  xl: 'size-20 text-2xl',
}

/** Paleta para el fondo de las iniciales; el color depende del nombre para que sea estable. */
const COLORS = [
  'bg-sky-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-orange-500',
]

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

function colorFor(name = '') {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return COLORS[Math.abs(hash) % COLORS.length]
}

/** @param {{ user?: import('@/api/types').UserSummary | null, size?: keyof SIZES, className?: string }} props */
export function UserAvatar({ user, size = 'md', className }) {
  const name = user?.fullName ?? ''
  return (
    <Avatar className={cn(SIZES[size], className)} title={name}>
      {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={name} />}
      <AvatarFallback className={cn('font-medium text-white', colorFor(name))}>{initials(name)}</AvatarFallback>
    </Avatar>
  )
}
