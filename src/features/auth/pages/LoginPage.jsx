import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate } from 'react-router'
import { MailWarning } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/common/PasswordInput'
import { Spinner } from '@/components/common/Loaders'
import { AuthHeader } from '@/layouts/AuthLayout'
import { useCooldown } from '@/hooks/useCooldown'
import { applyFieldErrors, toApiError } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { getPostLoginPath } from '@/lib/pendingInvitation'
import { ResendVerificationButton } from '../components/ResendVerification'
import { useLogin } from '../hooks'
import { loginSchema } from '../schemas'

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const login = useLogin()
  const cooldown = useCooldown()
  const [unverifiedEmail, setUnverifiedEmail] = useState(null)

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: location.state?.email ?? '', password: '' },
  })

  const onSubmit = (values) => {
    setUnverifiedEmail(null)
    login.mutate(values, {
      onSuccess: () => navigate(getPostLoginPath(location), { replace: true }),
      onError: (error) => {
        const apiError = toApiError(error)
        if (apiError.status === 403 && apiError.message.toLowerCase().includes('verificar')) {
          setUnverifiedEmail(values.email)
          return
        }
        if (!applyFieldErrors(error, form.setError)) {
          cooldown.start(notifyError(error))
        }
      },
    })
  }

  return (
    <>
      <AuthHeader title="Inicia sesión" description="Bienvenido de nuevo a TaskFlow" />
      <Card>
        <CardContent className="pt-6">
          {unverifiedEmail && (
            <Alert className="mb-5">
              <MailWarning />
              <AlertTitle>Verifica tu correo</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>Antes de iniciar sesión, abre el enlace que te enviamos a {unverifiedEmail}.</p>
                <ResendVerificationButton email={unverifiedEmail} className="w-full" />
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" placeholder="tu@correo.com" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Contraseña</FormLabel>
                      <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                        ¿La olvidaste?
                      </Link>
                    </div>
                    <FormControl>
                      <PasswordInput autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={login.isPending || cooldown.active}>
                {login.isPending && <Spinner />}
                {cooldown.active ? `Espera ${cooldown.secondsLeft} s` : 'Iniciar sesión'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{' '}
        <Link to="/register" state={location.state} className="font-medium text-primary hover:underline">
          Regístrate
        </Link>
      </p>
    </>
  )
}
