import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate } from 'react-router'
import { MailWarning } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/common/PasswordInput'
import { Spinner } from '@/components/common/Loaders'
import { PriorityIcon } from '@/features/issues/components/PriorityIcon'
import { AuthHeader, SplitShell } from '@/layouts/AuthLayout'
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
    <SplitShell caption="tableros · ciclos · módulos" panel={<MiniBoard />}>
      <AuthHeader path="~/acceso/login" title="Hola de nuevo" description="Entra con tu correo para seguir con tus tareas." />

      {unverifiedEmail && (
        <Alert>
          <MailWarning />
          <AlertTitle>Verifica tu correo</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Antes de iniciar sesión, abre el enlace que te enviamos a {unverifiedEmail}.</p>
            <ResendVerificationButton email={unverifiedEmail} className="w-full" />
          </AlertDescription>
        </Alert>
      )}

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
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-baseline justify-between">
                  <FormLabel>Contraseña</FormLabel>
                  <Link to="/forgot-password" className="text-[13px] font-medium text-accent-text hover:underline">
                    ¿La olvidaste?
                  </Link>
                </div>
                <FormControl>
                  <PasswordInput autoComplete="current-password" className="h-10" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="mt-1 h-11 w-full rounded-xl" disabled={login.isPending || cooldown.active}>
            {login.isPending && <Spinner />}
            {cooldown.active ? `Espera ${cooldown.secondsLeft} s` : 'Entrar'}
            {!login.isPending && !cooldown.active && (
              <kbd className="rounded-[5px] border border-foreground/25 px-1.5 text-[11px] font-normal">↵</kbd>
            )}
          </Button>
        </form>
      </Form>

      <div role="note" className="flex gap-2.5 rounded-2xl border border-dashed border-dash px-3.5 py-3">
        <span aria-hidden="true" className="font-mono text-accent-text">
          i
        </span>
        <p className="text-[13px] text-muted-foreground">
          ¿Te invitaron a un workspace? Abre el enlace del correo de invitación y luego entra con esa misma cuenta.
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        ¿Aún no tienes cuenta?{' '}
        <Link to="/register" state={location.state} className="font-semibold text-accent-text hover:underline">
          Crear cuenta
        </Link>
      </p>
    </SplitShell>
  )
}

/** Tablero de ejemplo del panel de marca (decorativo). */
const DEMO_BOARD = [
  {
    name: 'Por hacer',
    count: '04',
    cards: [
      { code: 'WEB-18', title: 'Pie de página con enlaces', priority: 'LOW' },
      { code: 'WEB-21', title: 'Revisar textos del registro', priority: 'MEDIUM' },
    ],
  },
  {
    name: 'En curso',
    count: '02',
    cards: [
      { code: 'WEB-12', title: 'Rediseñar la portada', priority: 'URGENT' },
      { code: 'AMC-07', title: 'Pantalla de pago', priority: 'HIGH' },
    ],
  },
  { name: 'Hecho', count: '11', cards: [{ code: 'WEB-09', title: 'Paleta de colores', priority: 'MEDIUM', done: true }] },
]

function MiniBoard() {
  return (
    <div aria-hidden="true" className="flex w-full max-w-[580px] gap-2.5">
      {DEMO_BOARD.map((column) => (
        <div key={column.name} className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-[14px] bg-sidebar-accent p-2.5">
          <p className="mb-0.5 flex justify-between font-mono text-[11px] text-sidebar-muted">
            <span>{column.name}</span>
            <span>{column.count}</span>
          </p>
          {column.cards.map((card) => (
            <div key={card.code} className="rounded-[10px] border border-sidebar-border bg-card px-2.5 py-2.5">
              <p className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                {card.code}
                <PriorityIcon priority={card.priority} className="size-3.5" />
              </p>
              <p className={`mt-1 text-[13px] font-medium ${card.done ? 'line-through' : ''}`}>{card.title}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
