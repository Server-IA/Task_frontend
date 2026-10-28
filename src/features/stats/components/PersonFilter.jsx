import { Check, X } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { UserAvatar } from '@/components/common/UserAvatar'
import { cn } from '@/lib/utils'
import { toggleAssignee } from '../personFilter'

/**
 * «+ persona»: limita las estadísticas a las tareas asignadas a una o varias personas del proyecto.
 * Cada persona elegida queda como una pastilla oscura con su «×» (como los filtros de Tareas).
 * @param {{ users: import('@/api/types').UserSummary[], selected: import('@/api/types').UserSummary[],
 *           onChange: (ids: string[]) => void }} props
 */
export function PersonFilter({ users, selected, onChange }) {
  const ids = selected.map((user) => user.id)
  const chosen = new Set(ids)

  return (
    <div role="group" aria-label="Personas" className="flex flex-wrap items-center gap-1.5">
      {selected.map((user) => (
        <span
          key={user.id}
          className="tf-pop flex items-center gap-1.5 rounded-full bg-foreground py-1 pr-1 pl-1 text-[13px] font-semibold text-background"
        >
          <UserAvatar user={user} size="xs" />
          <span className="max-w-32 truncate" title={user.fullName}>
            {user.fullName?.split(' ')[0]}
          </span>
          <button
            type="button"
            onClick={() => onChange(ids.filter((id) => id !== user.id))}
            aria-label={`Quitar a ${user.fullName}`}
            className="flex size-5 items-center justify-center rounded-full opacity-80 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      <Popover>
        <PopoverTrigger className="flex h-9 items-center gap-1.5 rounded-full border border-dashed border-dash px-3 text-[13px] text-muted-foreground transition-colors duration-150 outline-none hover:border-foreground/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          + persona
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="end">
          <Command>
            <CommandInput placeholder="Buscar persona…" />
            <CommandList>
              <CommandEmpty>Nadie con ese nombre en el proyecto</CommandEmpty>
              <CommandGroup>
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={`${user.fullName} ${user.email ?? ''} ${user.id}`}
                    onSelect={() => onChange(toggleAssignee(ids, user.id))}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-4 items-center justify-center rounded-sm border',
                        chosen.has(user.id) && 'border-foreground bg-foreground text-background',
                      )}
                    >
                      {chosen.has(user.id) && <Check className="size-3" />}
                    </span>
                    <UserAvatar user={user} size="xs" />
                    <span className="min-w-0 flex-1 truncate">{user.fullName}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
