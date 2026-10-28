import { useState } from 'react'
import { UserMinus, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CenteredSpinner } from '@/components/common/Loaders'
import { LockNote } from '@/components/common/LockNote'
import { ErrorState } from '@/components/common/States'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useIsManager, useMembers } from '@/features/workspaces/hooks'
import { formatShortDate } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { useSessionStore } from '@/stores/sessionStore'
import { useAddProjectMember, useProjectMembers, useRemoveProjectMember } from '../hooks'

export function ProjectMembersSettings({ slug, project }) {
  const { data: members, isLoading, error, refetch } = useProjectMembers(slug, project.id)
  const remove = useRemoveProjectMember(slug, project.id)
  const currentUserId = useSessionStore((state) => state.user?.id)
  const [toRemove, setToRemove] = useState(null)
  const canManage = useIsManager()

  const handleRemove = () => {
    remove.mutate(toRemove.user.id, {
      onSuccess: () => {
        toast.success(`${toRemove.user.fullName} salió del proyecto`)
        setToRemove(null)
      },
      onError: (removeError) => notifyError(removeError),
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Miembros del proyecto</CardTitle>
          <CardDescription>
            Pueden ver el proyecto y ser asignados a sus tareas. Los project managers ven todos los proyectos.
          </CardDescription>
          {!canManage && <LockNote>Solo el project manager puede agregar o quitar miembros.</LockNote>}
        </div>
        {canManage && members && <AddMemberButton slug={slug} project={project} members={members} />}
      </CardHeader>
      <CardContent>
        {isLoading && <CenteredSpinner />}
        {error && <ErrorState error={error} onRetry={refetch} />}
        {members && (
          <ul className="divide-y rounded-lg border">
            {members.map((member) => (
              <li key={member.user.id} className="flex items-center gap-3 px-3 py-2.5">
                <UserAvatar user={member.user} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member.user.fullName}
                    {member.user.id === currentUserId && (
                      <span className="ml-1.5 text-xs text-muted-foreground">(tú)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                </div>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  desde el {formatShortDate(member.joinedAt)}
                </span>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    aria-label={`Quitar a ${member.user.fullName}`}
                    onClick={() => setToRemove(member)}
                  >
                    <UserMinus />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <ConfirmDialog
        open={Boolean(toRemove)}
        onOpenChange={(open) => !open && setToRemove(null)}
        title={`¿Quitar a ${toRemove?.user.fullName} del proyecto?`}
        description="Dejará de ver el proyecto (salvo que sea project manager del workspace)."
        confirmLabel="Quitar"
        loading={remove.isPending}
        onConfirm={handleRemove}
      />
    </Card>
  )
}

function AddMemberButton({ slug, project, members }) {
  const [open, setOpen] = useState(false)
  const { data: workspaceMembers = [] } = useMembers(slug)
  const add = useAddProjectMember(slug, project.id)
  const memberIds = new Set(members.map((member) => member.user.id))
  const candidates = workspaceMembers.filter((member) => !memberIds.has(member.user.id))

  const handleAdd = (member) => {
    add.mutate(member.user.id, {
      onSuccess: () => toast.success(`${member.user.fullName} se unió al proyecto`),
      onError: (addError) => notifyError(addError),
    })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm">
          <UserPlus />
          Agregar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <Command>
          <CommandInput placeholder="Buscar en el workspace…" />
          <CommandList>
            <CommandEmpty>Todos los miembros del workspace ya están en el proyecto.</CommandEmpty>
            <CommandGroup>
              {candidates.map((member) => (
                <CommandItem
                  key={member.user.id}
                  value={`${member.user.fullName} ${member.user.email}`}
                  onSelect={() => handleAdd(member)}
                >
                  <UserAvatar user={member.user} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{member.user.fullName}</span>
                    <span className="block truncate text-xs text-muted-foreground">{member.user.email}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
