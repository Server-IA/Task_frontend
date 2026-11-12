import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ArrowUpRight, GitBranch, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ErrorState } from '@/components/common/States'
import { ProjectIcon } from '@/features/projects/components/ProjectIcon'
import { useProjects } from '@/features/projects/hooks'
import { t } from '@/i18n'
import { formatRelative, formatShortDate } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { can } from '@/lib/permissions'
import { githubApi } from './api'
import { GhMark } from './GithubParts'
import { ConnectAccountNotice, LeavingForGithub } from './GithubAccount'
import {
  useDisconnectGithub,
  useGithubLinked,
  useGithubWorkspace,
  useInstallGithub,
  useSetRepositories,
  useSyncGithub,
} from './hooks'

/** Lo que GitHub trae de vuelta en la dirección al terminar de instalar la app. */
const RESULTS = {
  connected: () => toast.success(t('GitHub quedó conectado')),
  taken: () => toast.error(t('Esa instalación de GitHub ya está conectada a otro workspace')),
  expired: () => toast.error(t('El enlace para conectar caducó. Vuelve a pulsar «Conectar con GitHub».')),
  invalid: () => toast.error(t('No se pudo conectar con GitHub. Vuelve a intentarlo desde aquí.')),
  failed: () => toast.error(t('No se pudo conectar con GitHub. Vuelve a intentarlo desde aquí.')),
  unlinked: () =>
    toast.error(t('Conecta primero tu cuenta de GitHub y vuelve a pulsar «Conectar con GitHub».')),
  foreign: () =>
    toast.error(
      t(
        'Esa instalación no es tuya: para conectarla tienes que ser la cuenta de GitHub donde se instaló o dueño de esa organización.',
      ),
    ),
}

/**
 * Pestaña «Integraciones» de los ajustes del workspace: conectar GitHub (instalar la app de TaskFlow en la
 * organización o la cuenta), ver qué repositorios comparte y a qué proyecto va cada uno, y desconectarlo.
 * @param {{ workspace: import('@/api/types').WorkspaceResponse }} props
 */
