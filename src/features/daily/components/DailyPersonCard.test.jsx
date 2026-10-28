import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DailyPersonCard } from './DailyPersonCard'

const ana = { id: 'ana', fullName: 'Ana' }
const luis = { id: 'luis', fullName: 'Luis Muñoz Pérez' }
const state = (name, group) => ({ id: name, name, group, color: '#F59E0B' })
const ref = (id, code, title, extra = {}) => ({ id, code, title, state: state('Por hacer', 'UNSTARTED'), assignees: [], ...extra })

const person = {
  user: ana,
  openCount: 3,
  cycleAssignedCount: 3,
  cycleCompletedCount: 1,
  yesterday: [{ issue: ref('12', 'WEB-12', 'Rediseñar la portada'), change: 'movió a En revisión', fromState: 'En curso', toState: 'En revisión' }],
  today: [ref('19', 'WEB-19', 'Formulario de contacto', { dueDate: '2026-10-28', assignees: [ana, luis] })],
  blockers: [
    {
      issue: ref('15', 'WEB-15', 'Pantalla de perfil'),
      blockedBy: [
        ref('2', 'WEB-2', 'Implementar API de login', { assignees: [luis], project: { id: 'p1', name: 'Sitio web', identifier: 'WEB' } }),
        { id: '9', code: 'AMC-9', title: null, assignees: [], project: { id: 'p2', name: 'App', identifier: 'AMC' } },
      ],
    },
  ],
}

describe('DailyPersonCard', () => {
  it('muestra los contadores del ciclo, el cambio de estado, la fecha límite y quién bloquea', () => {
    const onOpenIssue = vi.fn()
    render(
      <DailyPersonCard
        person={person}
        cycle={{ id: 's1', name: 'Sprint 1', startDate: '2026-10-15', endDate: '2026-10-29' }}
        date="2026-10-27"
        projectId="p1"
        onOpenIssue={onOpenIssue}
      />,
    )
    expect(screen.getByText('3 tareas asignadas · 1 hecha')).toBeInTheDocument()
    expect(screen.getByText('En curso → En revisión')).toBeInTheDocument()
    expect(screen.getByText('vence mañana')).toBeInTheDocument()
    expect(screen.getByText('compartida con Luis')).toBeInTheDocument()
    expect(screen.getByText('(Luis)', { exact: false })).toBeInTheDocument()
    // La de este proyecto se abre; la de un proyecto sin acceso queda como texto
    expect(screen.getByRole('button', { name: 'WEB-2' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'AMC-9' })).not.toBeInTheDocument()
    expect(screen.getByTitle('De un proyecto al que no tienes acceso')).toHaveTextContent('AMC-9')
  })

  it('sin ciclo en curso muestra sus tareas abiertas', () => {
    render(<DailyPersonCard person={person} cycle={null} date="2026-10-27" projectId="p1" onOpenIssue={() => {}} />)
    expect(screen.getByText('3 tareas abiertas')).toBeInTheDocument()
  })
})
