import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { PasswordInput } from '@/components/common/PasswordInput'
import { PasswordRules } from '@/components/common/PasswordRules'
import { Spinner } from '@/components/common/Loaders'
import { useUrlToken } from '@/hooks/useUrlToken'
import { AuthCard, AuthHeader, AuthIcon, CenteredShell } from '@/layouts/AuthLayout'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { useResetPassword } from '../hooks'
import { resetPasswordSchema } from '../schemas'

export function ResetPasswordPage() {
  const token = useUrlToken()
  const reset = useResetPassword()
  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })
  const [newPassword, confirmPassword] = useWatch({ control: form.control, name: ['newPassword', 'confirmPassword'] })
  const matches = Boolean(confirmPassword) && confirmPassword === newPassword

  const onSubmit = ({ newPassword: password }) => {
    reset.mutate(
      { token, newPassword: password },
      {
        onError: (error) => {
          if (!applyFieldErrors(error, form.setError)) notifyError(error)
        },
      },
    )
  }

  return (
    <CenteredShell meta="~/acceso/restablecer">
      <AuthCard>
        {!token && (
          <>
            <AuthIcon tone="late">
              <X className="size-7" strokeWidth={2.6} />
            </AuthIcon>
            <AuthHeader size="md" title="Enlace inválido" description="Pide un nuevo enlace para restablecer tu contraseña." />
            <Button asChild className="h-11 rounded-xl">
              <Link to="/forgot-password">Pedir un enlace nuevo</Link>
            </Button>
          </>
        )}
        {token && reset.isSuccess && (
          <>
            <AuthIcon tone="ok">
              <Check className="size-7" strokeWidth={2.6} />
            </AuthIcon>
            <AuthHeader
              size="md"
              title="Contraseña actualizada"
              description="Ya puedes iniciar sesión con tu nueva contraseña. Por seguridad cerramos tus otras sesiones."
            />
            <Button asChild className="h-11 rounded-xl">
              <Link to="/login">Iniciar sesión</Link>
            </Button>
          </>
        )}
        {token && !reset.isSuccess && (
          <>
            <p className="flex items-center gap-2 self-start rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-ok-dot" />
              el enlace vale por 1 h desde que lo pediste
            </p>
            <AuthHeader
              size="md"
              title="Crea una contraseña nueva"
              description="Cerraremos las sesiones abiertas en otros dispositivos."
            />
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nueva contraseña</FormLabel>
                      <FormControl>
                        <PasswordInput autoComplete="new-password" autoFocus className="h-10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <PasswordRules value={newPassword} meter />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar contraseña</FormLabel>
                      <FormControl>
                        <PasswordInput autoComplete="new-password" className="h-10" {...field} />
                      </FormControl>
                      {matches && <p className="font-mono text-xs text-ok">✓ coinciden</p>}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="h-11 w-full rounded-xl" disabled={reset.isPending}>
                  {reset.isPending && <Spinner />}
                  Guardar contraseña
                </Button>
              </form>
            </Form>
            {reset.isError && (
              <p className="text-center text-sm text-muted-foreground">
                ¿El enlace expiró?{' '}
                <Link to="/forgot-password" className="font-semibold text-accent-text hover:underline">
                  Pide uno nuevo
                </Link>
              </p>
            )}
          </>
        )}
      </AuthCard>
    </CenteredShell>
  )
}
