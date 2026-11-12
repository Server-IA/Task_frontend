import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { DEFAULT_MENU_ORDER } from './menuOrder'
import { MenuOrderDialog } from './MenuOrderDialog'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const labels = (name) =>
  within(screen.getByRole('region', { name }))
    .getAllByRole('listitem')
    .map((item) => item.textContent.replace(/^\d+/, '').replace(/[A-Z,]$/, ''))

describe('MenuOrderDialog', () => {
  beforeEach(() => usePreferencesStore.setState({ menuOrder: DEFAULT_MENU_ORDER }))

  it('alfabético reordena el menú principal y las secciones', async () => {
    render(<MenuOrderDialog open onOpenChange={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Alfabético' }))
    expect(usePreferencesStore.getState().menuOrder.mode).toBe('alpha')
    expect(labels('Menú principal')[0]).toBe('Actividad')
    expect(labels('Secciones del proyecto')[0]).toBe('Ajustes')
  })

  it('personalizado parte del orden que se ve y deja subir y bajar entradas', async () => {
    render(<MenuOrderDialog open onOpenChange={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Personalizado' }))
    expect(usePreferencesStore.getState().menuOrder.main).toEqual(['inbox', 'my-work', 'activity', 'projects', 'settings'])

    await userEvent.click(screen.getByRole('button', { name: 'Subir «Proyectos»' }))
    await userEvent.click(screen.getByRole('button', { name: 'Bajar «Tareas»' }))

    const { menuOrder } = usePreferencesStore.getState()
    expect(menuOrder.main).toEqual(['inbox', 'my-work', 'projects', 'activity', 'settings'])
    expect(menuOrder.sections.slice(0, 2)).toEqual(['stories', 'issues'])
    // La primera no sube y la última no baja
    expect(screen.getByRole('button', { name: 'Subir «Bandeja»' })).toBeDisabled()
    // «Ajustes» está en las dos listas: cada una tiene el suyo
    expect(within(screen.getByRole('region', { name: 'Menú principal' })).getByRole('button', { name: 'Bajar «Ajustes»' })).toBeDisabled()
  })

  it('volver a «Personalizado» recupera el orden propio en vez de pisarlo', async () => {
    render(<MenuOrderDialog open onOpenChange={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Personalizado' }))
    await userEvent.click(screen.getByRole('button', { name: 'Subir «Proyectos»' }))
    const custom = usePreferencesStore.getState().menuOrder.main

    await userEvent.click(screen.getByRole('button', { name: 'Alfabético' }))
    await userEvent.click(screen.getByRole('button', { name: 'Personalizado' }))

    expect(usePreferencesStore.getState().menuOrder.main).toEqual(custom)
  })

  it('por defecto no deja mover nada', () => {
    render(<MenuOrderDialog open onOpenChange={() => {}} />)
    expect(screen.queryByRole('button', { name: /Subir/ })).not.toBeInTheDocument()
    expect(screen.getByText('siempre primero')).toBeInTheDocument()
  })
})
