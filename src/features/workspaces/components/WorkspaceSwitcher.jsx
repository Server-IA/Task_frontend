import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROLE_LABELS } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useWorkspaces } from '../hooks'
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog'

export function WorkspaceLogo({ name = '', className }) {
  return (
    <span
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground',
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}

/** Selector de workspace en la parte superior de la sidebar. */
export function WorkspaceSwitcher({ currentSlug, collapsed }) {
  const { data: workspaces = [] } = useWorkspaces()
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()
  const current = workspaces.find((workspace) => workspace.slug === currentSlug)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            'flex w-full items-center gap-2 rounded-md p-1.5 text-left text-sm outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring',
            collapsed && 'justify-center',
          )}
          aria-label="Cambiar de workspace"
        >
          <WorkspaceLogo name={current?.name ?? 'TaskFlow'} />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 truncate font-semibold">{current?.name ?? 'Elige un workspace'}</span>
              <ChevronsUpDown className="size-4 text-muted-foreground" />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem key={workspace.id} onSelect={() => navigate(`/${workspace.slug}`)}>
              <WorkspaceLogo name={workspace.name} className="size-6" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{workspace.name}</span>
                <span className="block text-xs text-muted-foreground">{ROLE_LABELS[workspace.myRole]}</span>
              </span>
              {workspace.slug === currentSlug && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus />
            Crear workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
