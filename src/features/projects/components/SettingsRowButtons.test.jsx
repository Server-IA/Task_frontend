import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LabelsSettings } from './LabelsSettings'
import { StatesSettings } from './StatesSettings'

const mutation = { mutate: vi.fn(), isPending: false }
vi.mock('../hooks', () => ({
  useLabels: () => ({ data: [{ id: 'l1', name: 'frontend', color: '#3B82F6' }, { id: 'l2', name: 'backend', color: '#22C55E' }] }),
  useStates: () => ({
    data: [
      { id: 's1', name: 'Todo', group: 'UNSTARTED', color: '#3A3A3A' },
      { id: 's2', name: 'Done', group: 'COMPLETED', color: '#16A34A' },
    ],
  }),
  useCreateLabel: () => mutation,
  useUpdateLabel: () => mutation,
  useDeleteLabel: () => mutation,
  useCreateState: () => mutation,
  useUpdateState: () => mutation,
  useDeleteState: () => mutation,
  useReorderStates: () => mutation,
}))
vi.mock('@/features/workspaces/hooks', () => ({ useCan: () => true }))

const project = { id: 'p1', identifier: 'PORT' }

describe('ajustes del proyecto: los botones de cada fila dicen de cuál son', () => {
  it('etiquetas: «Editar la etiqueta «frontend»», no siete «Eliminar» iguales para el lector de pantalla', () => {
    render(<LabelsSettings slug="equipo" project={project} />)
    expect(screen.getByRole('button', { name: 'Editar la etiqueta «frontend»' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar la etiqueta «backend»' })).toBeInTheDocument()
  })

  it('estados: subir, bajar, editar y eliminar llevan el nombre del estado', () => {
    render(<StatesSettings slug="equipo" project={project} />)
    expect(screen.getByRole('button', { name: 'Bajar «Sin empezar»' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir «Completado»' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar el estado «Sin empezar»' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar el estado «Completado»' })).toBeInTheDocument()
  })
})
