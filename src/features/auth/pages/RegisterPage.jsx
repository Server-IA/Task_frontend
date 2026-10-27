import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation } from 'react-router'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/common/PasswordInput'
import { PasswordRules } from '@/components/common/PasswordRules'
import { Spinner } from '@/components/common/Loaders'
import { AuthCard, AuthHeader, AuthIcon, CenteredShell, SplitShell } from '@/layouts/AuthLayout'
import { useCooldown } from '@/hooks/useCooldown'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { ResendVerificationButton } from '../components/ResendVerification'
import { useRegister } from '../hooks'
import { registerSchema } from '../schemas'

const STEPS = [
  { n: '01', title: 'Crea tu cuenta', body: 'Nombre, correo y contraseña.', tag: 'ahora' },
  { n: '02', title: 'Confirma tu correo', body: 'Un clic en el enlace que te enviamos.', tag: '~1 min' },
  { n: '03', title: 'Arma tu workspace', body: 'Invita a tu equipo y crea el primer proyecto.', tag: '~2 min' },
]

export function RegisterPage() {
  const location = useLocation()
  const register = useRegister()
  const cooldown = useCooldown()
  const [registeredEmail, setRegisteredEmail] = useState(null)

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: location.state?.email ?? '', password: '', confirmPassword: '' },
  })
  const password = useWatch({ control: form.control, name: 'password' })

  const onSubmit = ({ fullName, email, password: value }) => {
    register.mutate(
      { fullName, email, password: value },
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
    <SplitShell caption="registro en 3 pasos" panel={<Steps />}>
      <AuthHeader
        path="~/acceso/registro · paso 1/3"
        title="Crea tu cuenta"
        description="Te enviaremos un correo para confirmar que es tuyo."
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre completo</FormLabel>
                <FormControl>
                  <Input autoComplete="name" placeholder="Ana Pérez" autoFocus className="h-10" {...field} />
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
                  <Input type="email" autoComplete="email" placeholder="tu@correo.com" className="h-10" {...field} />
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
                  <PasswordInput autoComplete="new-password" className="h-10" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <PasswordRules value={password} meter />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar contraseña</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" placeholder="Repite la contraseña" className="h-10" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="mt-1 h-11 w-full rounded-xl" disabled={register.isPending || cooldown.active}>
            {register.isPending && <Spinner />}
            {cooldown.active ? `Espera ${cooldown.secondsLeft} s` : 'Crear cuenta'}
          </Button>
        </form>
      </Form>
      <p className="text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" state={location.state} className="font-semibold text-accent-text hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </SplitShell>
  )
}

function Steps() {
  return (
    <ol className="flex w-full max-w-[480px] flex-col gap-2">
      {STEPS.map((step, index) => (
        <li
          key={step.n}
          className={cn(
            'flex items-center gap-3.5 rounded-[14px] border border-transparent px-4 py-3.5',
            index === 0 && 'border-sidebar-border bg-card',
          )}
        >
          <span
            className={cn(
              'flex size-7.5 items-center justify-center rounded-[9px] font-mono text-xs font-semibold',
              index === 0 ? 'bg-primary text-primary-foreground' : 'bg-sidebar-accent text-sidebar-muted',
            )}
          >
            {step.n}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{step.title}</span>
            <span className="block text-[13px] text-sidebar-muted">{step.body}</span>
          </span>
          <span className={cn('font-mono text-[11px]', index === 0 ? 'text-sidebar-foreground' : 'text-sidebar-muted')}>{step.tag}</span>
        </li>
      ))}
    </ol>
  )
}

function CheckYourEmail({ email }) {
  return (
    <CenteredShell meta="~/acceso/registro · paso 2/3">
      <AuthCard aria-labelledby="revisa-titulo">
        <AuthIcon>
          <Mail className="size-7" strokeWidth={1.8} />
        </AuthIcon>
        <div id="revisa-titulo">
          <AuthHeader
            size="md"
            title="Revisa tu correo"
            description={
              <>
                Enviamos un enlace de confirmación a <strong className="font-semibold text-foreground">{email}</strong>. Ábrelo
                desde este dispositivo o cualquier otro.
              </>
            }
          />
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 rounded-xl bg-muted px-3.5 py-3 font-mono text-xs">
          <dt className="text-muted-foreground">asunto</dt>
          <dd>Verifica tu cuenta de TaskFlow</dd>
          <dt className="text-muted-foreground">expira</dt>
          <dd>en 24 h</dd>
        </dl>
        <div className="flex flex-wrap gap-2">
          <ResendVerificationButton email={email} className="h-10 flex-[1_1_180px] rounded-xl" />
          <Button asChild className="h-10 flex-[1_1_140px] rounded-xl">
            <Link to="/login" state={{ email }}>
              Ir a iniciar sesión
            </Link>
          </Button>
        </div>
        <p className="border-t border-dashed border-dash pt-3.5 text-[13px] text-muted-foreground">
          ¿No llega? Revisa spam o promociones. ¿Escribiste mal el correo?{' '}
          <Link to="/register" reloadDocument className="font-semibold text-accent-text hover:underline">
            Regístrate de nuevo
          </Link>
        </p>
      </AuthCard>
    </CenteredShell>
  )
}
