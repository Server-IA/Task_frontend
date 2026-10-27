import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { PasswordInput } from '@/components/common/PasswordInput'
import { PasswordRules } from '@/components/common/PasswordRules'
import { THEME_OPTIONS } from '@/components/common/ThemeToggle'
import { initials } from '@/components/common/UserAvatar'
import { useChangePassword, useLogout, useMe, useUpdateProfile } from '@/features/auth/hooks'
import { changePasswordSchema, profileSchema } from '@/features/auth/schemas'
import { useWorkspaces } from '@/features/workspaces/hooks'
import { useTheme } from '@/hooks/useTheme'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'

export function ProfilePage() {
  const { data: user, isLoading } = useMe()

  if (isLoading || !user) return <CenteredSpinner className="flex-1" />

  return (
    <div className="mx-auto flex w-full max-w-[920px] min-h-0 flex-1 flex-col gap-3.5">
      <ProfileHeader user={user} />
      <PageBody className="flex flex-col gap-3.5">
        <div className="grid items-start gap-3.5 lg:grid-cols-2">
          <ProfileCard user={user} />
          <ChangePasswordCard />
        </div>
        <SessionCard />
      </PageBody>
    </div>
  )
}

/** Encabezado con el avatar grande, el correo verificado y algunos datos de la cuenta. */
function ProfileHeader({ user }) {
  const { data: workspaces } = useWorkspaces()
  const since = user.createdAt ? format(parseISO(user.createdAt), 'MMM yyyy', { locale: es }) : '—'

  return (
    <PageHeader
      path={[{ label: '~/perfil' }]}
      title={user.fullName}
      documentTitle={['Mi perfil']}
      leading={
        <Avatar className="size-18 self-center rounded-[22px]">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} className="rounded-[22px]" />}
          <AvatarFallback className="rounded-[22px] bg-[#B6A6FF] font-display text-[28px] font-extrabold text-[#23201B]">
            {initials(user.fullName)}
          </AvatarFallback>
        </Avatar>
      }
      description={
        <span className="flex flex-wrap items-center gap-2">
          {user.email}
          {user.emailVerified && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ok">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-ok-dot" />
              verificado
            </span>
          )}
        </span>
      }
      actions={
        <dl className="flex gap-6 font-mono">
          <div>
            <dt className="text-[11px] text-muted-foreground">workspaces</dt>
            <dd className="mt-0.5 text-xl font-semibold">{workspaces?.length ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">desde</dt>
            <dd className="mt-0.5 text-xl font-semibold">{since}</dd>
          </div>
        </dl>
      }
    />
  )
}

function ProfileCard({ user }) {
  const update = useUpdateProfile()
  const { theme, setTheme } = useTheme()
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName, avatarUrl: user.avatarUrl ?? '' },
  })

  useEffect(() => {
    form.reset({ fullName: user.fullName, avatarUrl: user.avatarUrl ?? '' })
  }, [user, form])

  const onSubmit = (values) => {
    update.mutate(values, {
      onSuccess: () => toast.success('Perfil actualizado'),
      onError: (error) => {
        if (!applyFieldErrors(error, form.setError)) notifyError(error)
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos personales</CardTitle>
        <CardDescription>Así te ven los demás en las tareas y comentarios.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del avatar</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://…" {...field} />
                  </FormControl>
                  <FormDescription className="font-mono text-[11px]">vacío = se muestran tus iniciales</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <Label htmlFor="profile-email">Correo</Label>
              <Input id="profile-email" value={user.email} readOnly disabled className="border-dashed border-dash" />
              <p className="font-mono text-[11px] text-muted-foreground">el correo no se puede cambiar</p>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Tema</span>
              <div role="radiogroup" aria-label="Tema" className="flex gap-1 rounded-xl bg-muted p-1">
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={theme === option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'flex-1 rounded-[9px] px-2.5 py-1.5 text-sm font-medium text-muted-foreground',
                      theme === option.value && 'bg-card font-semibold text-foreground shadow-sm',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
                {update.isPending && <Spinner />}
                Guardar cambios
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

function ChangePasswordCard() {
  const changePassword = useChangePassword()
  const form = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const newPassword = useWatch({ control: form.control, name: 'newPassword' })

  const onSubmit = ({ currentPassword, newPassword: password }) => {
    changePassword.mutate(
      { currentPassword, newPassword: password },
      {
        onSuccess: () => {
          form.reset()
          toast.success('Contraseña actualizada', {
            description: 'Cerramos tus sesiones en otros dispositivos.',
          })
        },
        onError: (error) => {
          if (!applyFieldErrors(error, form.setError)) notifyError(error)
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contraseña</CardTitle>
        <CardDescription>Al cambiarla se cierran tus otras sesiones.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña actual</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva contraseña</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <PasswordRules value={newPassword} />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar nueva contraseña</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" placeholder="Repite la contraseña" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={changePassword.isPending}
                className="bg-foreground text-background hover:bg-foreground/85"
              >
                {changePassword.isPending && <Spinner />}
                Cambiar contraseña
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

function SessionCard() {
  const logout = useLogout()
  const navigate = useNavigate()
  return (
    <section
      aria-labelledby="sesion-titulo"
      className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-dashed border-dash px-5 py-4"
    >
      <div className="flex-[1_1_300px]">
        <h2 id="sesion-titulo" className="text-[15px] font-semibold">
          Sesión
        </h2>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">cierra la sesión en este navegador</p>
      </div>
      <Button
        variant="outline"
        className="font-semibold text-late"
        disabled={logout.isPending}
        onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })}
      >
        Cerrar sesión
      </Button>
    </section>
  )
}
