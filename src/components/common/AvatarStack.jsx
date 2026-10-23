import { UserAvatar } from '@/components/common/UserAvatar'
import { cn } from '@/lib/utils'

/** Avatares superpuestos (asignados). Muestra «+N» si hay más de `max`. */
export function AvatarStack({ users = [], max = 3, size = 'sm', className }) {
  const visible = users.slice(0, max)
  const rest = users.length - visible.length
  return (
    <span className={cn('flex items-center -space-x-1.5', className)}>
      {visible.map((user) => (
        <UserAvatar key={user.id} user={user} size={size} className="ring-2 ring-background" />
      ))}
      {rest > 0 && (
        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background">
          +{rest}
        </span>
      )}
    </span>
  )
}
