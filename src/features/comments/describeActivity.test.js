import { describe, expect, it } from 'vitest'
import { describeActivity } from './describeActivity'

describe('describeActivity', () => {
  it('describe cambios de estado y prioridad', () => {
    expect(describeActivity({ field: 'STATE', oldValue: 'Todo', newValue: 'Done' })).toBe(
      'cambió el estado de «Todo» a «Done»',
    )
    expect(describeActivity({ field: 'PRIORITY', oldValue: 'LOW', newValue: 'URGENT' })).toBe(
      'cambió la prioridad de Baja a Urgente',
    )
  })

  it('distingue entre fijar, cambiar y quitar una fecha', () => {
    expect(describeActivity({ field: 'DUE_DATE', oldValue: null, newValue: '2026-11-15' })).toMatch(/^fijó la fecha límite en 15 nov/)
    expect(describeActivity({ field: 'DUE_DATE', oldValue: '2026-11-15', newValue: null })).toBe('quitó la fecha límite')
  })

  it('describe asignados, ciclos y creación', () => {
    expect(describeActivity({ field: 'ASSIGNEES', oldValue: null, newValue: 'Ana, Luis' })).toBe('asignó a Ana, Luis')
    expect(describeActivity({ field: 'ASSIGNEES', oldValue: 'Ana', newValue: null })).toBe('quitó a todos los asignados')
    expect(describeActivity({ field: 'CYCLE', oldValue: 'Sprint 1', newValue: null })).toBe('quitó el issue del ciclo «Sprint 1»')
    expect(describeActivity({ field: 'CREATED', newValue: 'Login' })).toBe('creó el issue')
  })
})
