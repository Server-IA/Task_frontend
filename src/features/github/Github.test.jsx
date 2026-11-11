import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { githubApi } from './api'
import { ActionsView } from './GithubActions'
import { IssueDevChip } from './GithubParts'
import { IssueDevelopment } from './IssueDevelopment'
import { defaultStateFor, ProjectGithubSettings } from './ProjectGithubSettings'
import { WorkspaceIntegrations } from './WorkspaceIntegrations'

vi.mock('./api', () => ({
  githubApi: {
    workspace: vi.fn(),
    install: vi.fn(),
    sync: vi.fn(),
    disconnect: vi.fn(),
    project: vi.fn(),
    setRepositories: vi.fn(),
    saveSettings: vi.fn(),
    addRule: vi.fn(),
    deleteRule: vi.fn(),
    pulls: vi.fn(),
    linkPull: vi.fn(),
    runs: vi.fn(),
    dispatch: vi.fn(),
    rerun: vi.fn(),
    cancel: vi.fn(),
    workflows: vi.fn(),
    repoBranches: vi.fn(),
    branches: vi.fn(),
    summary: vi.fn(),
    issue: vi.fn(),
    checks: vi.fn(),
    createBranch: vi.fn(),
    linkBranch: vi.fn(),
  },
}))

const STATES = [
  { id: 's-todo', name: 'Todo', group: 'UNSTARTED' },
  { id: 's-doing', name: 'In Progress', group: 'STARTED' },
  { id: 's-review', name: 'In Review', group: 'STARTED' },
  { id: 's-done', name: 'Done', group: 'COMPLETED' },
]
let role = 'OWNER'
vi.mock('@/features/projects/hooks', () => ({
  useProjects: () => ({
    data: [
      { id: 'p-web', name: 'Sitio web', identifier: 'WEB', color: 'TEAL' },
      { id: 'p-app', name: 'App móvil', identifier: 'APP', color: 'AMBER' },
    ],
  }),
  useStates: () => ({ data: STATES }),
}))
vi.mock('@/features/workspaces/hooks', () => ({
  useWorkspace: () => ({ data: { slug: 'equipo', myRole: role, myPermissions: [] } }),
}))
vi.mock('@/features/issues/hooks', () => ({
  useIssues: () => ({ data: { content: [] }, isFetching: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

const owner = { slug: 'equipo', name: 'Equipo', myRole: 'OWNER' }
const member = { slug: 'equipo', name: 'Equipo', myRole: 'MEMBER', myPermissions: ['ISSUE_EDIT'] }
const project = { id: 'p-web', name: 'Sitio web', identifier: 'WEB' }

const repo = (id, fullName, projects = [], openPullRequests = 0) => ({
  id,
  fullName,
  defaultBranch: 'main',
  isPrivate: true,
  projects,
  openPullRequests,
})
const linked = {
  repositoryId: 'r-api',
  projectId: 'p-web',
  identifier: 'WEB',
  name: 'Sitio web',
  color: 'TEAL',
}
const connected = {
  configured: true,
  connected: true,
  accountLogin: 'acme',
  accountType: 'Organization',
  installedByName: 'Ana',
  installedAt: '2026-11-04T10:00:00Z',
  lastEventAt: '2026-11-11T10:00:00Z',
  manageUrl: 'https://github.com/organizations/acme/settings/installations/7',
  repositories: [repo('r-api', 'acme/sitio-web-api', [linked]), repo('r-app', 'acme/app-movil')],
}
const settings = {
  onBranchStateId: null,
  onPrOpenedStateId: null,
  onPrMergedStateId: 's-done',
  onPrClosedStateId: null,
  branchFormat: 'CODE_TITLE',
}
const rule = {
  id: 'rule-1',
  firesOn: 'PR_MERGED',
  repositoryId: 'r-api',
  repository: 'acme/sitio-web-api',
  workflowId: 77,
  workflowName: 'Deploy a staging',
  ref: 'main',
  lastRunAt: null,
  lastRunStatus: null,
  lastRunConclusion: null,
}
const projectStatus = {
  configured: true,
  connected: true,
  repositories: [repo('r-api', 'acme/sitio-web-api', [linked], 2)],
  available: [repo('r-api', 'acme/sitio-web-api', [linked]), repo('r-app', 'acme/app-movil')],
  settings,
  rules: [rule],
}
const issue = { id: 'i-23', code: 'WEB-23', title: 'Rate limit', state: { id: 's-todo' } }
const pull = {
  id: 'pr-1',
  repositoryId: 'r-api',
  repository: 'acme/sitio-web-api',
  issueId: 'i-22',
  issueCode: 'WEB-22',
  number: 128,
  title: 'Rotación del refresh token',
  state: 'OPEN',
  url: 'https://github.com/acme/sitio-web-api/pull/128',
  authorLogin: 'luis',
  headBranch: 'web-22-rotacion',
  baseBranch: 'main',
  headSha: 'abc1234',
  reviewers: 'ana',
  checksState: 'FAILURE',
  checksTotal: 3,
  checksFailed: 1,
}
const run = (extra) => ({
  id: 'run-1',
  repositoryId: 'r-api',
  repository: 'acme/sitio-web-api',
  runId: 9001,
  workflowId: 77,
  workflowName: 'CI',
  title: 'Rotación: pruebas',
  branch: 'web-22-rotacion',
  headSha: '3f9d7a0aaaa',
  event: 'pull_request',
  status: 'completed',
  conclusion: 'failure',
  actorLogin: 'luis',
  url: 'https://github.com/acme/sitio-web-api/actions/runs/9001',
  prNumber: 128,
  issueId: 'i-22',
  issueCode: 'WEB-22',
  ruleId: null,
  triggeredByName: null,
  requestedAt: null,
  startedAt: '2026-11-11T09:00:00Z',
  changedAt: '2026-11-11T09:02:48Z',
  ...extra,
})

function renderWith(ui, { path = '/equipo/settings?tab=integrations' } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

// jsdom no lo trae y la casilla de Radix lo usa para medirse
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.clearAllMocks()
  role = 'OWNER'
})

describe('Integraciones del workspace', () => {
  it('sin conectar, ofrece conectar y lleva a GitHub', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    githubApi.workspace.mockResolvedValue({ configured: true, connected: false, repositories: [] })
    githubApi.install.mockResolvedValue({
      url: 'https://github.com/apps/taskflow/installations/new?state=abc',
    })
    renderWith(<WorkspaceIntegrations workspace={owner} />)

    await userEvent.click(await screen.findByRole('button', { name: /Conectar con GitHub/ }))

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith('https://github.com/apps/taskflow/installations/new?state=abc'),
    )
    expect(screen.getByText('Lo que no puede')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('si al servidor le falta la GitHub App lo dice y no ofrece conectar', async () => {
    githubApi.workspace.mockResolvedValue({ configured: false, connected: false, repositories: [] })
    renderWith(<WorkspaceIntegrations workspace={owner} />)

    expect(await screen.findByText(/le falta la configuración de la GitHub App/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Conectar con GitHub/ })).not.toBeInTheDocument()
  })

  it('sin el permiso, ve el estado pero no puede conectar ni desconectar', async () => {
    githubApi.workspace.mockResolvedValue({ configured: true, connected: false, repositories: [] })
    const { unmount } = renderWith(<WorkspaceIntegrations workspace={member} />)
    expect(await screen.findByText(/pide el permiso «Configurar GitHub»/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Conectar con GitHub/ })).not.toBeInTheDocument()
    unmount()

    githubApi.workspace.mockResolvedValue(connected)
    renderWith(<WorkspaceIntegrations workspace={member} />)
    expect(await screen.findByText('acme/sitio-web-api')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Desconectar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enlazar a un proyecto' })).not.toBeInTheDocument()
  })

  it('conectado, muestra la cuenta, los repositorios y a qué proyecto va cada uno', async () => {
    githubApi.workspace.mockResolvedValue(connected)
    renderWith(<WorkspaceIntegrations workspace={owner} />)

    expect(await screen.findByText('conectado')).toBeInTheDocument()
    expect(screen.getByText(/organización acme · instalada por Ana/)).toBeInTheDocument()
    const rows = screen.getAllByRole('listitem').filter((row) => within(row).queryByText(/acme\//))
    expect(within(rows[0]).getByText('Sitio web')).toBeInTheDocument()
    expect(within(rows[1]).getByRole('button', { name: 'Enlazar a un proyecto' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Administrar en GitHub/ })).toHaveAttribute(
      'href',
      connected.manageUrl,
    )
  })

  it('desconectar pide confirmación', async () => {
    githubApi.workspace.mockResolvedValue(connected)
    githubApi.disconnect.mockResolvedValue({})
    renderWith(<WorkspaceIntegrations workspace={owner} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Desconectar' }))
    expect(githubApi.disconnect).not.toHaveBeenCalled()
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/Se quita la app de TaskFlow de acme/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Desconectar' }))

    await waitFor(() => expect(githubApi.disconnect).toHaveBeenCalledWith('equipo'))
  })

  it('al volver de GitHub dice cómo salió', async () => {
    const { toast } = await import('sonner')
    githubApi.workspace.mockResolvedValue(connected)
    renderWith(<WorkspaceIntegrations workspace={owner} />, {
      path: '/equipo/settings?tab=integrations&github=taken',
    })

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Esa instalación de GitHub ya está conectada a otro workspace',
      ),
    )
  })
})

describe('GitHub en los ajustes del proyecto', () => {
  it('sin conexión, lleva a Integraciones', async () => {
    githubApi.project.mockResolvedValue({
      ...projectStatus,
      connected: false,
      repositories: [],
      available: [],
      rules: [],
    })
    renderWith(<ProjectGithubSettings workspace={owner} project={project} />)

    expect(await screen.findByText('Este workspace no está conectado con GitHub')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a Integraciones' })).toHaveAttribute(
      'href',
      '/equipo/settings?tab=integrations',
    )
  })

  it('muestra los repositorios, las automatizaciones y las reglas', async () => {
    githubApi.project.mockResolvedValue(projectStatus)
    renderWith(<ProjectGithubSettings workspace={owner} project={project} />)

    expect(await screen.findByText('acme/sitio-web-api')).toBeInTheDocument()
    expect(screen.getByText('main · 2 PR abiertos')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Se fusiona el pull request' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Se abre el pull request' })).not.toBeChecked()
    expect(screen.getByText('se fusiona el PR de una tarea')).toBeInTheDocument()
    expect(screen.getByText('Deploy a staging')).toBeInTheDocument()
    expect(screen.getByText('sitio-web-api · main')).toBeInTheDocument()
    expect(screen.getByText('todavía no se ha ejecutado')).toBeInTheDocument()
  })

  it('encender una automatización propone el estado que le corresponde', async () => {
    const saved = { ...projectStatus, settings: { ...settings, onPrOpenedStateId: 's-review' } }
    githubApi.project.mockResolvedValueOnce(projectStatus).mockResolvedValue(saved)
    githubApi.saveSettings.mockResolvedValue(saved)
    renderWith(<ProjectGithubSettings workspace={owner} project={project} />)

    await userEvent.click(await screen.findByRole('switch', { name: 'Se abre el pull request' }))

    // «Se abre el PR» prefiere un estado de revisión si el proyecto lo tiene
    await waitFor(() =>
      expect(githubApi.saveSettings).toHaveBeenCalledWith('equipo', 'p-web', {
        ...settings,
        onPrOpenedStateId: 's-review',
      }),
    )
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Se abre el pull request' })).toBeChecked())
  })

  it('apagar una automatización deja de mover la tarea', async () => {
    githubApi.project.mockResolvedValue(projectStatus)
    githubApi.saveSettings.mockResolvedValue({
      ...projectStatus,
      settings: { ...settings, onPrMergedStateId: null },
    })
    renderWith(<ProjectGithubSettings workspace={owner} project={project} />)

    await userEvent.click(await screen.findByRole('switch', { name: 'Se fusiona el pull request' }))

    await waitFor(() =>
      expect(githubApi.saveSettings).toHaveBeenCalledWith('equipo', 'p-web', {
        ...settings,
        onPrMergedStateId: null,
      }),
    )
  })

  it('el estado propuesto sale del grupo de cada automatización', () => {
    expect(defaultStateFor({ prefer: ['STARTED'] }, STATES)).toBe('s-doing')
    expect(defaultStateFor({ prefer: ['STARTED'], review: true }, STATES)).toBe('s-review')
    expect(defaultStateFor({ prefer: ['COMPLETED'] }, STATES)).toBe('s-done')
    expect(defaultStateFor({ prefer: ['UNSTARTED', 'BACKLOG'] }, STATES)).toBe('s-todo')
    expect(defaultStateFor({ prefer: ['CANCELLED'] }, STATES)).toBe('s-todo')
    expect(defaultStateFor({ prefer: ['STARTED'] }, [])).toBeNull()
  })

  it('quitar un repositorio y quitar una regla', async () => {
    githubApi.project.mockResolvedValue(projectStatus)
    githubApi.setRepositories.mockResolvedValue({ ...projectStatus, repositories: [] })
    githubApi.deleteRule.mockResolvedValue({})
    renderWith(<ProjectGithubSettings workspace={owner} project={project} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Quitar la regla «Deploy a staging»' }))
    await waitFor(() => expect(githubApi.deleteRule).toHaveBeenCalledWith('equipo', 'p-web', 'rule-1'))

    await userEvent.click(screen.getByRole('button', { name: 'Quitar acme/sitio-web-api' }))
    await waitFor(() => expect(githubApi.setRepositories).toHaveBeenCalledWith('equipo', 'p-web', []))
  })

  it('sin el permiso todo queda de solo lectura', async () => {
    githubApi.project.mockResolvedValue(projectStatus)
    renderWith(<ProjectGithubSettings workspace={member} project={project} />)

    expect(await screen.findByText(/Cambiarlo pide el permiso «Configurar GitHub»/)).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Se fusiona el pull request' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Enlazar repositorio/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Nueva regla/ })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Quitar la regla «Deploy a staging»' }),
    ).not.toBeInTheDocument()
  })
})

describe('Desarrollo de la tarea', () => {
  const repositories = [repo('r-api', 'acme/sitio-web-api')]
  const emptyDev = {
    available: true,
    repositories,
    branches: [],
    pullRequests: [],
    runs: [],
    suggestedBranch: 'web-23-rate-limit',
  }

  it('si el proyecto no usa GitHub no aparece', async () => {
    githubApi.issue.mockResolvedValue({ ...emptyDev, available: false, repositories: [] })
    const { container } = renderWith(<IssueDevelopment slug="equipo" project={project} issue={issue} />)

    await waitFor(() => expect(githubApi.issue).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('sin rama, la crea con el nombre propuesto', async () => {
    githubApi.issue.mockResolvedValue(emptyDev)
    githubApi.project.mockResolvedValue({
      ...projectStatus,
      settings: { ...settings, onBranchStateId: 's-doing' },
    })
    githubApi.repoBranches.mockResolvedValue(['main', 'develop'])
    githubApi.createBranch.mockResolvedValue({
      ...emptyDev,
      branches: [
        {
          id: 'b1',
          repositoryId: 'r-api',
          repository: 'acme/sitio-web-api',
          name: 'web-23-rate-limit',
          createdAt: '2026-11-11T10:00:00Z',
        },
      ],
    })
    renderWith(<IssueDevelopment slug="equipo" project={project} issue={issue} />)

    expect(await screen.findByText(/Todavía no hay rama ni pull request/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Crear rama' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Crear rama para WEB-23' })).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Nombre de la rama')).toHaveValue('web-23-rate-limit')
    expect(within(dialog).getByText('git fetch && git checkout web-23-rate-limit')).toBeInTheDocument()
    // La tarea no ha empezado y el proyecto la mueve al crear la rama: se ofrece (marcado)
    expect(await within(dialog).findByRole('checkbox', { name: 'Pasar la tarea a «En curso»' })).toBeChecked()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Crear rama' }))

    await waitFor(() =>
      expect(githubApi.createBranch).toHaveBeenCalledWith('equipo', 'p-web', 'i-23', {
        repositoryId: 'r-api',
        base: 'main',
        name: 'web-23-rate-limit',
        move: true,
      }),
    )
    expect(await screen.findByRole('link', { name: 'web-23-rate-limit' })).toBeInTheDocument()
  })

  it('un nombre que no sirve como rama no se puede crear', async () => {
    githubApi.issue.mockResolvedValue(emptyDev)
    githubApi.project.mockResolvedValue(projectStatus)
    githubApi.repoBranches.mockResolvedValue(['main'])
    renderWith(<IssueDevelopment slug="equipo" project={project} issue={issue} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Crear rama' }))
    const dialog = await screen.findByRole('dialog')
    const name = within(dialog).getByLabelText('Nombre de la rama')
    await userEvent.clear(name)
    await userEvent.type(name, 'con espacio')

    expect(within(dialog).getByText(/sin espacios/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Crear rama' })).toBeDisabled()
  })

  it('con rama y pull request, muestra el PR con sus checks', async () => {
    githubApi.issue.mockResolvedValue({
      ...emptyDev,
      branches: [
        {
          id: 'b1',
          repositoryId: 'r-api',
          repository: 'acme/sitio-web-api',
          name: 'web-22-rotacion',
          createdAt: '2026-11-11T08:00:00Z',
        },
      ],
      pullRequests: [pull],
      runs: [run()],
    })
    githubApi.checks.mockResolvedValue([
      {
        name: 'CI / build',
        status: 'completed',
        conclusion: 'success',
        startedAt: '2026-11-11T09:00:00Z',
        completedAt: '2026-11-11T09:00:58Z',
        url: null,
      },
      {
        name: 'CI / test',
        status: 'completed',
        conclusion: 'failure',
        startedAt: '2026-11-11T09:00:00Z',
        completedAt: '2026-11-11T09:02:48Z',
        url: null,
      },
    ])
    renderWith(
      <IssueDevelopment slug="equipo" project={project} issue={{ ...issue, id: 'i-22', code: 'WEB-22' }} />,
    )

    expect(await screen.findByText('1 rama · 1 PR')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Rotación del refresh token' })).toHaveAttribute('href', pull.url)
    expect(screen.getByText(/abierto por luis · revisión pedida a ana · → main/)).toBeInTheDocument()
    const checks = await screen.findByRole('list', { name: 'Checks del pull request' })
    expect(within(checks).getByText('CI / test')).toBeInTheDocument()
    expect(within(checks).getByText('2 min 48 s')).toBeInTheDocument()
    expect(within(checks).getByRole('img', { name: 'falló' })).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: 'Ejecuciones de GitHub Actions' })).getByText('CI'),
    ).toBeInTheDocument()
  })

  it('sin permiso de editar tareas no ofrece crear ni enlazar', async () => {
    role = 'MEMBER'
    githubApi.issue.mockResolvedValue(emptyDev)
    renderWith(<IssueDevelopment slug="equipo" project={project} issue={issue} />)

    expect(await screen.findByText(/Todavía no hay rama ni pull request/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crear rama' })).not.toBeInTheDocument()
  })
})

describe('indicador en tarjetas y filas', () => {
  it('cada tarea muestra lo suyo del resumen del proyecto', async () => {
    githubApi.summary.mockResolvedValue([
      {
        issueId: 'i-22',
        branch: 'web-22-rotacion',
        branches: 1,
        prNumber: 128,
        prState: 'OPEN',
        checksState: 'FAILURE',
        prUrl: pull.url,
        running: false,
      },
      {
        issueId: 'i-23',
        branch: 'web-23-rate-limit',
        branches: 1,
        prNumber: null,
        prState: null,
        checksState: null,
        prUrl: null,
        running: false,
      },
    ])
    renderWith(
      <>
        <IssueDevChip slug="equipo" projectId="p-web" issueId="i-22" />
        <IssueDevChip slug="equipo" projectId="p-web" issueId="i-23" />
        <IssueDevChip slug="equipo" projectId="p-web" issueId="i-24" />
      </>,
    )

    expect(await screen.findByRole('link', { name: '#128 · falló' })).toHaveAttribute('href', pull.url)
    expect(screen.getByText('rama')).toHaveAttribute('title', 'web-23-rate-limit · sin pull request')
    // Las tres comparten una sola consulta
    expect(githubApi.summary).toHaveBeenCalledTimes(1)
  })
})

describe('Actions', () => {
  const status = { ...projectStatus, rules: [rule] }
  const view = (workspace = owner) => (
    <ActionsView
      workspace={workspace}
      project={project}
      status={status}
      settingsLink="/equipo/projects/p-web/settings?tab=github"
    />
  )

  it('lista las ejecuciones con qué las lanzó y su tarea', async () => {
    githubApi.runs.mockResolvedValue([
      run(),
      run({
        id: 'run-2',
        runId: 9002,
        workflowName: 'Deploy a staging',
        status: 'in_progress',
        conclusion: null,
        event: 'workflow_dispatch',
        ruleId: 'rule-1',
        prNumber: null,
        branch: 'main',
      }),
      run({
        id: 'run-3',
        runId: null,
        workflowName: 'Deploy a producción',
        status: 'requested',
        conclusion: null,
        event: 'workflow_dispatch',
        triggeredByName: 'Ana',
        issueId: null,
        issueCode: null,
      }),
    ])
    renderWith(view())

    await screen.findByText('pull request #128')
    const rows = within(screen.getByRole('region', { name: 'Ejecuciones de GitHub Actions' })).getAllByRole(
      'listitem',
    )
    expect(within(rows[0]).getByRole('img', { name: 'falló' })).toBeInTheDocument()
    expect(within(rows[0]).getByText('pull request #128')).toBeInTheDocument()
    expect(within(rows[0]).getByText('2 min 48 s')).toBeInTheDocument()
    expect(within(rows[0]).getByRole('link', { name: 'WEB-22' })).toHaveAttribute(
      'href',
      '/equipo/projects/p-web/issues/i-22',
    )
    expect(within(rows[1]).getByText('regla: al fusionar el PR de una tarea')).toBeInTheDocument()
    expect(within(rows[1]).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(within(rows[2]).getByText('a mano · Ana, desde TaskFlow')).toBeInTheDocument()
    // La que GitHub todavía no anunció no se puede cancelar ni repetir
    expect(within(rows[2]).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText(/1 regla activa/)).toBeInTheDocument()
  })

  it('reintentar una que falló', async () => {
    githubApi.runs.mockResolvedValue([run()])
    githubApi.rerun.mockResolvedValue({})
    renderWith(view())

    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))

    await waitFor(() => expect(githubApi.rerun).toHaveBeenCalledWith('equipo', 'p-web', 'run-1'))
  })

  it('sin el permiso de ejecutar workflows no hay botones', async () => {
    githubApi.runs.mockResolvedValue([run()])
    renderWith(view(member))

    expect(await screen.findByText('CI')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })
})
