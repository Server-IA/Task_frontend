import { GithubAccountSection } from '@/features/github/GithubAccount'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { PasswordInput } from '@/components/common/PasswordInput'
import { PasswordRules } from '@/components/common/PasswordRules'
import { Segmented } from '@/components/common/Segmented'
import { THEME_OPTIONS } from '@/components/common/ThemeToggle'
import { AvatarPhoto, avatarColor, initials } from '@/components/common/UserAvatar'
import { useChangePassword, useLogout, useMe, useUpdateLanguage, useUpdateProfile } from '@/features/auth/hooks'
import { dateLocale, getLanguage, LANGUAGES, t } from '@/i18n'
import { changePasswordSchema, profileSchema } from '@/features/auth/schemas'
import { useWorkspaces } from '@/features/workspaces/hooks'
import { useCooldown } from '@/hooks/useCooldown'
import { useTheme } from '@/hooks/useTheme'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { ProfilePhotoSection } from './ProfilePhoto'

export function ProfilePage() {
  const { data: user, isLoading } = useMe()

  if (isLoading || !user) return <CenteredSpinner className="flex-1" />

  return (
    <div className="mx-auto flex w-full max-w-[1320px] min-h-0 flex-1 flex-col gap-3.5">
      <ProfileHeader user={user} />
      <PageBody className="flex flex-col gap-3.5">
        <ProfilePhotoSection user={user} />
        <div className="grid items-start gap-3.5 lg:grid-cols-2">
          <ProfileCard user={user} />
          <ChangePasswordCard />
        </div>
        <GithubAccountSection />
        <SessionCard />
      </PageBody>
    </div>
  )
}

/** Encabezado con el avatar grande, el correo verificado y algunos datos de la cuenta. */
function ProfileHeader({ user }) {
  const { data: workspaces } = useWorkspaces()
  const since = user.createdAt ? format(parseISO(user.createdAt), 'MMM yyyy', { locale: dateLocale() }) : '—'

  return (
    <PageHeader
      path={[{ label: t('~/perfil') }]}
      title={user.fullName}
      documentTitle={[t('Mi perfil')]}
      leading={
        <Avatar className="size-18 self-center rounded-[22px]">
          <AvatarPhoto src={user.avatarUrl} alt={t('Foto de {name}', { name: user.fullName })} className="rounded-[22px]" />
          <AvatarFallback className={cn('rounded-[22px] font-display text-[28px] font-extrabold text-[#23201B]', avatarColor(user.fullName))}>
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
              {t('verificado')}
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
            <dt className="text-[11px] text-muted-foreground">{t('desde')}</dt>
            <dd className="mt-0.5 text-xl font-semibold">{since}</dd>
          </div>
        </dl>
      }
    />
  )
}

function ProfileCard({ user }) {
  const update = useUpdateProfile()
  const updateLanguage = useUpdateLanguage()
  const { theme, setTheme } = useTheme()
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName },
  })

  // La foto se cambia aparte (ver ProfilePhoto): el formulario solo manda el nombre
  useEffect(() => {
    form.reset({ fullName: user.fullName })
  }, [user.fullName, form])

  const onSubmit = (values) => {
    update.mutate(values, {
      onSuccess: () => toast.success(t('Perfil actualizado')),
      onError: (error) => {
        if (!applyFieldErrors(error, form.setError)) notifyError(error)
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Datos personales')}</CardTitle>
        <CardDescription>{t('Así te ven los demás en las tareas y comentarios.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Nombre completo')}</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <Label htmlFor="profile-email">{t('Correo')}</Label>
              <Input id="profile-email" value={user.email} readOnly disabled className="border-dashed border-dash" />
              <p className="font-mono text-[11px] text-muted-foreground">{t('el correo no se puede cambiar')}</p>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">{t('Tema')}</span>
              <Segmented
                label={t('Tema')}
                value={theme}
                onChange={setTheme}
                options={THEME_OPTIONS.map(({ value, label }) => ({ value, label }))}
                className="rounded-xl border-transparent bg-muted p-1"
                itemClassName="flex-1 rounded-[9px] text-foreground/70"
                thumbClassName="rounded-[9px] bg-card shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">{t('Idioma')}</span>
              <Segmented
                label={t('Idioma de la interfaz')}
                value={getLanguage()}
                // Se guarda en la cuenta; al volver la respuesta, la página se recarga en el idioma nuevo
                onChange={(code) => updateLanguage.mutate(code, { onError: (error) => notifyError(error, t('No se pudo cambiar el idioma')) })}
                options={LANGUAGES.map(({ code, label }) => ({ value: code, label }))}
                className="rounded-xl border-transparent bg-muted p-1"
                itemClassName="flex-1 rounded-[9px] text-foreground/70"
                thumbClassName="rounded-[9px] bg-card shadow-sm"
              />
              <p className="text-xs text-muted-foreground">{t('El idioma en el que ves TaskFlow. Al cambiarlo la página se recarga.')}</p>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
                {update.isPending && <Spinner />}
                {t('Guardar cambios')}
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
  // Tras un 429 (demasiados intentos) el botón espera lo que indica Retry-After
  const cooldown = useCooldown()
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
          toast.success(t('Contraseña actualizada'), {
            description: t('Cerramos tus sesiones en otros dispositivos.'),
          })
        },
        onError: (error) => {
          if (!applyFieldErrors(error, form.setError)) cooldown.start(notifyError(error))
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Contraseña')}</CardTitle>
        <CardDescription>{t('Al cambiarla se cierran tus otras sesiones.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Contraseña actual')}</FormLabel>
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
                  <FormLabel>{t('Nueva contraseña')}</FormLabel>
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
                  <FormLabel>{t('Confirmar nueva contraseña')}</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" placeholder={t('Repite la contraseña')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={changePassword.isPending || cooldown.active}
              >
                {changePassword.isPending && <Spinner />}
                {cooldown.active ? t('Espera {seconds} s', { seconds: cooldown.secondsLeft }) : t('Cambiar contraseña')}
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
  return (
    <section
      aria-labelledby="sesion-titulo"
      className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-dashed border-dash px-5 py-4"
    >
      <div className="flex-[1_1_300px]">
        <h2 id="sesion-titulo" className="text-[15px] font-semibold">
          {t('Sesión')}
        </h2>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">{t('cierra la sesión en este navegador')}</p>
      </div>
      <Button
        variant="outline"
        className="font-semibold text-late"
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
      >
        {t('Cerrar sesión')}
      </Button>
    </section>
  )
}
