import { useLocation, useNavigate } from 'react-router'
import { ChevronsUpDown, LogOut, Palette, UserRound } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeRadioItems } from '@/components/common/ThemeToggle'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useLogout } from '@/features/auth/hooks'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/sessionStore'

export function UserMenu({ collapsed = false }) {
  const user = useSessionStore((state) => state.user)
  const logout = useLogout()
  const navigate = useNavigate()
  const onProfile = useLocation().pathname === '/profile'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left text-sm whitespace-nowrap text-sidebar-foreground transition-colors duration-150 outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring aria-[current=page]:bg-sidebar-active aria-[current=page]:text-sidebar-active-foreground',
          collapsed && 'justify-center',
        )}
        aria-current={onProfile ? 'page' : undefined}
      >
        <UserAvatar user={user} size="md" />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">{user?.fullName}</span>
              <span className="block truncate text-[11px] text-sidebar-muted">{user?.email}</span>
            </span>
            <ChevronsUpDown className="size-4 text-sidebar-muted" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate font-medium">{user?.fullName}</span>
          <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/profile')}>
          <UserRound />
          Mi perfil
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className="mr-2 size-4 text-muted-foreground" />
            Tema
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <ThemeRadioItems />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })}
        >
          <LogOut />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
