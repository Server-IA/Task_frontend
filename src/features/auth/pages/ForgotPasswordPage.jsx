import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'
import { MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/common/Loaders'
import { AuthHeader } from '@/layouts/AuthLayout'
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

  if (sentTo) {
    return (
      <Card>
        <CardContent className="space-y-5 pt-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold">Revisa tu correo</h1>
            <p className="text-sm text-muted-foreground">
              Si <span className="font-medium text-foreground">{sentTo}</span> está registrado, recibirás un
              enlace para restablecer tu contraseña. Vence en 60 minutos.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to="/login">Volver a iniciar sesión</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <AuthHeader
        title="¿Olvidaste tu contraseña?"
        description="Escribe tu correo y te enviaremos un enlace para crear una nueva."
      />
      <Card>
        <CardContent className="pt-6">
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
              <Button type="submit" className="w-full" disabled={forgot.isPending || cooldown.active}>
                {forgot.isPending && <Spinner />}
                {cooldown.active ? `Espera ${cooldown.secondsLeft} s` : 'Enviar enlace'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </>
  )
}
