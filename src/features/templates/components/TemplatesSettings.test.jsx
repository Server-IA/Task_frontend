import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { TemplatesSettings } from './TemplatesSettings'

const template = {
  id: 't1',
  name: 'Tarea técnica',
  titlePrefix: null,
  description: '## Objetivo',
  type: 'TASK',
  priority: null,
  state: null,
  assignees: [],
  labels: [],
  checklist: [],
  usageCount: 0,
}
const mutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }
const removeTemplate = vi.fn()
let templates = [template]

vi.mock('../hooks', () => ({
  useTemplates: () => ({ data: templates, isLoading: false, error: null, refetch: vi.fn() }),
  useCreateTemplate: () => mutation,
  useUpdateTemplate: () => mutation,
  useDeleteTemplate: () => ({ mutate: removeTemplate, isPending: false }),
}))
vi.mock('@/features/workspaces/hooks', () => ({ useIsManager: () => true }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/issues/useIssueHelpers', () => ({
  useProjectMeta: () => ({ states: [], users: [], labels: [], isLoading: false }),
}))
vi.mock('@/features/editor/components/LazyRichEditor', () => ({
  LazyRichEditor: () => null,
  preloadRichEditor: () => {},
  usePreloadRichEditor: () => {},
}))

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

describe('TemplatesSettings: campos del formulario', () => {
  it('el nombre y el prefijo escritos se ven con el color del texto, no con el gris del placeholder', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <TemplatesSettings slug="equipo" project={{ id: 'p1', identifier: 'WEB' }} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // La etiqueta que los envuelve es gris (text-muted-foreground): el campo no debe heredarlo
    const name = screen.getByDisplayValue('Tarea técnica')
    // Ejemplo genérico, el mismo para todas las plantillas (con «[Bug] » parecía el prefijo de esta)
    const prefix = screen.getByPlaceholderText('[Etiqueta]', { exact: false })
    expect(screen.queryByPlaceholderText('[Bug]', { exact: false })).not.toBeInTheDocument()
    expect(name.closest('label')).toHaveClass('text-muted-foreground')
    expect(name).toHaveClass('text-foreground')
    expect(prefix).toHaveClass('text-foreground')
  })
})

describe('TemplatesSettings: cambios sin guardar', () => {
  const bug = { ...template, id: 't2', name: 'Reporte de bug', titlePrefix: '[Bug]', type: 'BUG' }

  /** El botón de la plantilla en la lista (las flechas de subir y bajar llevan su propio aria-label). */
  const listButton = (name) => screen.getAllByRole('button', { name }).find((button) => !button.hasAttribute('aria-label'))

  function renderSettings() {
    templates = [template, bug]
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <TemplatesSettings slug="equipo" project={{ id: 'p1', identifier: 'WEB' }} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('elegir otra plantilla con cambios sin guardar pregunta antes; «Cancelar» los conserva', () => {
    renderSettings()
    fireEvent.change(screen.getByDisplayValue('Tarea técnica'), { target: { value: 'Tarea técnica v2' } })
    fireEvent.click(listButton(/Reporte de bug/))

    expect(screen.getByRole('alertdialog', { name: '¿Descartar los cambios sin guardar?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByDisplayValue('Tarea técnica v2')).toBeInTheDocument()
  })

  it('«Descartar cambios» abre la otra; sin cambios, se cambia sin preguntar', () => {
    renderSettings()
    fireEvent.change(screen.getByDisplayValue('Tarea técnica'), { target: { value: 'Tarea técnica v2' } })
    fireEvent.click(listButton(/Reporte de bug/))
    fireEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }))
    expect(screen.getByDisplayValue('Reporte de bug')).toBeInTheDocument()

    fireEvent.click(listButton(/Tarea técnica/))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('Tarea técnica')).toBeInTheDocument()
  })
})

describe('TemplatesSettings: eliminar una plantilla', () => {
  it('el foco va a «Nueva plantilla» (el editor y su botón «Eliminar plantilla» desaparecen)', async () => {
    const other = { ...template, id: 't3', name: 'Otra' }
    templates = [template, other]
    removeTemplate.mockImplementation((_id, { onSuccess }) => {
      templates = [other]
      onSuccess()
    })
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <TemplatesSettings slug="equipo" project={{ id: 'p1', identifier: 'WEB' }} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Eliminar plantilla' }))
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: /Nueva plantilla/ })).toHaveFocus())
  })
})
