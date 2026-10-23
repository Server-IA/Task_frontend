import { useState } from 'react'
import { MoreHorizontal, UserMinus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CenteredSpinner } from '@/components/common/Loaders'
import { ErrorState } from '@/components/common/States'
import { UserAvatar } from '@/components/common/UserAvatar'
import { formatShortDate } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { isAdminRole, ROLE_LABELS } from '@/lib/permissions'
import { useSessionStore } from '@/stores/sessionStore'
import { useMembers, useRemoveMember, useUpdateMemberRole } from '../hooks'

/** @param {{ workspace: import('@/api/types').WorkspaceResponse }} props */
export function MembersSettings({ workspace }) {
  const { data: members, isLoading, error, refetch } = useMembers(workspace.slug)
  const updateRole = useUpdateMemberRole(workspace.slug)
  const removeMember = useRemoveMember(workspace.slug)
  const currentUserId = useSessionStore((state) => state.user?.id)
  const [toRemove, setToRemove] = useState(null)
  const canManage = isAdminRole(workspace.myRole)

  const handleRoleChange = (member, role) => {
    updateRole.mutate(
      { userId: member.user.id, role },
      {
        onSuccess: () => toast.success(`${member.user.fullName} ahora es ${ROLE_LABELS[role].toLowerCase()}`),
        onError: (error) => notifyError(error),
      },
    )
  }

  const handleRemove = () => {
    removeMember.mutate(toRemove.user.id, {
      onSuccess: () => {
        toast.success(`${toRemove.user.fullName} ya no es miembro`)
        setToRemove(null)
      },
      onError: (error) => notifyError(error),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Miembros</CardTitle>
        <CardDescription>
          {members ? `${members.length} ${members.length === 1 ? 'persona' : 'personas'} en el workspace.` : ' '}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        {isLoading && <CenteredSpinner />}
        {error && <ErrorState error={error} onRetry={refetch} />}
        {members && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead className="w-44">Rol</TableHead>
                <TableHead className="hidden w-28 sm:table-cell">Desde</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isOwner = member.role === 'OWNER'
                const isMe = member.user.id === currentUserId
                return (
                  <TableRow key={member.user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar user={member.user} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {member.user.fullName}
                            {isMe && <span className="ml-1.5 text-xs text-muted-foreground">(tú)</span>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManage && !isOwner ? (
                        <Select value={member.role} onValueChange={(role) => handleRoleChange(member, role)}>
                          <SelectTrigger size="sm" className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">{ROLE_LABELS.ADMIN}</SelectItem>
                            <SelectItem value="MEMBER">{ROLE_LABELS.MEMBER}</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={isOwner ? 'default' : 'secondary'}>{ROLE_LABELS[member.role]}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {formatShortDate(member.joinedAt)}
                    </TableCell>
                    <TableCell>
                      {canManage && !isOwner && !isMe && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8" aria-label="Acciones">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem variant="destructive" onSelect={() => setToRemove(member)}>
                              <UserMinus />
                              Quitar del workspace
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        <ConfirmDialog
          open={Boolean(toRemove)}
          onOpenChange={(open) => !open && setToRemove(null)}
          title={`¿Quitar a ${toRemove?.user.fullName}?`}
          description="Perderá el acceso al workspace y a todos sus proyectos."
          confirmLabel="Quitar"
          loading={removeMember.isPending}
          onConfirm={handleRemove}
        />
      </CardContent>
    </Card>
  )
}
