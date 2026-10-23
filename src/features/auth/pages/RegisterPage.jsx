import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation } from 'react-router'
import { MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/common/PasswordInput'
import { Spinner } from '@/components/common/Loaders'
import { AuthHeader } from '@/layouts/AuthLayout'
import { useCooldown } from '@/hooks/useCooldown'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { ResendVerificationButton } from '../components/ResendVerification'
import { useRegister } from '../hooks'
import { registerSchema } from '../schemas'

export function RegisterPage() {
  const location = useLocation()
  const register = useRegister()
  const cooldown = useCooldown()
  const [registeredEmail, setRegisteredEmail] = useState(null)

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: location.state?.email ?? '', password: '', confirmPassword: '' },
  })

  const onSubmit = ({ fullName, email, password }) => {
    register.mutate(
      { fullName, email, password },
      {
        onSuccess: (user) => setRegisteredEmail(user.email),
        onError: (error) => {
          if (!applyFieldErrors(error, form.setError)) {
            cooldown.start(notifyError(error, 'No se pudo crear la cuenta'))
          }
        },
      },
    )
  }

  if (registeredEmail) {
    return <CheckYourEmail email={registeredEmail} />
  }

  return (
    <>
      <AuthHeader title="Crea tu cuenta" description="Organiza el trabajo de tu equipo en minutos" />
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" placeholder="Ana Pérez" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" placeholder="tu@correo.com" {...field} />
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
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" {...field} />
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
              <Button type="submit" className="w-full" disabled={register.isPending || cooldown.active}>
                {register.isPending && <Spinner />}
                {cooldown.active ? `Espera ${cooldown.secondsLeft} s` : 'Crear cuenta'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" state={location.state} className="font-medium text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </>
  )
}

function CheckYourEmail({ email }) {
  return (
    <Card>
      <CardContent className="space-y-5 pt-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold">Revisa tu correo</h1>
          <p className="text-sm text-muted-foreground">
            Te enviamos un enlace a <span className="font-medium text-foreground">{email}</span> para
            verificar tu cuenta. El enlace vence en 24 horas.
          </p>
        </div>
        <ResendVerificationButton email={email} className="w-full" />
        <Button asChild variant="link" className="w-full">
          <Link to="/login" state={{ email }}>
            Ir a iniciar sesión
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
