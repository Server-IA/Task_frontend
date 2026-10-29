import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const SIZES = {
  xs: 'size-5 text-[10px]',
  sm: 'size-6 text-[11px]',
  md: 'size-8 text-xs',
  lg: 'size-12 text-base',
  xl: 'size-20 text-2xl',
}

/** Paleta pastel para el fondo de las iniciales (texto oscuro); el color depende del nombre para que sea estable. */
const COLORS = [
  'bg-[#FFB8D2]',
  'bg-[#7FE0C4]',
  'bg-[#B6A6FF]',
  'bg-[#FFC145]',
  'bg-[#8CCBFF]',
  'bg-[#F6A35C]',
  'bg-[#9BE7B4]',
  'bg-[#E4CF9C]',
]

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

/** Clase de color del avatar para un nombre (la misma en toda la app). */
export function avatarColor(name = '') {
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
      <AvatarFallback className={cn('font-bold text-[#23201B]', avatarColor(name))}>{initials(name)}</AvatarFallback>
    </Avatar>
  )
}
