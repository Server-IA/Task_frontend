import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/common/Loaders'
import { UserAvatar } from '@/components/common/UserAvatar'
import { emailSchema } from '@/features/auth/schemas'
import { t, tn, tx } from '@/i18n'
import { AuthHeader, CenteredShell } from '@/layouts/AuthLayout'
import { UserMenu } from '@/layouts/UserMenu'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { slugify } from '@/lib/slug'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/sessionStore'
import { invitationsApi } from '../api'
import { WorkspaceLogo } from '../components/WorkspaceSwitcher'
import { useCreateWorkspace, useWorkspaces } from '../hooks'
import { workspaceSchema } from '../schemas'

/** Crear el primer workspace (o uno nuevo desde fuera de la app), con invitaciones opcionales. */
export function OnboardingPage() {
  const user = useSessionStore((state) => state.user)
  const createWorkspace = useCreateWorkspace()
  const { data: workspaces = [] } = useWorkspaces()
  const navigate = useNavigate()
  const [invites, setInvites] = useState([])
  const [sendingInvites, setSendingInvites] = useState(false)
  const slugTouched = useRef(false)
  const isFirst = workspaces.length === 0

  const form = useForm({ resolver: zodResolver(workspaceSchema), defaultValues: { name: '', slug: '' } })
  const [name, slug] = useWatch({ control: form.control, name: ['name', 'slug'] })

  // Mientras no se edite a mano, el identificador sale del nombre
  useEffect(() => {
    if (!slugTouched.current) form.setValue('slug', slugify(name ?? ''), { shouldValidate: form.formState.isSubmitted })
  }, [name, form])

  const onSubmit = (values) => {
    createWorkspace.mutate(values, {
      onSuccess: async (workspace) => {
        if (invites.length > 0) {
          setSendingInvites(true)
          const results = await Promise.allSettled(
            invites.map((email) => invitationsApi.invite(workspace.slug, { email, role: 'MEMBER' })),
          )
          setSendingInvites(false)
          const failed = results.filter((result) => result.status === 'rejected').length
          if (failed > 0) toast.warning(tn(failed, '{count} invitación no se pudo enviar', '{count} invitaciones no se pudieron enviar'))
        }
        toast.success(t('¡Workspace creado!'))
        navigate(`/${workspace.slug}`, { replace: true })
      },
      onError: (error) => {
        if (!applyFieldErrors(error, form.setError)) notifyError(error)
      },
    })
  }

  const pending = createWorkspace.isPending || sendingInvites
  const steps = isFirst
    ? [
        { label: t('cuenta'), done: true },
        { label: t('correo'), done: true },
        { label: 'workspace', done: false },
      ]
    : []

  return (
    <CenteredShell
      meta={
        <div className="flex items-center gap-3">
          {steps.length > 0 && (
            <ol aria-label={t('Progreso')}className="hidden gap-1.5 sm:flex">
              {steps.map((step) => (
                <li
                  key={step.label}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px]',
                    step.done ? 'bg-muted font-medium text-ok' : 'bg-primary font-semibold text-primary-foreground',
                  )}
                >
                  {step.done ? '✓' : '●'} {step.label}
                </li>
              ))}
            </ol>
          )}
          <div className="w-52 font-sans">
            <UserMenu />
          </div>
        </div>
      }
      footer={<span>{t('¿Te invitaron a uno? abre el enlace del correo')}</span>}
    >
      <div className="flex w-full flex-wrap items-center justify-center gap-7">
        <section aria-labelledby="onboarding-titulo" className="flex w-full max-w-[460px] flex-col gap-5.5">
          <div id="onboarding-titulo">
            <AuthHeader
              path={isFirst ? t('~/nuevo-workspace · paso 3/3') : t('~/nuevo-workspace')}
              title={isFirst ? t('Arma tu primer workspace') : t('Crea un workspace')}
              description={
                isFirst
                  ? t('Hola, {name}. Un workspace agrupa a tu equipo y sus proyectos. Puedes crear más después.', {
                      name: user?.fullName?.split(' ')[0] ?? '',
                    })
                  : t('Un workspace agrupa a tu equipo y sus proyectos. Puedes crear más después.')
              }
            />
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Nombre del workspace')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('Equipo de producto')}autoFocus className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Identificador')}</FormLabel>
                    <FormControl>
                      <div className="flex h-10 items-center overflow-hidden rounded-md border border-input bg-card font-mono text-[13px] focus-within:ring-[3px] focus-within:ring-ring/50">
                        <span className="pl-3 text-muted-foreground select-none">{window.location.host}/</span>
                        <input
                          className="min-w-0 flex-1 bg-transparent pr-3 outline-none"
                          {...field}
                          onChange={(event) => {
                            slugTouched.current = true
                            field.onChange(event.target.value.toLowerCase())
                          }}
                        />
                      </div>
                    </FormControl>
                    <p className="font-mono text-[11px] text-muted-foreground">{t('minúsculas, números y guiones')}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <InviteEmails value={invites} onChange={setInvites} ownEmail={user?.email} />
              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <Button type="submit" className="h-11 flex-[1_1_200px] rounded-xl" disabled={pending}>
                  {pending && <Spinner />}
                  {t('Crear workspace')}
                </Button>
                {workspaces.length > 0 && (
                  <Link to="/" className="text-[13px] font-medium text-muted-foreground hover:text-foreground">
                    {t('Volver a mis workspaces')}
                  </Link>
                )}
              </div>
            </form>
          </Form>
        </section>

        <SidebarPreview name={name} slug={slug} user={user} invites={invites.length} />
      </div>
    </CenteredShell>
  )
}

