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
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-primary font-mono text-sm font-semibold text-primary-foreground',
        className,
      )}
    >
      {letters || '?'}
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
            'flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left text-sm whitespace-nowrap text-sidebar-foreground transition-colors duration-150 outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring',
            collapsed && 'justify-center',
          )}
          aria-label="Cambiar de workspace"
        >
          <WorkspaceLogo name={current?.name ?? 'TaskFlow'} />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{current?.name ?? 'Elige un workspace'}</span>
                {current && <span className="block truncate font-mono text-[11px] text-sidebar-muted">{current.slug}</span>}
              </span>
              <ChevronsUpDown className="size-4 text-sidebar-muted" />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem key={workspace.id} onSelect={() => navigate(`/${workspace.slug}`)}>
              <WorkspaceLogo name={workspace.name} className="size-7 rounded-lg text-xs" />
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
