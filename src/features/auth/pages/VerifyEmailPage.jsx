import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/common/Loaders'
import { useUrlToken } from '@/hooks/useUrlToken'
import { t } from '@/i18n'
import { AuthCard, AuthHeader, AuthIcon, CenteredShell } from '@/layouts/AuthLayout'
import { asSentence, getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/sessionStore'
import { useVerifyEmail } from '../hooks'

export function VerifyEmailPage() {
  const token = useUrlToken()
  const verify = useVerifyEmail()
  const isAuthenticated = useSessionStore((state) => state.status === 'authenticated')
  const sent = useRef(false)

  useEffect(() => {
    // El token es de un solo uso: no se debe enviar dos veces (StrictMode monta el efecto doble)
    if (token && !sent.current) {
      sent.current = true
      verify.mutate(token)
    }
  }, [token, verify])

  const continueLink = isAuthenticated ? '/' : '/login'
  const failed = !token || verify.isError

  return (
    <CenteredShell meta={t('~/acceso/verificar')}>
      <AuthCard>
        {token && verify.isPending && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Spinner className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('Verificando tu correo…')}</p>
          </div>
        )}
        {verify.isSuccess && (
          <>
            <AuthIcon tone="ok">
              <Check className="size-7" strokeWidth={2.6} />
            </AuthIcon>
            <AuthHeader
              size="md"
              title={t('Correo verificado')}
              description={t('Listo. Tu cuenta ya está activa: entra y arma tu primer workspace.')}
            />
            <Progress done={[t('cuenta'), t('correo')]} pending={['workspace']} />
            <Button asChild className="h-11 rounded-xl">
              <Link to={continueLink}>
                {isAuthenticated ? t('Ir a TaskFlow') : t('Iniciar sesión')}
                <ArrowRight />
              </Link>
            </Button>
          </>
        )}
        {failed && (
          <>
            <AuthIcon tone="late">
              <X className="size-7" strokeWidth={2.6} />
            </AuthIcon>
            <AuthHeader
              size="md"
              title={t('No pudimos verificar tu correo')}
              description={t('{reason} Pide un enlace nuevo desde la pantalla de inicio de sesión.', {
                reason: token ? asSentence(getErrorMessage(verify.error)) : t('El enlace no es válido.'),
              })}
            />
            <Button asChild className="h-11 rounded-xl">
              <Link to="/login">{t('Ir a iniciar sesión')}</Link>
            </Button>
          </>
        )}
      </AuthCard>
    </CenteredShell>
  )
}

/** Barras del progreso del registro: «✓ cuenta  ✓ correo  ○ workspace». */
function Progress({ done, pending }) {
  const steps = [...done.map((label) => ({ label, ok: true })), ...pending.map((label) => ({ label, ok: false }))]
  return (
    <ol aria-label={t('Progreso')} className="flex gap-1.5">
      {steps.map((step) => (
        <li key={step.label} className="flex flex-1 flex-col gap-1.5">
          <span aria-hidden="true" className={cn('h-1 rounded-full', step.ok ? 'bg-ok-dot' : 'bg-column')} />
          <span className={cn('font-mono text-[11px]', step.ok ? 'text-foreground' : 'text-muted-foreground')}>
            {step.ok ? '✓' : '○'} {step.label}
          </span>
        </li>
      ))}
    </ol>
  )
}
