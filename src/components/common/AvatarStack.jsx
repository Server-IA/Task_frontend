import { UserAvatar } from '@/components/common/UserAvatar'
import { cn } from '@/lib/utils'

/**
 * Avatares superpuestos (asignados). Muestra «+N» si hay más de `max`. `total` sirve cuando `users` es solo una
 * muestra (por ejemplo los primeros miembros de un proyecto): el «+N» cuenta hasta `total`.
 */
export function AvatarStack({ users = [], total, max = 3, size = 'sm', className }) {
  const visible = users.slice(0, max)
  const rest = Math.max(total ?? users.length, users.length) - visible.length
  return (
    <span className={cn('flex items-center -space-x-1.5', className)}>
      {visible.map((user) => (
        <UserAvatar key={user.id} user={user} size={size} className="ring-2 ring-card" />
      ))}
      {rest > 0 && (
        <span className="flex size-6 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-medium ring-2 ring-card">
          +{rest}
        </span>
      )}
    </span>
  )
}
