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

const ana = { id: 'ana', fullName: 'Ana Ruiz' }
const luis = { id: 'luis', fullName: 'Luis Muñoz' }

function renderDialog(settings = DEFAULT_DAILY_SETTINGS, onOpenChange = () => {}) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DailySettingsDialog slug="equipo" projectId="p1" settings={settings} people={[ana, luis]} open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  )
}

describe('DailySettingsDialog', () => {
  beforeEach(() => {
    dailyApi.saveSettings.mockReset()
    dailyApi.saveSettings.mockImplementation((_slug, _projectId, body) => Promise.resolve(body))
  })

  it('guarda el tiempo general, un tiempo propio, los bloques y los puntos', async () => {
    const onOpenChange = vi.fn()
    renderDialog(DEFAULT_DAILY_SETTINGS, onOpenChange)

    const minutes = screen.getByRole('textbox', { name: 'Tiempo general: minutos' })
    await userEvent.clear(minutes)
    await userEvent.type(minutes, '3')

    await userEvent.click(screen.getByRole('button', { name: 'Dar un tiempo propio a Luis Muñoz' }))
    const own = screen.getByRole('textbox', { name: 'Tiempo de Luis Muñoz: minutos' })
    await userEvent.clear(own)
    await userEvent.type(own, '5')

    await userEvent.click(screen.getByRole('switch', { name: 'Notas del día' }))
    await userEvent.click(screen.getByRole('button', { name: 'Agregar punto' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Punto 1' }), '  Demo  ')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar ajustes' }))

    await waitFor(() => expect(dailyApi.saveSettings).toHaveBeenCalled())
    expect(dailyApi.saveSettings).toHaveBeenCalledWith('equipo', 'p1', {
      secondsPerPerson: 180,
      personTimes: [{ userId: 'luis', seconds: 300 }],
      sections: { summary: true, yesterday: true, today: true, blockers: true, note: false },
      agenda: ['Demo'],
    })
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('no deja guardar un tiempo por debajo del mínimo', async () => {
    renderDialog()
    const minutes = screen.getByRole('textbox', { name: 'Tiempo general: minutos' })
    await userEvent.clear(minutes)
    expect(screen.getByRole('alert')).toHaveTextContent('El mínimo es 15 segundos')
    expect(screen.getByRole('button', { name: 'Guardar ajustes' })).toBeDisabled()
  })

  it('exige dejar visible al menos Ayer, Hoy o Bloqueos', async () => {
    renderDialog()
    for (const name of ['Ayer', 'Hoy', 'Bloqueos']) await userEvent.click(screen.getByRole('switch', { name }))
    expect(screen.getByRole('alert')).toHaveTextContent('al menos uno de los bloques')
    expect(screen.getByRole('button', { name: 'Guardar ajustes' })).toBeDisabled()
  })

  it('muestra el tiempo propio guardado y lo quita con la X', async () => {
    renderDialog({ ...DEFAULT_DAILY_SETTINGS, personTimes: [{ userId: 'ana', seconds: 90 }] })
    expect(screen.getByRole('textbox', { name: 'Tiempo de Ana Ruiz: minutos' })).toHaveValue('1')
    expect(screen.getByRole('textbox', { name: 'Tiempo de Ana Ruiz: segundos' })).toHaveValue('30')
    await userEvent.click(screen.getByRole('button', { name: 'Quitar el tiempo propio de Ana Ruiz' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar ajustes' }))
    await waitFor(() => expect(dailyApi.saveSettings).toHaveBeenCalled())
    expect(dailyApi.saveSettings.mock.calls[0][2].personTimes).toEqual([])
  })
})
