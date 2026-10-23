import { useEffect } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { CircleX, MailOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { useLogout } from '@/features/auth/hooks'
import { Status } from '@/features/auth/pages/VerifyEmailPage'
import { formatLongDate } from '@/lib/dates'
import { getErrorMessage } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { pendingInvitation } from '@/lib/pendingInvitation'
import { ROLE_LABELS } from '@/lib/permissions'
import { useSessionStore } from '@/stores/sessionStore'
import { WorkspaceLogo } from '../components/WorkspaceSwitcher'
import { useAcceptInvitation, useInvitationDetails } from '../hooks'

/** Página pública que abre el enlace del correo de invitación. */
export function InvitationPage() {
  const { token } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { status, user } = useSessionStore()
  const { data: invitation, isLoading, error } = useInvitationDetails(token)
  const accept = useAcceptInvitation()
  const logout = useLogout()

  const isAuthenticated = status === 'authenticated'
  const emailMatches = invitation && user && user.email.toLowerCase() === invitation.email.toLowerCase()

  // Sin sesión: se recuerda la invitación para volver aquí después de registrarse o iniciar sesión
  useEffect(() => {
    if (invitation && !isAuthenticated) pendingInvitation.set(token)
  }, [invitation, isAuthenticated, token])

  if (isLoading) return <CenteredSpinner />

  if (error) {
    return (
      <Card>
        <CardContent className="space-y-5 pt-8 text-center">
          <Status icon={<CircleX className="size-6" />} tone="error" title="Invitación no válida">
            {getErrorMessage(error)}. Pide a un administrador del workspace que te invite de nuevo.
          </Status>
          <Button asChild className="w-full">
            <Link to="/">Ir a TaskFlow</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const handleAccept = () => {
    accept.mutate(token, {
      onSuccess: (workspace) => {
        pendingInvitation.clear()
        toast.success(`Te uniste a «${workspace.name}»`)
        navigate(`/${workspace.slug}`, { replace: true })
      },
      onError: (acceptError) => notifyError(acceptError),
    })
  }

  const authState = { from: location, email: invitation.email }

  return (
    <Card>
      <CardContent className="space-y-6 pt-8 text-center">
        <div className="flex justify-center">
          <div className="relative">
            <WorkspaceLogo name={invitation.workspaceName} className="size-14 rounded-xl text-xl" />
            <span className="absolute -right-2 -bottom-2 flex size-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground">
              <MailOpen className="size-3.5" />
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold">Te invitaron a {invitation.workspaceName}</h1>
          <p className="text-sm text-muted-foreground">
            {invitation.invitedByName ?? 'Un administrador'} te invitó como{' '}
            <span className="font-medium text-foreground">{ROLE_LABELS[invitation.role]}</span>. La invitación
            es para <span className="font-medium text-foreground">{invitation.email}</span> y vence el{' '}
            {formatLongDate(invitation.expiresAt)}.
          </p>
        </div>

        {!isAuthenticated && (
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link to="/login" state={authState}>
                Iniciar sesión para aceptar
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/register" state={authState}>
                Crear una cuenta
              </Link>
            </Button>
          </div>
        )}

        {isAuthenticated && emailMatches && (
          <Button className="w-full" onClick={handleAccept} disabled={accept.isPending}>
            {accept.isPending && <Spinner />}
            Aceptar invitación
          </Button>
        )}

        {isAuthenticated && !emailMatches && (
          <div className="space-y-3 rounded-lg border bg-muted/50 p-4 text-sm">
            <p>
              Iniciaste sesión como <span className="font-medium">{user?.email}</span>, pero la invitación es
              para otro correo.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => logout.mutate(undefined, { onSettled: () => pendingInvitation.set(token) })}
            >
              Cambiar de cuenta
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
