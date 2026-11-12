import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { importsApi } from './api'
import { ImportSettings } from './ImportSettings'
import { initialChoices, toMapping, toSelection } from './importModel'

vi.mock('./api', () => ({
  importsApi: {
    list: vi.fn(),
    get: vi.fn(),
    connect: vi.fn(),
    upload: vi.fn(),
    select: vi.fn(),
    saveMapping: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    undo: vi.fn(),
    discard: vi.fn(),
    report: vi.fn(),
  },
}))
vi.mock('@/features/projects/hooks', () => ({ useProjects: () => ({ data: [{ id: 'p-web', name: 'Sitio web', identifier: 'WEB', color: 'TEAL' }] }) }))
vi.mock('@/features/workspaces/hooks', () => ({
  useMembers: () => ({ data: [{ user: { id: 'u-luis', fullName: 'Luis Muñoz', email: 'luis@test.com' }, role: 'MEMBER' }] }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

const workspace = { slug: 'equipo', name: 'Equipo', myRole: 'OWNER' }

const base = {
  id: 'j1',
  source: 'JIRA',
  via: 'API',
  sourceLabel: 'miempresa.atlassian.net',
  error: null,
  createdByName: 'Ana',
  createdAt: '2026-11-11T10:00:00Z',
  startedAt: null,
  finishedAt: null,
  connected: true,
  discovery: {
    account: 'Ana Torres',
    csv: null,
    projects: [
      { id: '10000', key: 'PORT', name: 'Portal de clientes', issueCount: 248, suggestedIdentifier: 'PORT', identifierTaken: false },
      { id: '10001', key: 'WEB', name: 'Sitio', issueCount: 131, suggestedIdentifier: 'WEB2', identifierTaken: true },
    ],
  },
  selection: null,
  mapping: null,
  preview: null,
  progress: null,
  report: null,
}

const ready = {
  ...base,
  status: 'READY',
  selection: { projects: [{ externalId: '10000', targetProjectId: null, name: 'Portal de clientes', identifier: 'PORT' }], options: { attachments: true }, csv: null },
  mapping: {
    types: [{ source: 'Epic', kind: 'EPIC', count: 12, target: 'MODULE' }],
    states: [{ source: 'In QA', category: 'IN_PROGRESS', count: 12, target: { name: 'In QA', group: 'STARTED' } }],
    priorities: [{ source: 'Highest', count: 3, target: 'URGENT' }],
    people: [
      { id: 'a1', name: 'Luis Muñoz', email: 'luis@test.com', count: 88, target: { action: 'MEMBER', userId: 'u-luis', email: null, roleId: null }, matchedName: 'Luis Muñoz' },
      { id: 'a2', name: 'Marta Gil', email: null, count: 52, target: { action: 'UNASSIGNED', userId: null, email: null, roleId: null }, matchedName: null },
    ],
    stateChoices: [
      { name: 'Todo', group: 'UNSTARTED' },
      { name: 'In Progress', group: 'STARTED' },
      { name: 'Done', group: 'COMPLETED' },
    ],
  },
  preview: {
    totals: { projects: 1, modules: 12, cycles: 6, closedCycles: 5, stories: 31, tasks: 286, subtasks: 41, bugs: 62, comments: 1090, attachments: 198, attachmentBytes: 139 * 1024 * 1024, tooBig: 14, notAllowed: 0, withPoints: 96, unassigned: 9, invitations: 0 },
    labels: 23,
    newStates: [{ name: 'In QA', group: 'STARTED' }],
    sample: [{ type: 'STORY', code: 'PORT-41', title: 'Ver el historial', stateName: 'In Progress', stateGroup: 'STARTED', parentCode: null, module: 'Pedidos', cycle: 'Sprint 6', assignees: ['Luis Muñoz'], invited: [], completedAt: null }],
    freeBytes: 800 * 1024 * 1024,
    attachmentsAvailable: true,
  },
}

function renderTab(url = '/equipo/settings?tab=import') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <TooltipProvider>
          <ImportSettings workspace={workspace} />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  importsApi.list.mockResolvedValue([])
})

describe('Importar: de dónde y las importaciones anteriores', () => {
  it('ofrece los cinco orígenes y, sin importaciones, lo dice', async () => {
    renderTab()

    for (const name of ['Jira', 'Trello', 'Linear', 'Asana', 'Archivo CSV']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${name}`) })).toBeInTheDocument()
    }
    expect(await screen.findByText('Todavía no has importado nada')).toBeInTheDocument()
  })

  it('una terminada se puede ver y deshacer (confirmando); una sin terminar, continuar o descartar', async () => {
    importsApi.list.mockResolvedValue([
      { ...base, status: 'COMPLETED', report: { stories: 31, tasks: 286, bugs: 62, comments: 1090, projects: [{ id: 'p1' }, { id: 'p2' }] } },
      { ...base, id: 'j2', source: 'CSV', via: 'FILE', sourceLabel: 'tareas.csv', status: 'DRAFT' },
    ])
    importsApi.undo.mockResolvedValue({ ...base, status: 'UNDOING' })
    const user = userEvent.setup()
    renderTab()

    const done = (await screen.findByText('miempresa.atlassian.net')).closest('tr')
    expect(within(done).getByText('2 proyectos · 379 tareas · 1090 comentarios')).toBeInTheDocument()
    expect(within(done).getByText('completada')).toBeInTheDocument()
    const draft = screen.getByText('tareas.csv').closest('tr')
    expect(within(draft).getByRole('button', { name: 'Continuar' })).toBeInTheDocument()
    expect(within(draft).getByRole('button', { name: 'Descartar' })).toBeInTheDocument()

    await user.click(within(done).getByRole('button', { name: 'Deshacer' }))
    expect(importsApi.undo).not.toHaveBeenCalled()
    await user.click(await screen.findByRole('button', { name: 'Deshacer importación' }))
    await waitFor(() => expect(importsApi.undo).toHaveBeenCalledWith('equipo', 'j1'))
  })
})

describe('Importar: conectar', () => {
  it('con Jira pide dirección, correo y token, y al conectar pasa a elegir qué traer', async () => {
    importsApi.connect.mockResolvedValue({ ...base, status: 'DRAFT' })
    importsApi.get.mockResolvedValue({ ...base, status: 'DRAFT' })
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByRole('button', { name: /^Jira/ }))
    const submit = screen.getByRole('button', { name: 'Conectar y continuar' })
    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText(/Dirección de tu Jira/), 'miempresa.atlassian.net')
    await user.type(screen.getByLabelText(/Correo de tu cuenta de Jira/), 'ana@miempresa.com')
    await user.type(screen.getByLabelText(/Token de API/), 'secreto')
    await user.click(submit)

    await waitFor(() =>
      expect(importsApi.connect).toHaveBeenCalledWith('equipo', {
        source: 'JIRA',
        baseUrl: 'miempresa.atlassian.net',
        email: 'ana@miempresa.com',
        token: 'secreto',
      }),
    )
    expect(await screen.findByText('Conectado como Ana Torres')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Portal de clientes/ })).toBeChecked()
  })

  it('el archivo CSV no ofrece conexión: solo subir', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByRole('button', { name: /^Archivo CSV/ }))

    expect(screen.getByRole('button', { name: /Elige el archivo o suéltalo aquí/ })).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })
})

describe('Importar: qué traer', () => {
  it('manda los proyectos marcados con su destino y avisa del identificador repetido', async () => {
    importsApi.get.mockResolvedValue({ ...base, status: 'DRAFT' })
    importsApi.select.mockResolvedValue({ ...base, status: 'FETCHING' })
    const user = userEvent.setup()
    renderTab('/equipo/settings?tab=import&job=j1')

    expect(await screen.findByText(/Ya tienes un proyecto WEB: se crea aparte como WEB2/)).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: /Sitio/ }))
    await user.click(screen.getByRole('checkbox', { name: /Adjuntos/ }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await waitFor(() => expect(importsApi.select).toHaveBeenCalledTimes(1))
    const [, , selection] = importsApi.select.mock.calls[0]
    expect(selection.projects).toEqual([{ externalId: '10000', targetProjectId: null, name: 'Portal de clientes', identifier: 'PORT' }])
    expect(selection.options).toMatchObject({ keepNumbers: true, completed: true, attachments: false, archived: false })
    expect(selection.csv).toBeNull()
  })

  it('con un CSV sin columna de título no deja continuar', async () => {
    const csv = {
      delimiter: ',',
      rows: 64,
      columns: [
        { name: 'Nombre raro', samples: ['Rediseñar el boletín'], suggested: 'IGNORE' },
        { name: 'Status', samples: ['TO DO'], suggested: 'STATUS' },
      ],
    }
    importsApi.get.mockResolvedValue({
      ...base,
      source: 'CSV',
      via: 'FILE',
      sourceLabel: 'tareas.csv',
      status: 'DRAFT',
      discovery: { account: null, csv, projects: [{ id: 'csv', key: null, name: 'tareas', issueCount: 64, suggestedIdentifier: 'TAREAS', identifierTaken: false }] },
    })
    renderTab('/equipo/settings?tab=import&job=j1')

    expect(await screen.findByText('Elige qué columna es el título de la tarea.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
    // Con un archivo no se ofrecen los adjuntos ni los sprints cerrados
    expect(screen.queryByRole('checkbox', { name: /Adjuntos/ })).not.toBeInTheDocument()
  })
})

describe('Importar: equivalencias y revisión', () => {
  it('guarda las equivalencias propuestas y muestra lo que se va a crear con sus avisos', async () => {
    importsApi.get.mockResolvedValue(ready)
    importsApi.saveMapping.mockResolvedValue(ready)
    importsApi.start.mockResolvedValue({ ...ready, status: 'RUNNING', mapping: null, preview: null })
    const user = userEvent.setup()
    renderTab('/equipo/settings?tab=import&job=j1')

    expect(await screen.findByText('1 no está en el workspace')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await waitFor(() => expect(importsApi.saveMapping).toHaveBeenCalledTimes(1))
    expect(importsApi.saveMapping.mock.calls[0][2]).toEqual({
      types: { Epic: 'MODULE' },
      states: { 'In QA': { name: 'In QA', group: 'STARTED' } },
      priorities: { Highest: 'URGENT' },
      people: {
        a1: { action: 'MEMBER', userId: 'u-luis', email: null, roleId: null },
        a2: { action: 'UNASSIGNED', userId: null, email: null, roleId: null },
      },
    })

    expect(await screen.findByText('Se va a crear')).toBeInTheDocument()
    expect(screen.getByText('«In QA»')).toBeInTheDocument()
    expect(screen.getByText(/adjuntos pasan del límite por archivo y no se traen/)).toBeInTheDocument()
    expect(screen.getByText(/tareas tienen story points u horas registradas/)).toBeInTheDocument()
    expect(screen.getByText('PORT-41')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Importar 379 tareas' }))
    await waitFor(() => expect(importsApi.start).toHaveBeenCalledWith('equipo', 'j1'))
  })
})

describe('Importar: avance e informe', () => {
  it('mientras corre muestra el avance por etapas y deja detenerla', async () => {
    importsApi.get.mockResolvedValue({
      ...base,
      status: 'RUNNING',
      progress: {
        percent: 58,
        current: 'PORT-212 · Exportar el historial',
        stages: [
          { key: 'PROJECTS', done: 2, total: 2 },
          { key: 'ISSUES', done: 221, total: 379 },
          { key: 'COMMENTS', done: 0, total: 1090 },
          { key: 'ATTACHMENTS', done: 0, total: 0 },
        ],
      },
    })
    importsApi.stop.mockResolvedValue({ ...base, status: 'RUNNING' })
    const user = userEvent.setup()
    renderTab('/equipo/settings?tab=import&job=j1')

    expect(await screen.findByText('58 %')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Avance de la importación' })).toHaveAttribute('aria-valuenow', '58')
    expect(screen.getByText('221 de 379')).toBeInTheDocument()
    // Una etapa sin nada que hacer no se lista
    expect(screen.queryByText('Adjuntos')).not.toBeInTheDocument()
    expect(screen.getByText('ahora: PORT-212 · Exportar el historial')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Detener' }))
    await waitFor(() => expect(importsApi.stop).toHaveBeenCalledWith('equipo', 'j1'))
  })

  it('al terminar muestra lo que entró, lo que no y los proyectos', async () => {
    importsApi.get.mockResolvedValue({
      ...base,
      status: 'COMPLETED',
      finishedAt: '2026-11-11T10:42:00Z',
      report: {
        stories: 31, tasks: 286, bugs: 62, modules: 18, cycles: 9, comments: 1090, attachments: 184, attachmentBytes: 127 * 1024 * 1024,
        labels: 23, states: 1, relations: 35, invitations: 2, skippedTotal: 14,
        projects: [{ id: 'p1', identifier: 'PORT', name: 'Portal de clientes', issues: 248, created: true }],
        skipped: [{ reason: 'ATTACHMENT_TOO_BIG', count: 14, items: [{ reason: 'ATTACHMENT_TOO_BIG', key: 'PORT-12', title: 'Portada', detail: 'video.mp4', url: null }] }],
      },
    })
    renderTab('/equipo/settings?tab=import&job=j1')

    expect(await screen.findByText('Importación terminada')).toBeInTheDocument()
    expect(screen.getByText('379')).toBeInTheDocument()
    expect(screen.getByText('Adjuntos que pasan del límite por archivo')).toBeInTheDocument()
    expect(screen.getByText(/PORT-12 video.mp4/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Portal de clientes/ })).toHaveAttribute('href', '/equipo/projects/p1/issues')
    expect(screen.getByText(/2 invitaciones enviadas./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descargar informe' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deshacer importación' })).toBeInTheDocument()
  })
})

describe('Importar: lo que se manda al backend', () => {
  it('al principio van todos los proyectos como nuevos, con el identificador propuesto', () => {
    const choices = initialChoices({ ...base, status: 'DRAFT' })

    expect(choices['10001']).toEqual({ include: true, target: 'new', name: 'Sitio', identifier: 'WEB2' })
    expect(toSelection(base, { ...choices, 10001: { ...choices['10001'], target: 'p-web' } }, { keepNumbers: true }, null).projects).toEqual([
      { externalId: '10000', targetProjectId: null, name: 'Portal de clientes', identifier: 'PORT' },
      { externalId: '10001', targetProjectId: 'p-web', name: null, identifier: null },
    ])
  })

  it('al volver a elegir, lo que no se había traído sigue desmarcado', () => {
    const choices = initialChoices(ready)

    expect(choices['10000'].include).toBe(true)
    expect(choices['10001'].include).toBe(false)
  })

  it('las equivalencias propuestas se guardan por el nombre del origen', () => {
    expect(toMapping(ready.mapping).people.a2).toEqual({ action: 'UNASSIGNED', userId: null, email: null, roleId: null })
    expect(toMapping(null)).toEqual({ types: {}, states: {}, priorities: {}, people: {} })
  })
})
