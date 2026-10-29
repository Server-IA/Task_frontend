import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
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

vi.mock('../hooks', () => ({
  useTemplates: () => ({ data: [template], isLoading: false, error: null, refetch: vi.fn() }),
  useCreateTemplate: () => mutation,
  useUpdateTemplate: () => mutation,
  useDeleteTemplate: () => mutation,
}))
vi.mock('@/features/workspaces/hooks', () => ({ useIsManager: () => true }))
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
    const prefix = screen.getByPlaceholderText('[Bug]', { exact: false })
    expect(name.closest('label')).toHaveClass('text-muted-foreground')
    expect(name).toHaveClass('text-foreground')
    expect(prefix).toHaveClass('text-foreground')
  })
})
