import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/common/Loaders'
import { useCooldown } from '@/hooks/useCooldown'
import { t } from '@/i18n'
import { notifyError } from '@/lib/notify'
import { useResendVerification } from '../hooks'

/** Botón «Reenviar correo de verificación» con espera tras cada envío (y tras un 429). */
export function ResendVerificationButton({ email, variant = 'outline', className }) {
  const resend = useResendVerification()
  const cooldown = useCooldown()

  const handleClick = () => {
    resend.mutate(email, {
      onSuccess: () => {
        toast.success(t('Te enviamos un nuevo correo de verificación'))
        cooldown.start(30)
      },
      onError: (error) => cooldown.start(notifyError(error)),
    })
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={handleClick}
      disabled={resend.isPending || cooldown.active}
    >
      {resend.isPending && <Spinner />}
      {cooldown.active ? t('Reenviar en {seconds} s', { seconds: cooldown.secondsLeft }) : t('Reenviar correo de verificación')}
    </Button>
  )
}
