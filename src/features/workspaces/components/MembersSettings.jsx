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
import { isManager, ROLE_LABELS } from '@/lib/permissions'
import { useSessionStore } from '@/stores/sessionStore'
import { useMembers, useRemoveMember, useUpdateMemberRole } from '../hooks'

/** @param {{ workspace: import('@/api/types').WorkspaceResponse }} props */
export function MembersSettings({ workspace }) {
  const { data: members, isLoading, error, refetch } = useMembers(workspace.slug)
  const updateRole = useUpdateMemberRole(workspace.slug)
  const removeMember = useRemoveMember(workspace.slug)
  const currentUserId = useSessionStore((state) => state.user?.id)
  const [toRemove, setToRemove] = useState(null)
  const canManage = isManager(workspace.myRole)

  const handleRoleChange = (member, role) => {
    updateRole.mutate(
      { userId: member.user.id, role },
      {
        onSuccess: () => toast.success(`${member.user.fullName} ahora es ${ROLE_LABELS[role].toLowerCase()}`),
        // 409 si el workspace se quedaría sin project manager: se muestra el mensaje del backend
        onError: (error) => notifyError(error, 'No se pudo cambiar el rol'),
      },
    )
  }

  const handleRemove = () => {
    removeMember.mutate(toRemove.user.id, {
      onSuccess: () => {
        toast.success(`${toRemove.user.fullName} ya no es miembro`)
        setToRemove(null)
      },
      onError: (error) => notifyError(error, 'No se pudo quitar'),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Miembros</CardTitle>
        <CardDescription>
          {members ? `${members.length} ${members.length === 1 ? 'persona' : 'personas'} en el workspace.` : ' '} El
          project manager gestiona proyectos, ciclos, módulos y miembros; puede haber más de uno.
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
                      {/* El rol propio no se cambia desde aquí: así nadie se quita los permisos sin querer */}
                      {canManage && !isMe ? (
                        <Select
                          value={member.role}
                          onValueChange={(role) => handleRoleChange(member, role)}
                          disabled={updateRole.isPending}
                        >
                          <SelectTrigger size="sm" className="w-40" aria-label={`Rol de ${member.user.fullName}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OWNER">{ROLE_LABELS.OWNER}</SelectItem>
                            <SelectItem value="MEMBER">{ROLE_LABELS.MEMBER}</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={isManager(member.role) ? 'default' : 'secondary'}>{ROLE_LABELS[member.role]}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {formatShortDate(member.joinedAt)}
                    </TableCell>
                    <TableCell>
                      {canManage && !isMe && (
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
