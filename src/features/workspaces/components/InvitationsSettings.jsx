import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MailPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { EmptyState, ErrorState } from '@/components/common/States'
import { useCooldown } from '@/hooks/useCooldown'
import { t } from '@/i18n'
import { formatRelative, formatShortDate } from '@/lib/dates'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { roleNameOf } from '@/lib/permissions'
import { useInvitations, useInvite, useRevokeInvitation, useRoles } from '../hooks'
import { assignableRoles, invitationRoleId, MEMBER_KEY } from '../roles'
import { inviteSchema } from '../schemas'

/** @param {{ workspace: import('@/api/types').WorkspaceResponse }} props */
export function InvitationsSettings({ workspace }) {
  return (
    <div className="space-y-6">
      <InviteCard workspace={workspace} />
      <PendingInvitations workspace={workspace} />
    </div>
  )
}

function InviteCard({ workspace }) {
  const invite = useInvite(workspace.slug)
  // Tras un 429 (demasiadas invitaciones seguidas) el botón espera lo que indica Retry-After
  const cooldown = useCooldown()
  const form = useForm({ resolver: zodResolver(inviteSchema), defaultValues: { email: '' } })
  // El rol con el que entra: «Miembro» o uno de los roles creados (nunca project manager: eso se da después)
  const { data: roles = [] } = useRoles(workspace.slug)
  // «Miembro» siempre se puede elegir (es el rol de entrada); un rol creado, solo si no tiene más permisos que el propio
  const assignable = assignableRoles(roles, workspace, { includeManager: false })
  const options = roles.filter((role) => role.kind === 'MEMBER' || (role.kind === 'CUSTOM' && assignable.includes(role)))
  const [roleKey, setRoleKey] = useState(MEMBER_KEY)
  // Si el rol elegido se eliminó (o ya no se puede asignar), vuelve a «Miembro»
  const selectedKey = options.some((role) => role.key === roleKey) ? roleKey : MEMBER_KEY

  const onSubmit = (values) => {
    invite.mutate({ ...values, roleId: invitationRoleId(selectedKey) }, {
      onSuccess: (invitation) => {
        toast.success(t('Invitación enviada a {email}', { email: invitation.email }), {
          description: t('Entra con el rol {role}.', { role: roleNameOf(invitation) }),
        })
        form.reset({ email: '' })
      },
      onError: (error) => {
        if (!applyFieldErrors(error, form.setError)) cooldown.start(notifyError(error))
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Invitar personas')}</CardTitle>
        <CardDescription>
          {t(
            'Les llegará un correo con un enlace válido por 7 días. Si no tienen cuenta, podrán crearla con ese correo. Entran con el rol que elijas; el de project manager se da después, desde Miembros.',
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-2 sm:flex-row" noValidate>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input type="email" placeholder={t('persona@correo.com')} aria-label={t('Correo')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {options.length > 1 && (
              <Select value={selectedKey} onValueChange={setRoleKey}>
                <SelectTrigger className="w-full sm:w-48" aria-label={t('Rol con el que entra')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((role) => (
                    <SelectItem key={role.key} value={role.key}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button type="submit" disabled={invite.isPending || cooldown.active}>
              {invite.isPending ? <Spinner /> : <MailPlus />}
              {cooldown.active ? t('Espera {seconds} s', { seconds: cooldown.secondsLeft }) : t('Invitar')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

function PendingInvitations({ workspace }) {
  const { data: invitations, isLoading, error, refetch } = useInvitations(workspace.slug)
  const revoke = useRevokeInvitation(workspace.slug)
  const listRef = useRef(null)
  const titleRef = useRef(null)
  // Cancelada una invitación, su fila (con el botón que tenía el foco) se va al recargar la lista: el foco pasa a la
  // invitación que queda en su lugar (o a la anterior) y, si no queda ninguna, al título
  const revoked = useRef(null)

  useEffect(() => {
    const pending = revoked.current
    if (!pending || !invitations || invitations.some((invitation) => invitation.id === pending.id)) return
    revoked.current = null
    // Si mientras tanto la persona fue a otro lado, no se le quita el foco
    const active = document.activeElement
    if (active && active !== document.body && !listRef.current?.contains(active)) return
    const buttons = listRef.current?.querySelectorAll('[data-revoke]') ?? []
    const next = buttons[Math.min(pending.index, buttons.length - 1)]
    ;(next ?? titleRef.current)?.focus()
  }, [invitations])

  const handleRevoke = (invitation, index) => {
    revoke.mutate(invitation.id, {
      onSuccess: () => {
        revoked.current = { id: invitation.id, index }
        toast.success(t('Invitación a {email} cancelada', { email: invitation.email }))
      },
      onError: (revokeError) => notifyError(revokeError),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle ref={titleRef} tabIndex={-1} className="outline-none">
          {t('Invitaciones pendientes')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <CenteredSpinner />}
        {error && <ErrorState error={error} onRetry={refetch} />}
        {invitations?.length === 0 && (
          <EmptyState icon={MailPlus} title={t('Sin invitaciones pendientes')} className="py-6" />
        )}
        {invitations?.length > 0 && (
          <ul ref={listRef} className="divide-y">
            {invitations.map((invitation, index) => (
              <li key={invitation.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {invitation.email}
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-normal text-muted-foreground">
                      {roleNameOf(invitation)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {invitation.invitedBy
                      ? t('Enviada {when} por {name} · vence el {date}', {
                          when: formatRelative(invitation.createdAt),
                          name: invitation.invitedBy.fullName,
                          date: formatShortDate(invitation.expiresAt),
                        })
                      : t('Enviada {when} · vence el {date}', {
                          when: formatRelative(invitation.createdAt),
                          date: formatShortDate(invitation.expiresAt),
                        })}
                  </p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      data-revoke=""
                      onClick={() => handleRevoke(invitation, index)}
                      disabled={revoke.isPending}
                      aria-label={t('Cancelar invitación a {email}', { email: invitation.email })}
                    >
                      <X className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('Cancelar invitación')}</TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
