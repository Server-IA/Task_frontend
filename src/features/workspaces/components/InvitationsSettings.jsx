import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MailPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { EmptyState, ErrorState } from '@/components/common/States'
import { useCooldown } from '@/hooks/useCooldown'
import { formatRelative, formatShortDate } from '@/lib/dates'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { useInvitations, useInvite, useRevokeInvitation } from '../hooks'
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

  const onSubmit = (values) => {
    invite.mutate(values, {
      onSuccess: (invitation) => {
        toast.success(`Invitación enviada a ${invitation.email}`)
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
        <CardTitle>Invitar personas</CardTitle>
        <CardDescription>
          Les llegará un correo con un enlace válido por 7 días. Si no tienen cuenta, podrán crearla con ese
          correo. Entran como miembros; desde Miembros puedes nombrarlos project manager.
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
                    <Input type="email" placeholder="persona@correo.com" aria-label="Correo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={invite.isPending || cooldown.active}>
              {invite.isPending ? <Spinner /> : <MailPlus />}
              {cooldown.active ? `Espera ${cooldown.secondsLeft} s` : 'Invitar'}
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
        toast.success(`Invitación a ${invitation.email} cancelada`)
      },
      onError: (revokeError) => notifyError(revokeError),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle ref={titleRef} tabIndex={-1} className="outline-none">
          Invitaciones pendientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <CenteredSpinner />}
        {error && <ErrorState error={error} onRetry={refetch} />}
        {invitations?.length === 0 && (
          <EmptyState icon={MailPlus} title="Sin invitaciones pendientes" className="py-6" />
        )}
        {invitations?.length > 0 && (
          <ul ref={listRef} className="divide-y">
            {invitations.map((invitation, index) => (
              <li key={invitation.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Enviada {formatRelative(invitation.createdAt)}
                    {invitation.invitedBy && ` por ${invitation.invitedBy.fullName}`} · vence el{' '}
                    {formatShortDate(invitation.expiresAt)}
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
                      aria-label={`Cancelar invitación a ${invitation.email}`}
                    >
                      <X className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cancelar invitación</TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
