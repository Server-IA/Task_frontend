import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { dailyApi } from '../api'
import { DEFAULT_DAILY_SETTINGS } from '../daily'
import { DailySettingsDialog } from './DailySettingsDialog'

vi.mock('../api', () => ({ dailyApi: { saveSettings: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeAll(() => {
  // jsdom no lo trae y el interruptor de Radix lo usa
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

function renderDialog(settings = DEFAULT_DAILY_SETTINGS, onOpenChange = () => {}) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DailySettingsDialog slug="equipo" projectId="p1" settings={settings} open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  )
}

describe('DailySettingsDialog', () => {
  beforeEach(() => {
    dailyApi.saveSettings.mockReset()
    dailyApi.saveSettings.mockImplementation((_slug, _projectId, body) => Promise.resolve(body))
  })

  it('guarda los bloques y los puntos', async () => {
    const onOpenChange = vi.fn()
    renderDialog(DEFAULT_DAILY_SETTINGS, onOpenChange)

    await userEvent.click(screen.getByRole('switch', { name: 'Notas del día' }))
    await userEvent.click(screen.getByRole('button', { name: 'Agregar punto' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Punto 1' }), '  Demo  ')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar ajustes' }))

    await waitFor(() => expect(dailyApi.saveSettings).toHaveBeenCalled())
    expect(dailyApi.saveSettings).toHaveBeenCalledWith('equipo', 'p1', {
      sections: { summary: true, yesterday: true, today: true, blockers: true, note: false },
      agenda: ['Demo'],
    })
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('ya no pregunta por tiempos', () => {
    renderDialog()
    expect(screen.queryByText(/tiempo/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /minutos/ })).not.toBeInTheDocument()
  })

  it('exige dejar visible al menos Ayer, Hoy o Bloqueos', async () => {
    renderDialog()
    for (const name of ['Ayer', 'Hoy', 'Bloqueos']) await userEvent.click(screen.getByRole('switch', { name }))
    expect(screen.getByRole('alert')).toHaveTextContent('al menos uno de los bloques')
    expect(screen.getByRole('button', { name: 'Guardar ajustes' })).toBeDisabled()
  })

  it('muestra los puntos guardados y deja quitarlos', async () => {
    renderDialog({ ...DEFAULT_DAILY_SETTINGS, agenda: ['Demo', 'Riesgos'] })
    expect(screen.getByRole('textbox', { name: 'Punto 2' })).toHaveValue('Riesgos')
    await userEvent.click(screen.getByRole('button', { name: 'Quitar el punto 1' }))
    // Se pliega antes de salir: luego queda solo el otro, ya como punto 1
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Punto 1' })).toHaveValue('Riesgos'))
    expect(screen.queryByRole('textbox', { name: 'Punto 2' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar ajustes' }))
    await waitFor(() => expect(dailyApi.saveSettings).toHaveBeenCalled())
    expect(dailyApi.saveSettings.mock.calls[0][2].agenda).toEqual(['Riesgos'])
  })

  it('Enter agrega el siguiente punto con el foco puesto y Retroceso en uno vacío lo quita', async () => {
    renderDialog({ ...DEFAULT_DAILY_SETTINGS, agenda: ['Demo'] })
    await userEvent.click(screen.getByRole('textbox', { name: 'Punto 1' }))
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Punto 2' })).toHaveFocus())
    await userEvent.keyboard('Riesgos')
    expect(screen.getByRole('textbox', { name: 'Punto 2' })).toHaveValue('Riesgos')
    await userEvent.click(screen.getByRole('button', { name: /Agregar punto/ }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Punto 3' })).toHaveFocus())
    await userEvent.keyboard('{Backspace}')
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Punto 3' })).not.toBeInTheDocument())
  })
})
