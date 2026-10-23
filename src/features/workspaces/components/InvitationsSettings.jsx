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
import { formatRelative, formatShortDate } from '@/lib/dates'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { ROLE_LABELS } from '@/lib/permissions'
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
  const form = useForm({ resolver: zodResolver(inviteSchema), defaultValues: { email: '', role: 'MEMBER' } })

  const onSubmit = (values) => {
    invite.mutate(values, {
      onSuccess: (invitation) => {
        toast.success(`Invitación enviada a ${invitation.email}`)
        form.reset({ email: '', role: values.role })
      },
      onError: (error) => {
        if (!applyFieldErrors(error, form.setError)) notifyError(error)
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invitar personas</CardTitle>
        <CardDescription>
          Les llegará un correo con un enlace válido por 7 días. Si no tienen cuenta, podrán crearla con ese
          correo.
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
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full sm:w-40" aria-label="Rol">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MEMBER">{ROLE_LABELS.MEMBER}</SelectItem>
                      <SelectItem value="ADMIN">{ROLE_LABELS.ADMIN}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? <Spinner /> : <MailPlus />}
              Invitar
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

  const handleRevoke = (invitation) => {
    revoke.mutate(invitation.id, {
      onSuccess: () => toast.success(`Invitación a ${invitation.email} cancelada`),
      onError: (revokeError) => notifyError(revokeError),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invitaciones pendientes</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <CenteredSpinner />}
        {error && <ErrorState error={error} onRetry={refetch} />}
        {invitations?.length === 0 && (
          <EmptyState icon={MailPlus} title="Sin invitaciones pendientes" className="py-6" />
        )}
        {invitations?.length > 0 && (
          <ul className="divide-y">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[invitation.role]} · enviada {formatRelative(invitation.createdAt)}
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
                      onClick={() => handleRevoke(invitation)}
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
