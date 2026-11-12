import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { SplashStage } from '@/components/common/Splash'
import { t } from '@/i18n'
import { notifyError } from '@/lib/notify'
import { takeReturn } from '../GithubAccount'
import { useCompleteGithubLink } from '../hooks'

/**
 * A donde GitHub trae a la persona después de autorizar a la app (`/github/callback?code=…&state=…`). Termina de
 * enlazar su cuenta con su sesión de TaskFlow y la devuelve a donde estaba. Si llega otra persona con el enlace (o sin
 * sesión, tras iniciar sesión), el servidor no enlaza nada: el enlace solo le sirve a quien lo pidió.
 */
export function GithubCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const complete = useCompleteGithubLink()
  // El código de GitHub solo sirve una vez: no se manda dos veces aunque el efecto se repita
  const sent = useRef(false)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    const back = takeReturn()
    if (!code || !state) {
      // La persona canceló en GitHub (o llegó aquí sin nada)
      if (searchParams.get('error')) toast.error(t('No autorizaste la conexión en GitHub'))
      navigate(back, { replace: true })
      return
    }
    complete.mutate(
      { code, state },
      {
        onSuccess: (account) =>
          toast.success(t('Tu cuenta de GitHub (@{login}) quedó conectada', { login: account.login })),
        onError: (error) => notifyError(error, t('No se pudo conectar tu cuenta de GitHub')),
        onSettled: () => navigate(back, { replace: true }),
      },
    )
    // Solo al entrar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // El logo de carga de la app (el mismo que sigue al entrar a ella), con lo que está pasando debajo
  return (
    <div className="bg-background relative min-h-dvh" role="status">
      <SplashStage />
      <p className="text-muted-foreground absolute inset-x-0 top-[calc(50%+108px)] text-center text-sm">
        {t('Conectando tu cuenta de GitHub…')}
      </p>
    </div>
  )
}
