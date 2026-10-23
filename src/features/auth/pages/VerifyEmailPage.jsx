import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CircleCheck, CircleX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/common/Loaders'
import { getErrorMessage } from '@/lib/errors'
import { useSessionStore } from '@/stores/sessionStore'
import { useVerifyEmail } from '../hooks'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
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

  return (
    <Card>
      <CardContent className="space-y-5 pt-8 text-center">
        {(!token || verify.isError) && (
          <Status icon={<CircleX className="size-6" />} tone="error" title="No pudimos verificar tu correo">
            {token ? getErrorMessage(verify.error) : 'El enlace no es válido.'} Puedes pedir un enlace nuevo
            desde la pantalla de inicio de sesión.
          </Status>
        )}
        {token && verify.isPending && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Spinner className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Verificando tu correo…</p>
          </div>
        )}
        {verify.isSuccess && (
          <Status icon={<CircleCheck className="size-6" />} tone="success" title="¡Correo verificado!">
            Tu cuenta ya está activa. Ya puedes iniciar sesión.
          </Status>
        )}
        {!verify.isPending && (
          <Button asChild className="w-full">
            <Link to={continueLink}>{isAuthenticated ? 'Ir a TaskFlow' : 'Iniciar sesión'}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function Status({ icon, tone, title, children }) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : 'bg-destructive/10 text-destructive'
  return (
    <>
      <div className={`mx-auto flex size-12 items-center justify-center rounded-full ${toneClass}`}>{icon}</div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </>
  )
}
