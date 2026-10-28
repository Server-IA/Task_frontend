import { useEffect } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { useLogout } from '@/features/auth/hooks'
import { AuthCard, AuthHeader, AuthIcon, CenteredShell } from '@/layouts/AuthLayout'
import { formatRelative } from '@/lib/dates'
import { getErrorMessage } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { pendingInvitation } from '@/lib/pendingInvitation'
import { ROLE_LABELS } from '@/lib/permissions'
import { useSessionStore } from '@/stores/sessionStore'
import { WorkspaceLogo } from '../components/WorkspaceSwitcher'
import { useAcceptInvitation, useInvitationDetails } from '../hooks'

/** Qué permite cada rol, para explicarlo en la invitación. */
const ROLE_HINTS = {
  OWNER: 'gestionar proyectos, ciclos, módulos y miembros',
  MEMBER: 'crear y editar tareas',
}

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

  const meta = isAuthenticated ? (
    <span className="font-sans text-[13px]">
      Sesión: <strong className="font-semibold text-foreground">{user?.email}</strong>
    </span>
  ) : (
    '~/invitaciones'
  )

  if (isLoading) {
    return (
      <CenteredShell meta={meta}>
        <CenteredSpinner />
      </CenteredShell>
    )
  }

  if (error) {
    return (
      <CenteredShell meta={meta}>
        <AuthCard>
          <AuthIcon tone="late">
            <X className="size-7" strokeWidth={2.6} />
          </AuthIcon>
          <AuthHeader
            size="md"
            title="Invitación no válida"
            description={`${getErrorMessage(error)}. Pide al project manager del workspace que te invite de nuevo.`}
          />
          <Button asChild className="h-11 rounded-xl">
            <Link to="/">Ir a TaskFlow</Link>
          </Button>
        </AuthCard>
      </CenteredShell>
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
  const inviter = invitation.invitedByName ?? 'El project manager'

  return (
    <CenteredShell meta={meta}>
      <section aria-labelledby="invitacion-titulo" className="w-full max-w-[520px] overflow-hidden rounded-[22px] border bg-card">
        <div className="flex flex-col gap-4 bg-sidebar px-6 py-6.5 text-sidebar-foreground sm:px-7.5">
          <p className="font-mono text-xs text-sidebar-muted">~/invitaciones/••••</p>
          <div className="flex items-center gap-3.5">
            <WorkspaceLogo name={invitation.workspaceName} className="size-14 rounded-2xl text-xl" />
            <div className="min-w-0">
              <p className="text-[13px] text-sidebar-muted">Te invitaron a</p>
              <p className="mt-0.5 font-display text-[30px] leading-[1.05] font-extrabold tracking-[-0.02em]">
                {invitation.workspaceName}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4.5 px-6 py-6 sm:px-7.5">
          <h1 id="invitacion-titulo" className="text-[17px] font-semibold">
            <span className="font-medium text-muted-foreground">{inviter} te invita como</span>{' '}
            {ROLE_LABELS[invitation.role]?.toLowerCase()}
          </h1>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 rounded-xl bg-muted px-3.5 py-3 font-mono text-xs">
            <dt className="text-muted-foreground">para</dt>
            <dd className="truncate">{invitation.email}</dd>
            <dt className="text-muted-foreground">rol</dt>
            <dd>
              {invitation.role} · {ROLE_HINTS[invitation.role] ?? ROLE_LABELS[invitation.role]}
            </dd>
            <dt className="text-muted-foreground">expira</dt>
            <dd>{formatRelative(invitation.expiresAt)}</dd>
          </dl>

          {!isAuthenticated && (
            <div className="flex flex-wrap gap-2">
              <Button asChild className="h-11 flex-[2_1_200px] rounded-xl">
                <Link to="/login" state={authState}>
                  Iniciar sesión para aceptar
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 flex-[1_1_140px] rounded-xl">
                <Link to="/register" state={authState}>
                  Crear una cuenta
                </Link>
              </Button>
            </div>
          )}

          {isAuthenticated && emailMatches && (
            <Button className="h-11 rounded-xl" onClick={handleAccept} disabled={accept.isPending}>
              {accept.isPending && <Spinner />}
              Unirme a {invitation.workspaceName}
            </Button>
          )}

          {isAuthenticated && !emailMatches && (
            <div className="space-y-3 rounded-xl border border-dashed border-dash p-4 text-sm">
              <p>
                Iniciaste sesión como <span className="font-semibold">{user?.email}</span>, pero la invitación es para otro
                correo.
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

          <p className="border-t border-dashed border-dash pt-3.5 text-[13px] text-muted-foreground">
            La invitación es para este correo. Si entraste con otra cuenta, cierra sesión y vuelve a abrir el enlace.
          </p>
        </div>
      </section>
    </CenteredShell>
  )
}
