import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { DailyPage } from './DailyPage'

vi.mock('@/features/workspaces/hooks', () => ({ useCurrentWorkspace: () => ({ slug: 'acme', name: 'Acme' }) }))
vi.mock('@/features/projects/hooks', () => ({ useCurrentProject: () => ({ id: 'p1', name: 'Portal', identifier: 'PORT' }) }))
vi.mock('../hooks', () => ({ useDaily: () => ({ data: { people: [], cycle: null, date: null }, isLoading: false }) }))
vi.mock('../components/DailyNoteEditor', () => ({ DailyNoteEditor: () => null }))
vi.mock('@/features/issues/components/IssuePeekSheet', () => ({ IssuePeekSheet: () => null }))

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

describe('Daily: «Atrás» después de cambiar de día', () => {
  it('cada día visitado queda en el historial: «Atrás» vuelve al anterior y no sale de la daily', async () => {
    const router = createMemoryRouter([{ path: '/daily', element: <DailyPage /> }, { path: '/antes', element: <p>antes</p> }], {
      initialEntries: ['/antes', '/daily?date=2026-11-04'],
      initialIndex: 1,
    })
    render(<RouterProvider router={router} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Día hábil anterior' }))
    expect(router.state.location.search).toBe('?date=2026-11-03')

    await act(() => router.navigate(-1))
    expect(router.state.location).toMatchObject({ pathname: '/daily', search: '?date=2026-11-04' })
  })
})
