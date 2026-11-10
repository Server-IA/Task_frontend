import { useRef, useState } from 'react'
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
import { useFocusAfterRemoval } from '@/lib/focusReturn'
import { notifyError } from '@/lib/notify'
import { can, isManager, roleNameOf } from '@/lib/permissions'
import { useSessionStore } from '@/stores/sessionStore'
import { useMembers, useRemoveMember, useRoles, useUpdateMemberRole } from '../hooks'
import { assignableRoles, coversRole, memberRoleBody, roleKeyOf } from '../roles'

/** @param {{ workspace: import('@/api/types').WorkspaceResponse }} props */
export function MembersSettings({ workspace }) {
  const { data: members, isLoading, error, refetch } = useMembers(workspace.slug)
  const updateRole = useUpdateMemberRole(workspace.slug)
  const removeMember = useRemoveMember(workspace.slug)
  const currentUserId = useSessionStore((state) => state.user?.id)
  const [toRemove, setToRemove] = useState(null)
  // Cambiar roles y quitar miembros van cada uno por su permiso
  const canChangeRoles = can(workspace, 'MEMBER_ROLE')
  const canRemove = can(workspace, 'MEMBER_REMOVE')
  const manager = isManager(workspace.myRole)
  const { data: roles = [] } = useRoles(workspace.slug)
  // Quien no es project manager solo asigna roles que no tengan más permisos que el suyo
  const options = assignableRoles(roles, workspace)
  const roleOf = (member) => roles.find((role) => role.key === roleKeyOf(member))
  // …y tampoco le cambia el rol (ni saca) a un project manager o a alguien con más permisos
  const mayChange = (member) => manager || (member.role !== 'OWNER' && coversRole(workspace, roleOf(member)))
  // Al quitar a alguien su fila (y su menú) desaparece: el foco va al título de la tarjeta
  const titleRef = useRef(null)
  const removal = useFocusAfterRemoval(titleRef)

  const handleRoleChange = (member, key) => {
    const role = roles.find((item) => item.key === key)
    updateRole.mutate(
      { userId: member.user.id, ...memberRoleBody(key) },
      {
        onSuccess: () => toast.success(`${member.user.fullName} ahora tiene el rol ${role?.name ?? ''}`.trim()),
        // 409 si el workspace se quedaría sin project manager: se muestra el mensaje del backend
        onError: (error) => notifyError(error, 'No se pudo cambiar el rol'),
      },
    )
  }

  const handleRemove = () => {
    removal.start()
    removeMember.mutate(toRemove.user.id, {
      onSuccess: () => {
        removal.done()
        toast.success(`${toRemove.user.fullName} ya no es miembro`)
        setToRemove(null)
      },
      onError: (error) => notifyError(error, 'No se pudo quitar'),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle ref={titleRef} tabIndex={-1} className="outline-none">
          Miembros
        </CardTitle>
        <CardDescription>
          {members ? `${members.length} ${members.length === 1 ? 'persona' : 'personas'} en el workspace.` : ' '} El
          project manager tiene todos los permisos y puede haber más de uno; lo que pueden hacer los demás lo decide su
          rol (pestaña Roles).
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
                <TableHead className="w-48">Rol</TableHead>
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
                      {canChangeRoles && !isMe && roles.length > 0 && mayChange(member) ? (
                        <Select
                          value={roleKeyOf(member)}
                          onValueChange={(key) => handleRoleChange(member, key)}
                          disabled={updateRole.isPending}
                        >
                          <SelectTrigger size="sm" className="w-44" aria-label={`Rol de ${member.user.fullName}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Su rol actual siempre aparece, aunque quien mira no lo pueda asignar */}
                            {roles
                              .filter((role) => options.includes(role) || role.key === roleKeyOf(member))
                              .map((role) => (
                                <SelectItem key={role.key} value={role.key}>
                                  {role.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={isManager(member.role) ? 'default' : 'secondary'}>{roleNameOf(member)}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {formatShortDate(member.joinedAt)}
                    </TableCell>
                    <TableCell>
                      {canRemove && !isMe && mayChange(member) && (
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
          returnFocusRef={titleRef}
          focusAfterConfirmRef={removal.ref}
        />
      </CardContent>
    </Card>
  )
}
