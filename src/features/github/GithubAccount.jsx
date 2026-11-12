import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { t } from '@/i18n'
import { formatShortDate } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { GhMark } from './GithubParts'
import { useLinkGithub, useMyGithub, useUnlinkGithub } from './hooks'

/** A dónde volver después de autorizar en GitHub (se guarda mientras el navegador está allá). */
const RETURN_KEY = 'taskflow.github.return'

export function rememberReturn(path) {
  try {
    sessionStorage.setItem(RETURN_KEY, path)
  } catch {
    // Sin almacenamiento de sesión se vuelve al perfil
  }
}

export function takeReturn() {
  try {
    const path = sessionStorage.getItem(RETURN_KEY)
    sessionStorage.removeItem(RETURN_KEY)
    // Solo rutas de esta app
    return path && path.startsWith('/') && !path.startsWith('//') ? path : '/profile'
  } catch {
    return '/profile'
  }
}

/**
 * «Conectar mi cuenta de GitHub»: pide el enlace y lleva el navegador a GitHub; al autorizar, GitHub trae de vuelta a
 * `/github/callback`, que termina de enlazar y regresa a donde estaba la persona.
 * @returns {{ connect: () => void, pending: boolean }}
 */
export function useConnectGithub() {
  const link = useLinkGithub()
  const [leaving, setLeaving] = useState(false)
  const connect = () =>
    link.mutate(undefined, {
      onSuccess: ({ url }) => {
        rememberReturn(window.location.pathname + window.location.search)
        setLeaving(true)
        window.location.assign(url)
      },
      onError: (error) => notifyError(error, t('No se pudo conectar')),
    })
  return { connect, pending: link.isPending || leaving, leaving }
}

/**
 * Mientras el navegador se va a GitHub (tarda un momento en cambiar de página): una capa tranquila que dice a dónde
 * va, en vez de dejar la pantalla quieta con el botón apagado.
 * @param {{ show: boolean, children: React.ReactNode }} props
 */
export function LeavingForGithub({ show, children }) {
  if (!show) return null
  return (
    <div
      role="status"
      className="bg-background/85 animate-in fade-in-0 fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3.5 backdrop-blur-sm duration-200"
    >
      <GhMark />
      <p className="text-sm font-medium">{children}</p>
      <span aria-hidden="true" className="bg-foreground/10 h-1 w-36 overflow-hidden rounded-full">
        <span className="tf-splash-line bg-ring block h-full w-2/5 rounded-full" />
      </span>
    </div>
  )
}

/**
 * El aviso de que hace falta la cuenta de GitHub para algo, con el botón para conectarla. Si al servidor le falta la
 * configuración de la app, no se muestra (no hay cómo conectarla).
 * @param {{ children: React.ReactNode, short?: boolean, className?: string }} props `short`: botón «Conectar mi cuenta»
 */
export function ConnectAccountNotice({ children, short = false, className }) {
  const { data: account } = useMyGithub()
  const { connect, pending, leaving } = useConnectGithub()
  if (!account || account.linked || !account.configured) return null
  return (
    <div
      role="note"
      className={cn(
        'bg-accent-soft text-accent-text flex flex-wrap items-center gap-3 rounded-xl px-3.5 py-2.75',
        className,
      )}
    >
      <GhMark size="sm" />
      <span className="min-w-0 flex-[1_1_260px] text-[13px] leading-snug">{children}</span>
      <Button size="sm" className="gap-1.5" onClick={connect} disabled={pending}>
        {short ? t('Conectar mi cuenta') : t('Conectar mi cuenta de GitHub')}
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </Button>
      <LeavingForGithub show={leaving}>{t('Abriendo GitHub para conectar tu cuenta…')}</LeavingForGithub>
    </div>
  )
}

const CAN = () => [
  [t('Crear la rama de una tarea'), t('si puedes editar tareas')],
  [t('Ejecutar, reintentar y cancelar workflows'), t('si tu rol tiene «Ejecutar workflows»')],
  [t('Aparecer con tu nombre y tu foto'), t('en los pull requests que abras y en la actividad de la tarea')],
]

/**
 * «Cuentas conectadas» del perfil: la cuenta de GitHub de la persona. Con ella lo que hace en GitHub desde TaskFlow sale
 * a su nombre y solo donde ella tiene acceso; sin ella puede ver, no actuar.
 */
