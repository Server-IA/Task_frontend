import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'
import { ArrowLeft, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/common/Loaders'
import { AuthCard, AuthHeader, AuthIcon, CenteredShell } from '@/layouts/AuthLayout'
import { useCooldown } from '@/hooks/useCooldown'
import { notifyError } from '@/lib/notify'
import { useForgotPassword } from '../hooks'
import { emailOnlySchema } from '../schemas'

export function ForgotPasswordPage() {
  const forgot = useForgotPassword()
  const cooldown = useCooldown()
  const [sentTo, setSentTo] = useState(null)
  const form = useForm({ resolver: zodResolver(emailOnlySchema), defaultValues: { email: '' } })

  const onSubmit = ({ email }) => {
    forgot.mutate(email, {
      onSuccess: () => setSentTo(email),
      onError: (error) => cooldown.start(notifyError(error)),
    })
  }

  return (
    <CenteredShell meta="~/acceso/olvide-contrasena">
      <AuthCard>
        <Link
          to="/login"
          className="flex items-center gap-1.5 self-start text-[13px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Volver a iniciar sesión
        </Link>
        {sentTo ? (
          <>
            <AuthIcon>
              <Mail className="size-7" strokeWidth={1.8} />
            </AuthIcon>
            <AuthHeader
              size="md"
              title="Enlace enviado"
              description={
                <>
                  Si <strong className="font-semibold text-foreground">{sentTo}</strong> tiene una cuenta, recibirás el enlace en unos
                  segundos. Por seguridad no confirmamos si el correo está registrado.
                </>
              }
            />
            <p className="font-mono text-xs text-muted-foreground">el enlace expira en 1 h · solo sirve una vez</p>
            <Button variant="outline" className="h-10 rounded-xl" onClick={() => setSentTo(null)}>
              Usar otro correo
            </Button>
          </>
        ) : (
          <>
            <AuthHeader
              size="md"
              title="¿Olvidaste tu contraseña?"
              description="Escribe el correo de tu cuenta y te enviamos un enlace para crear una nueva."
            />
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" placeholder="tu@correo.com" autoFocus className="h-10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="h-11 w-full rounded-xl" disabled={forgot.isPending || cooldown.active}>
                  {forgot.isPending && <Spinner />}
                  {cooldown.active ? `Espera ${cooldown.secondsLeft} s` : 'Enviar enlace'}
                </Button>
              </form>
            </Form>
          </>
        )}
      </AuthCard>
    </CenteredShell>
  )
}