export function WorkspaceIntegrations({ workspace }) {
  const { data: status, error, refetch } = useGithubWorkspace(workspace.slug)
  const [searchParams, setSearchParams] = useSearchParams()
  const result = searchParams.get('github')
  const canManage = can(workspace, 'GITHUB_MANAGE')

  // Al volver de GitHub la dirección trae cómo salió: se dice una vez y se quita de la dirección
  useEffect(() => {
    if (!result) return
    RESULTS[result]?.()
    setSearchParams({ tab: 'integrations' }, { replace: true })
  }, [result, setSearchParams])

  if (!status && !error) {
    return (
      <div className="mx-auto flex max-w-[940px] flex-col gap-3.5">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    )
  }
  if (!status) {
    return (
      <div className="mx-auto max-w-[940px]">
        <ErrorState error={error} onRetry={refetch} className="tf-panel" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-[940px] flex-col gap-3.5">
      {status.connected ? (
        <Connected workspace={workspace} status={status} canManage={canManage} />
      ) : (
        <Connect workspace={workspace} status={status} canManage={canManage} />
      )}
      <Scope />
    </div>
  )
}

const HOW = () => [
  [
    t('Instalas la app de TaskFlow'),
    t('En tu organización o tu cuenta de GitHub. Hace falta ser dueño o administrador allá.'),
  ],
  [
    t('Eliges los repositorios'),
    t('Todos o solo algunos. TaskFlow no ve los demás, y se puede cambiar después.'),
  ],
  [
    t('Enlazas cada proyecto'),
    t('En Ajustes del proyecto → GitHub dices qué repositorios son de ese proyecto.'),
  ],
]

function Connect({ workspace, status, canManage }) {
  const install = useInstallGithub(workspace.slug)
  // Conectar el workspace pide tener enlazada la cuenta propia: con ella se comprueba que la instalación es de quien la pide
  const linked = useGithubLinked()
  const [leaving, setLeaving] = useState(false)
  const handleConnect = () =>
    install.mutate(undefined, {
      // Se va a GitHub en esta misma pestaña: al terminar, GitHub trae de vuelta a esta página
      onSuccess: ({ url }) => {
        setLeaving(true)
        window.location.assign(url)
      },
      onError: (connectError) => notifyError(connectError, t('No se pudo conectar')),
    })

  return (
    <section aria-labelledby="github-connect-title" className="tf-panel flex flex-col gap-4.5 px-6 py-5.5">
      <div className="flex flex-wrap items-center gap-3.5">
        <GhMark />
        <div className="flex-[1_1_320px]">
          <h2 id="github-connect-title" className="text-[19px] font-semibold">
            {t('Conecta GitHub')}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm leading-normal">
            {t(
              'Cada tarea muestra su rama, sus pull requests y el resultado de sus pipelines, y se mueve sola cuando el PR se abre o se fusiona.',
            )}
          </p>
        </div>
        {canManage && status.configured && (
          <Button
            onClick={handleConnect}
            disabled={install.isPending || leaving || !linked}
            className="gap-2"
          >
            {t('Conectar con GitHub')}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
      <LeavingForGithub show={leaving}>{t('Abriendo GitHub para instalar la app…')}</LeavingForGithub>
      {canManage && status.configured && (
        <ConnectAccountNotice>
          {t(
            'Primero conecta tu cuenta de GitHub. Así TaskFlow comprueba que la instalación es de alguien de este workspace y no de otra persona.',
          )}
        </ConnectAccountNotice>
      )}
      {!status.configured && (
        <p
          role="status"
          className="bg-soon-soft text-soon rounded-xl px-3.5 py-2.5 text-[13px] leading-normal"
        >
          {t(
            'A este servidor le falta la configuración de la GitHub App (identificador, clave privada, secreto de los avisos y cliente de OAuth). Cuando esté, aquí aparece el botón para conectar.',
          )}
        </p>
      )}
      {status.configured && !canManage && (
        <p className="bg-muted text-muted-foreground rounded-xl px-3.5 py-2.5 text-[13px] leading-normal">
          {t(
            'Conectar GitHub pide el permiso «Configurar GitHub». Pídeselo a quien administra el workspace.',
          )}
        </p>
      )}
      <ol className="grid gap-3 md:grid-cols-3">
        {HOW().map(([title, text], index) => (
          <li key={title} className="flex flex-col gap-1.5 rounded-[14px] border px-4 py-3.5">
            <span
              aria-hidden="true"
              className="bg-muted flex size-6 items-center justify-center rounded-full font-mono text-xs font-semibold"
            >
              {index + 1}
            </span>
            <span className="font-semibold">{title}</span>
            <span className="text-muted-foreground text-[13px] leading-snug">{text}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Connected({ workspace, status, canManage }) {
  const sync = useSyncGithub(workspace.slug)
  const disconnect = useDisconnectGithub(workspace.slug)
  const [confirming, setConfirming] = useState(false)

  const account =
    status.accountType === 'Organization'
      ? t('organización {name}', { name: status.accountLogin })
      : t('cuenta {name}', { name: status.accountLogin })
  const facts = [
    account,
    status.installedByName &&
      status.installedAt &&
      t('instalada por {name} el {date}', {
        name: status.installedByName,
        date: formatShortDate(status.installedAt),
      }),
    status.lastEventAt
      ? t('último aviso recibido {when}', { when: formatRelative(status.lastEventAt) })
      : t('todavía no ha llegado ningún aviso'),
  ]

  const handleSync = () =>
    sync.mutate(undefined, {
      onSuccess: () => toast.success(t('Lista de repositorios actualizada')),
      onError: (syncError) => notifyError(syncError, t('No se pudo actualizar')),
    })
  const handleDisconnect = () =>
    disconnect.mutateAsync(undefined).then(
      () => {
        toast.success(t('GitHub quedó desconectado'))
        setConfirming(false)
      },
      (disconnectError) => notifyError(disconnectError, t('No se pudo desconectar')),
    )

  return (
    <>
      <section
        aria-labelledby="github-title"
        className="tf-panel flex flex-wrap items-center gap-3.5 px-5 py-4.5"
      >
        <GhMark />
        <div className="flex-[1_1_300px]">
          <h2 id="github-title" className="flex flex-wrap items-center gap-2.5 text-[19px] font-semibold">
            GitHub
            <span className="bg-ok-soft text-ok inline-flex items-center gap-1.5 rounded-full px-2.25 py-0.5 font-mono text-[11px] font-semibold">
              <span aria-hidden="true" className="bg-ok size-1.5 rounded-full" />
              {t('conectado')}
            </span>
          </h2>
          <p className="text-muted-foreground mt-0.5 font-mono text-xs">
            {facts.filter(Boolean).join(' · ')}
          </p>
        </div>
        {status.manageUrl && (
          <Button asChild variant="outline" className="gap-1.5">
            <a href={status.manageUrl} target="_blank" rel="noreferrer">
              {t('Administrar en GitHub')}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          </Button>
        )}
        {canManage && (
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirming(true)}
          >
            {t('Desconectar')}
          </Button>
        )}
      </section>

      {canManage && (
        <section aria-labelledby="github-repos-title" className="bg-card overflow-hidden rounded-2xl border">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 pt-3.5 pb-2.5">
            <h2 id="github-repos-title" className="text-[15px] font-semibold">
              {t('Repositorios con acceso')}{' '}
              <span className="text-muted-foreground font-mono text-xs font-normal">
                {status.repositories.length}
              </span>
            </h2>
            <span className="text-muted-foreground flex-1 text-[12.5px]">
              {t('TaskFlow solo ve los que elegiste al instalar. Para sumar otro, cámbialo en GitHub.')}
            </span>
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1.5"
                onClick={handleSync}
                disabled={sync.isPending}
              >
                <RefreshCw
                  className={sync.isPending ? 'size-3.5 animate-spin' : 'size-3.5'}
                  aria-hidden="true"
                />
                {t('Actualizar lista')}
              </Button>
            )}
          </div>
          {status.repositories.length === 0 ? (
            <p className="text-muted-foreground border-t px-4 py-6 text-center text-sm">
              {t(
                'La app todavía no tiene acceso a ningún repositorio. Elígelos en «Administrar en GitHub» y pulsa «Actualizar lista».',
              )}
            </p>
          ) : (
            <ul>
              {status.repositories.map((repository) => (
                <RepositoryRow
                  key={repository.id}
                  workspace={workspace}
                  repository={repository}
                  canManage={canManage}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      <TeamAccounts accounts={status.accounts ?? []} />

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('¿Desconectar GitHub?')}
        description={t(
          'Se quita la app de TaskFlow de {account} y las tareas dejan de mostrar sus ramas, pull requests y pipelines. Las reglas y automatizaciones de los proyectos se pierden. En GitHub no se borra nada.',
          { account: status.accountLogin },
        )}
        confirmLabel={t('Desconectar')}
        loading={disconnect.isPending}
        onConfirm={handleDisconnect}
      />
    </>
  )
}

/** Quién del equipo tiene enlazada su cuenta de GitHub: sin ella puede ver, pero no crear ramas ni ejecutar workflows. */
function TeamAccounts({ accounts }) {
  const linked = accounts.filter((account) => account.login).length
  return (
    <section aria-labelledby="github-accounts-title" className="bg-card overflow-hidden rounded-2xl border">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 pt-3.5 pb-2.5">
        <h2 id="github-accounts-title" className="text-[15px] font-semibold">
          {t('Cuentas de GitHub del equipo')}{' '}
          <span className="text-muted-foreground font-mono text-xs font-normal">
            {t('{linked} de {total}', { linked, total: accounts.length })}
          </span>
        </h2>
        <span className="text-muted-foreground flex-1 text-[12.5px]">
          {t(
            'Cada persona conecta la suya desde su perfil. Sin ella puede ver, pero no crear ramas ni ejecutar workflows.',
          )}
        </span>
      </div>
      <ul>
        {accounts.map((account) => (
          <li
            key={account.userId}
            className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t px-4 py-2.5"
          >
            <span className="min-w-0 flex-[1_1_220px] truncate font-medium">{account.fullName}</span>
            <span
              className={
                account.login
                  ? 'bg-ok-soft text-ok rounded-full px-2.25 py-0.5 font-mono text-[11.5px] font-semibold'
                  : 'bg-muted text-muted-foreground rounded-full px-2.25 py-0.5 font-mono text-[11.5px]'
              }
            >
              {account.login ? `@${account.login}` : t('sin enlazar')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function RepositoryRow({ workspace, repository, canManage }) {
  const meta = [
    repository.isPrivate ? t('privado') : t('público'),
    repository.defaultBranch && t('rama principal {branch}', { branch: repository.defaultBranch }),
  ]
  return (
    <li className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-t px-4 py-2.75">
      <GitBranch className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-[1_1_240px]">
        <span className="block truncate font-mono text-[13px] font-semibold">{repository.fullName}</span>
        <span className="text-muted-foreground block text-xs">{meta.filter(Boolean).join(' · ')}</span>
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {repository.projects.map((project) => (
          <span key={project.projectId} className="inline-flex items-center gap-1.75 text-[13px]">
            <ProjectIcon project={project} />
            {project.name}
          </span>
        ))}
        {canManage && <LinkToProject workspace={workspace} repository={repository} />}
      </span>
    </li>
  )
}

/** «Enlazar a un proyecto»: suma el repositorio a los de ese proyecto (lo demás se ajusta en el proyecto). */
function LinkToProject({ workspace, repository }) {
  const { data: projects } = useProjects(workspace.slug)
  const setRepositories = useSetRepositories(workspace.slug)
  const linked = new Set(repository.projects.map((project) => project.projectId))
  const free = (projects ?? []).filter((project) => !linked.has(project.id))
  if (free.length === 0) return null

  const handleLink = async (project) => {
    try {
      // Se suma a los que el proyecto ya tiene
      const current = await githubApi.project(workspace.slug, project.id)
      await setRepositories.mutateAsync({
        projectId: project.id,
        repositoryIds: [...current.repositories.map((repo) => repo.id), repository.id],
      })
      toast.success(
        t('{repository} enlazado a {project}', { repository: repository.fullName, project: project.name }),
      )
    } catch (linkError) {
      notifyError(linkError, t('No se pudo enlazar'))
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={setRepositories.isPending}
          className="border-dash text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-[9px] border border-dashed px-2.5 py-1 text-[13px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {repository.projects.length === 0 ? t('Enlazar a un proyecto') : t('+ otro proyecto')}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          {t('Enlazar {repository} a', { repository: repository.fullName })}
        </DropdownMenuLabel>
        {free.map((project) => (
          <DropdownMenuItem key={project.id} onSelect={() => handleLink(project)}>
            <ProjectIcon project={project} />
            {project.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const CAN = () => [
  [t('Leer ramas, commits y pull requests'), t('para enlazarlos con las tareas')],
  [t('Leer el resultado de los checks y de Actions'), t('para mostrar si el pipeline pasó')],
  [t('Crear ramas'), t('con el botón «Crear rama» de la tarea')],
  [t('Ejecutar workflows'), t('con el botón «Ejecutar workflow» y las reglas del proyecto')],
]
const CANNOT = () => [
  t('Fusionar o cerrar pull requests'),
  t('Borrar ramas ni escribir código'),
  t('Cambiar los ajustes o los secretos del repositorio'),
]

/** Lo que la app puede y no puede hacer en GitHub: se dice antes de conectar y sigue a la vista después. */
function Scope() {
  return (
    <section aria-labelledby="github-scope-title" className="grid gap-3.5 md:grid-cols-2">
      <div className="tf-panel px-5 py-4">
        <h2 id="github-scope-title" className="mb-2.5 text-[15px] font-semibold">
          {t('Lo que TaskFlow puede hacer en GitHub')}
        </h2>
        <ul className="flex flex-col gap-1.75 text-[13px]">
          {CAN().map(([what, why]) => (
            <li key={what} className="flex gap-2.25">
              <span aria-hidden="true" className="text-ok font-mono">
                +
              </span>
              <span>
                <strong className="font-semibold">{what}</strong>{' '}
                <span className="text-muted-foreground">{why}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-dash rounded-2xl border border-dashed px-5 py-4">
        <h2 className="mb-2.5 text-[15px] font-semibold">{t('Lo que no puede')}</h2>
        <ul className="flex flex-col gap-1.75 text-[13px]">
          {CANNOT().map((what) => (
            <li key={what} className="flex gap-2.25">
              <span aria-hidden="true" className="text-muted-foreground font-mono">
                –
              </span>
              <span>{what}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-3 text-[12.5px] leading-normal">
          {t(
            'Quién configura GitHub y quién ejecuta workflows se decide en Roles, con los permisos «Configurar GitHub» y «Ejecutar workflows». Ver la sección GitHub lo da el acceso al proyecto.',
          )}
        </p>
      </div>
    </section>
  )
}
