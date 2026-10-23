import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BadgeCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CenteredSpinner, Spinner } from '@/components/common/Loaders'
import { PasswordInput } from '@/components/common/PasswordInput'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useChangePassword, useMe, useUpdateProfile } from '@/features/auth/hooks'
import { changePasswordSchema, profileSchema } from '@/features/auth/schemas'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'

export function ProfilePage() {
  const { data: user, isLoading } = useMe()

  return (
    <>
      <PageHeader breadcrumbs={[{ label: 'Mi perfil' }]} />
      <PageBody>
        <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
          {isLoading || !user ? (
            <CenteredSpinner />
          ) : (
            <>
              <ProfileCard user={user} />
              <ChangePasswordCard />
            </>
          )}
        </div>
      </PageBody>
    </>
  )
}

function ProfileCard({ user }) {
  const update = useUpdateProfile()
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName, avatarUrl: user.avatarUrl ?? '' },
  })

  useEffect(() => {
    form.reset({ fullName: user.fullName, avatarUrl: user.avatarUrl ?? '' })
  }, [user, form])

  const [fullName, avatarUrl] = useWatch({ control: form.control, name: ['fullName', 'avatarUrl'] })
  const preview = { ...user, fullName, avatarUrl: avatarUrl || null }

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
        <CardTitle>Información personal</CardTitle>
        <CardDescription>Así te verán los demás miembros de tus workspaces.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex items-center gap-4">
          <UserAvatar user={preview} size="xl" />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{preview.fullName || 'Sin nombre'}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="truncate">{user.email}</span>
              {user.emailVerified && (
                <Badge variant="secondary" className="gap-1">
                  <BadgeCheck className="size-3" />
                  Verificado
                </Badge>
              )}
            </div>
          </div>
        </div>
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
                  <FormDescription>Déjalo vacío para mostrar tus iniciales.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <Label>Correo</Label>
              <Input value={user.email} disabled readOnly />
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

  const onSubmit = ({ currentPassword, newPassword }) => {
    changePassword.mutate(
      { currentPassword, newPassword },
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
        <CardTitle>Cambiar contraseña</CardTitle>
        <CardDescription>Al cambiarla se cerrarán tus sesiones en otros dispositivos.</CardDescription>
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
            <div className="grid gap-4 sm:grid-cols-2">
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
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={changePassword.isPending}>
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
