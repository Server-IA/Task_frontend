import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { CreateIssueDialog } from './CreateIssueDialog'

const bugTemplate = {
  id: 't-bug',
  name: 'Reporte de bug',
  titlePrefix: '[Bug] ',
  description: '## Pasos',
  priority: 'HIGH',
  labels: [],
  checklist: [],
}

vi.mock('@/features/templates/hooks', () => ({ useTemplates: () => ({ data: [bugTemplate] }) }))
vi.mock('@/features/workspaces/hooks', () => ({ useIsManager: () => false }))
vi.mock('../useIssueHelpers', () => ({ useProjectMeta: () => ({ states: [], users: [], labels: [], isLoading: false }) }))
vi.mock('../hooks', () => ({ useCreateIssue: () => ({ mutate: vi.fn(), isPending: false }) }))

// jsdom no trae ResizeObserver (lo usan el switch y los selectores de Radix)
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

function renderDialog() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <CreateIssueDialog
          slug="equipo"
          project={{ id: 'p1', identifier: 'WEB', name: 'Sitio web' }}
          open
          onOpenChange={() => {}}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CreateIssueDialog: plantillas', () => {
  it('al elegir una plantilla el cursor queda al final del título y lo escrito va después del prefijo', async () => {
    const user = userEvent.setup()
    renderDialog()
    const title = screen.getByRole('textbox', { name: 'Título' })

    await user.click(screen.getByRole('radio', { name: 'Reporte de bug' }))
    expect(title).toHaveValue('[Bug] ')
    expect(title).toHaveFocus()
    expect(title.selectionStart).toBe('[Bug] '.length)

    await user.keyboard('El login falla')
    expect(title).toHaveValue('[Bug] El login falla')
  })

  it('el cursor se coloca en cuanto se aplica la plantilla, sin esperar temporizadores', () => {
    renderDialog()
    const title = screen.getByRole('textbox', { name: 'Título' })
    fireEvent.change(title, { target: { value: 'Login' } })
    title.blur()
    // react-hook-form enfoca en un setTimeout: con los temporizadores detenidos, el cursor depende solo del diálogo
    vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame'] })
    try {
      fireEvent.click(screen.getByRole('radio', { name: 'Reporte de bug' }))
      expect(title).toHaveFocus()
      expect(title.selectionStart).toBe('[Bug] Login'.length)
    } finally {
      vi.useRealTimers()
    }
  })

  it('cambiar o quitar la plantilla conserva lo escrito y deja el cursor al final', async () => {
    const user = userEvent.setup()
    renderDialog()
    const title = screen.getByRole('textbox', { name: 'Título' })

    await user.keyboard('Login')
    await user.click(screen.getByRole('radio', { name: 'Reporte de bug' }))
    await user.keyboard(' en Safari')
    expect(title).toHaveValue('[Bug] Login en Safari')

    await user.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(title).toHaveValue('Login en Safari')
    await user.keyboard('!')
    expect(title).toHaveValue('Login en Safari!')
  })
})