export function GithubAccountSection() {
  const { data: account, isLoading, isError, refetch } = useMyGithub()
  const { connect, pending } = useConnectGithub()
  const unlink = useUnlinkGithub()
  const [confirming, setConfirming] = useState(false)

  const handleUnlink = () =>
    unlink.mutateAsync(undefined).then(
      () => {
        toast.success(t('Tu cuenta de GitHub quedó desconectada'))
        setConfirming(false)
      },
      (error) => notifyError(error, t('No se pudo desconectar')),
    )

  return (
    <section aria-labelledby="cuentas-titulo" className="tf-panel flex flex-col gap-3.5 px-5 py-4.5">
      <div>
        <h2 id="cuentas-titulo" className="text-[15px] font-semibold">
          {t('Cuentas conectadas')}
        </h2>
        <p className="text-muted-foreground mt-1 max-w-[760px] text-sm leading-normal">
          {t(
            'Tu cuenta de GitHub le dice a TaskFlow quién eres allá: lo que hagas desde aquí (crear una rama, ejecutar un workflow) sale a tu nombre y solo donde tú tengas acceso.',
          )}
        </p>
      </div>
      {isError && !account ? (
        <p className="border-dash text-muted-foreground rounded-[14px] border border-dashed px-4 py-3.5 text-[13px]">
          {t('No se pudo consultar tu cuenta de GitHub.')}{' '}
          <button type="button" className="text-foreground font-semibold underline" onClick={() => refetch()}>
            {t('Reintentar')}
          </button>
        </p>
      ) : isLoading || !account ? (
        <Skeleton className="h-17 rounded-[14px]" />
      ) : account.linked ? (
        <div className="flex flex-col gap-3 rounded-[14px] border px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-3.5">
            <GhMark className="size-10 rounded-[11px] text-[13px]" />
            <div className="min-w-0 flex-[1_1_320px]">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                GitHub
                <span className="bg-ok-soft text-ok inline-flex items-center gap-1.5 rounded-full px-2.25 py-0.5 font-mono text-[11px] font-semibold">
                  <span aria-hidden="true" className="bg-ok size-1.5 rounded-full" />
                  {t('conectada')}
                </span>
              </p>
              <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                @{account.login} · {t('conectada el {date}', { date: formatShortDate(account.linkedAt) })} ·{' '}
                <a
                  href={account.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground underline"
                >
                  {t('ver en GitHub')}
                </a>
              </p>
            </div>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirming(true)}
            >
              {t('Desconectar')}
            </Button>
          </div>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {CAN().map(([what, note]) => (
              <li key={what} className="flex gap-2.25">
                <span aria-hidden="true" className="text-ok font-mono">
                  +
                </span>
                <span>
                  {what} <span className="text-muted-foreground">{note}</span>
                </span>
              </li>
            ))}
            <li className="text-muted-foreground flex gap-2.25">
              <span aria-hidden="true" className="font-mono">
                –
              </span>
              <span>
                {t(
                  'TaskFlow no ve tus repositorios personales ni actúa fuera de los que el workspace compartió.',
                )}
              </span>
            </li>
          </ul>
        </div>
      ) : (
        <div className="border-dash flex flex-wrap items-center gap-3.5 rounded-[14px] border border-dashed px-4 py-3.5">
          <GhMark className="size-10 rounded-[11px] text-[13px]" />
          <div className="min-w-0 flex-[1_1_320px]">
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              GitHub
              <span className="bg-muted text-muted-foreground rounded-full px-2.25 py-0.5 font-mono text-[11px] font-normal">
                {t('sin conectar')}
              </span>
            </p>
            <p className="text-muted-foreground mt-0.5 text-[13px] leading-snug">
              {account.configured
                ? t(
                    'Sin conectarla puedes ver ramas, pull requests y pipelines, pero no crear ramas ni ejecutar workflows.',
                  )
                : t('Este servidor todavía no tiene configurada la integración con GitHub.')}
            </p>
          </div>
          {account.configured && (
            <Button className="gap-2" onClick={connect} disabled={pending}>
              {t('Conectar mi cuenta de GitHub')}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('¿Desconectar tu cuenta de GitHub?')}
        description={t(
          'Podrás seguir viendo ramas, pull requests y pipelines, pero no crear ramas ni ejecutar workflows hasta que la conectes otra vez. En GitHub no se borra nada.',
        )}
        confirmLabel={t('Desconectar')}
        loading={unlink.isPending}
        onConfirm={handleUnlink}
      />
    </section>
  )
}
