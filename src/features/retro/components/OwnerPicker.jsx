import { useState } from 'react'
import { Check, UserRoundX } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { UserAvatar } from '@/components/common/UserAvatar'
import { cn } from '@/lib/utils'

/**
 * Elegir el responsable de una acción entre los miembros del proyecto (o quitarlo).
 * `children` es el botón que abre la lista; se cierra al elegir.
 * @param {{ members: import('@/api/types').UserSummary[], value: string | null,
 *           onChange: (userId: string | null) => void, disabled?: boolean, children: React.ReactElement }} props
 */
export function OwnerPicker({ members, value, onChange, disabled = false, children }) {
  const [open, setOpen] = useState(false)
  const choose = (userId) => {
    setOpen(false)
    if (userId !== value) onChange(userId)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <CommandInput placeholder="Responsable…" />
          <CommandList>
            <CommandEmpty>Nadie con ese nombre en el proyecto</CommandEmpty>
            {value && (
              <CommandGroup>
                <CommandItem value="sin responsable quitar" onSelect={() => choose(null)}>
                  <UserRoundX className="size-4 text-muted-foreground" aria-hidden="true" />
                  Sin responsable
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Miembros del proyecto">
              {members.map((user) => (
                <CommandItem key={user.id} value={`${user.fullName} ${user.email ?? ''} ${user.id}`} onSelect={() => choose(user.id)}>
                  <UserAvatar user={user} size="xs" />
                  <span className="min-w-0 flex-1 truncate">{user.fullName}</span>
                  <Check className={cn('size-3.5', user.id === value ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Botón del responsable dentro del editor de una acción: «+ responsable» punteado o la persona elegida.
 * @param {{ owner: import('@/api/types').UserSummary | null, className?: string }} props
 */
export function OwnerButton({ owner, className, ...props }) {
  return (
    <button
      type="button"
      aria-label={owner ? `Responsable: ${owner.fullName}. Cambiar` : 'Elegir responsable'}
      className={cn(
        'inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-full text-xs transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60',
        owner
          ? 'border bg-card py-0.5 pr-2.5 pl-0.5 font-medium hover:border-dash'
          : 'border border-dashed border-dash px-2.5 text-muted-foreground hover:border-foreground/40 hover:text-foreground',
        className,
      )}
      {...props}
    >
      {owner ? (
        <>
          <UserAvatar user={owner} size="xs" />
          <span className="truncate">{owner.fullName}</span>
        </>
      ) : (
        '+ responsable'
      )}
    </button>
  )
}
