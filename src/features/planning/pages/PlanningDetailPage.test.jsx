import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlanningIssues } from './PlanningDetailPage'

const todo = { id: 's1', name: 'Todo', group: 'UNSTARTED', color: '#3A3A3A' }
const issues = [{ id: 'i1', code: 'PORT-17', title: 'Textos del correo', type: 'TASK', state: todo, priority: 'LOW', assignees: [] }]
const sprint = { id: 'c1', name: 'Sprint 1' }

function renderIssues(props) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PlanningIssues kind="cycles" slug="equipo" projectId="p1" item={sprint} issues={issues} onOpenIssue={() => {}} {...props} />
    </QueryClientProvider>,
  )
}

describe('PlanningIssues', () => {
  it('en un ciclo abierto cada tarea se puede quitar', () => {
    renderIssues({ onAdd: () => {} })
    expect(screen.getByRole('button', { name: 'Quitar PORT-17 del ciclo' })).toBeInTheDocument()
  })

  it('en un ciclo cerrado no muestra «Quitar» (el backend responde 409)', () => {
    renderIssues({ canRemove: false })
    expect(screen.getByRole('button', { name: /PORT-17/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Quitar PORT-17 del ciclo' })).not.toBeInTheDocument()
  })
})
