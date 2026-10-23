import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useSearchParams } from 'react-router'
import { CircleCheck, CircleX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { PasswordInput } from '@/components/common/PasswordInput'
import { Spinner } from '@/components/common/Loaders'
import { AuthHeader } from '@/layouts/AuthLayout'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { useResetPassword } from '../hooks'
import { resetPasswordSchema } from '../schemas'
import { Status } from './VerifyEmailPage'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const reset = useResetPassword()
  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const onSubmit = ({ newPassword }) => {
    reset.mutate(
      { token, newPassword },
      {
        onError: (error) => {
          if (!applyFieldErrors(error, form.setError)) notifyError(error)
        },
      },
    )
  }

  if (!token) {
    return (
      <Card>
        <CardContent className="space-y-5 pt-8 text-center">
          <Status icon={<CircleX className="size-6" />} tone="error" title="Enlace inválido">
            Pide un nuevo enlace para restablecer tu contraseña.
          </Status>
          <Button asChild className="w-full">
            <Link to="/forgot-password">Pedir un enlace nuevo</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (reset.isSuccess) {
    return (
      <Card>
        <CardContent className="space-y-5 pt-8 text-center">
          <Status icon={<CircleCheck className="size-6" />} tone="success" title="Contraseña actualizada">
            Ya puedes iniciar sesión con tu nueva contraseña. Por seguridad cerramos tus otras sesiones.
          </Status>
          <Button asChild className="w-full">
            <Link to="/login">Iniciar sesión</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <AuthHeader title="Nueva contraseña" description="Elige una contraseña que no hayas usado antes." />
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva contraseña</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" autoFocus {...field} />
                    </FormControl>
                    <FormDescription>Mínimo 8 caracteres, con letras y números.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar contraseña</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={reset.isPending}>
                {reset.isPending && <Spinner />}
                Guardar contraseña
              </Button>
            </form>
          </Form>
          {reset.isError && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              ¿El enlace expiró?{' '}
              <Link to="/forgot-password" className="font-medium text-primary hover:underline">
                Pide uno nuevo
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
