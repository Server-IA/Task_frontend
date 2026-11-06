import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { cyclesApi } from '../api'
import { IssuePlanningProperties } from './IssuePlanningProperties'

vi.mock('../api', () => ({
  cyclesApi: { list: vi.fn(), addIssues: vi.fn(), removeIssue: vi.fn() },
  modulesApi: { list: vi.fn().mockResolvedValue([]) },
}))

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
})

const sprint1 = { id: 'c1', name: 'Sprint 1', closedAt: '2026-10-26T10:00:00Z' }
const sprint2 = { id: 'c2', name: 'Sprint 2', closedAt: null }

async function openCyclePicker(cycle) {
  cyclesApi.list.mockResolvedValue([sprint1, sprint2])
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <IssuePlanningProperties slug="equipo" projectId="p1" issue={{ id: 'i1', cycle, modules: [] }} />
    </QueryClientProvider>,
  )
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Ciclo' }))
  await screen.findByRole('option', { name: /Sprint 2/ })
}

describe('CyclePicker', () => {
  it('en un ciclo abierto ofrece quitarla del ciclo', async () => {
    await openCyclePicker({ id: 'c2', name: 'Sprint 2' })
    expect(screen.getByRole('option', { name: /Quitar del ciclo/ })).toBeInTheDocument()
  })

  it('en un ciclo cerrado no ofrece quitarla (responde 409), pero sí pasarla a uno abierto', async () => {
    await openCyclePicker({ id: 'c1', name: 'Sprint 1' })
    expect(screen.queryByRole('option', { name: /Quitar del ciclo/ })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Sprint 2/ })).toBeInTheDocument()
  })
})