/** Campo de correos como pastillas: Enter, coma o salir del campo agregan el correo. */
function InviteEmails({ value, onChange, ownEmail }) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(null)

  const add = () => {
    const email = draft.trim().replace(/,$/, '').toLowerCase()
    if (!email) return
    if (!emailSchema.safeParse(email).success) {
      setError(t('Ese correo no es válido'))
      return
    }
    if (email === ownEmail?.toLowerCase()) {
      setError(t('Ya eres parte del workspace'))
      return
    }
    if (!value.includes(email)) onChange([...value, email])
    setDraft('')
    setError(null)
  }

  return (
    <div className="space-y-2">
      <label htmlFor="invite-input" className="text-sm font-medium">
        {t('Invita a tu equipo')} <span className="font-normal text-muted-foreground">{t('(opcional)')}</span>
      </label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-card px-2 py-1.5 focus-within:ring-[3px] focus-within:ring-ring/50">
        {value.map((email) => (
          <span key={email} className="flex items-center gap-1 rounded-lg bg-muted py-0.5 pr-1 pl-2.5 font-mono text-xs">
            {email}
            <button
              type="button"
              className="flex size-4.5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              onClick={() => onChange(value.filter((item) => item !== email))}
              aria-label={t('Quitar {email}', { email })}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id="invite-input"
          type="email"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setError(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              add()
            }
            if (event.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1))
          }}
          onBlur={add}
          placeholder={t('correo@equipo.com')}
          className="min-w-36 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <p className="font-mono text-[11px] text-muted-foreground">{t('les llegará un correo para unirse como miembros')}</p>
      )}
    </div>
  )
}

/** Vista previa de cómo se verá la barra lateral con el workspace nuevo. */
function SidebarPreview({ name, slug, user, invites }) {
  return (
    <figure aria-label={t('Vista previa')} className="m-0 hidden w-full max-w-[420px] flex-col gap-3 rounded-[22px] border border-dashed border-dash p-4.5 md:flex">
      <figcaption className="font-mono text-[11px] text-muted-foreground">{t('// así se verá tu barra lateral')}</figcaption>
      <div aria-hidden="true" className="flex flex-col gap-3.5 rounded-2xl bg-sidebar px-3 py-3.5 text-sidebar-foreground">
        <div className="flex items-center gap-2.5 p-1.5">
          <WorkspaceLogo name={name || t('Mi equipo')} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{name || t('Mi equipo')}</span>
            <span className="block truncate font-mono text-[11px] text-sidebar-muted">{slug || t('mi-equipo')}</span>
          </span>
        </div>
        <div className="flex flex-col gap-0.5 text-sm">
          {[t('Bandeja'), t('Proyectos'), t('Ajustes')].map((item) => (
            <span key={item} className="rounded-[10px] px-2.5 py-2">
              {item}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-2 rounded-[14px] border border-dashed border-sidebar-border p-3.5">
          <p className="font-mono text-[11px] text-sidebar-muted">{t('// proyectos')}</p>
          <p className="text-[13px] text-sidebar-muted">
            {tx('Aún no hay proyectos. El siguiente paso será crear el primero, por ejemplo {code}.', {
              code: <span className="font-mono text-sidebar-foreground">WEB</span>,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 p-1.5">
          <span className="flex">
            <UserAvatar user={user} size="sm" />
            {invites > 0 && (
              <span className="-ml-1.5 flex size-6 items-center justify-center rounded-full border border-dashed border-sidebar-muted bg-sidebar font-mono text-[10px] font-bold text-sidebar-muted">
                +{invites}
              </span>
            )}
          </span>
          <span className="text-xs text-sidebar-muted">
            {invites > 0 ? tn(invites, 'tú + {count} invitación', 'tú + {count} invitaciones') : t('tú')}
          </span>
        </div>
      </div>
    </figure>
  )
}
