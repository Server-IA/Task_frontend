import { describe, expect, it } from 'vitest'
import { assigneesFromParams, assigneesKey, resolveAssignees, toggleAssignee, withAssignees } from './personFilter'

const luis = '68ca120d-32a4-41d9-9b54-b157557ecafb'
const ana = 'b53f54c5-5260-45c6-8e60-e245220d0fc3'

describe('filtro «+ persona»', () => {
  it('lee las personas de la URL: válidas, sin repetir y en orden', () => {
    const params = new URLSearchParams(`weeks=4&assignee=${luis}&assignee=nadie&assignee=${ana}&assignee=${luis}`)
    expect(assigneesFromParams(params)).toEqual([luis, ana])
    expect(assigneesFromParams(new URLSearchParams('weeks=4'))).toEqual([])
  })

  it('escribe las personas sin tocar el periodo', () => {
    const params = withAssignees(new URLSearchParams(`weeks=4&assignee=${luis}`), [ana, luis])
    expect(params.get('weeks')).toBe('4')
    expect(params.getAll('assignee')).toEqual([ana, luis])
    expect(withAssignees(params, []).toString()).toBe('weeks=4')
  })

  it('agrega o quita una persona', () => {
    expect(toggleAssignee([luis], ana)).toEqual([luis, ana])
    expect(toggleAssignee([luis, ana], luis)).toEqual([ana])
  })

  it('la clave de la consulta no depende del orden', () => {
    expect(assigneesKey([luis, ana])).toEqual(assigneesKey([ana, luis]))
  })

  it('nombra a cada persona con los miembros o, si ya no es miembro, con la carga', () => {
    const members = [{ id: ana, fullName: 'Ana' }]
    const workload = [null, { id: luis, fullName: 'Luis Muñoz Pérez' }]
    expect(resolveAssignees([luis, ana], [...members, ...workload]).map((user) => user.fullName)).toEqual([
      'Luis Muñoz Pérez',
      'Ana',
    ])
    expect(resolveAssignees(['x'], members)[0]).toMatchObject({ id: 'x', fullName: 'Persona' })
  })
})
