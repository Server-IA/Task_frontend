import { describe, expect, it } from 'vitest'
import { identifierFromCode, mergeCandidates, projectOf, relationTarget } from './relationCandidates'

const web = 'p-web'
const amc = 'p-amc'

describe('agregar relación', () => {
  it('primero las del proyecto, luego las de otros, sin repetir ni la tarea misma', () => {
    const projectIssues = [
      { id: '15', projectId: web, code: 'WEB-15' },
      { id: '18', projectId: web, code: 'WEB-18' },
    ]
    const workspaceIssues = [
      { id: 'a4', projectId: amc, code: 'AMC-4' },
      { id: '18', projectId: web, code: 'WEB-18' },
      { id: '25', projectId: web, code: 'WEB-25' },
      { id: 'a1', projectId: amc, code: 'AMC-1' },
    ]
    const merged = mergeCandidates({ projectIssues, workspaceIssues, projectId: web, issueId: '15' })
    expect(merged.map((issue) => issue.code)).toEqual(['WEB-18', 'WEB-25', 'AMC-4', 'AMC-1'])
  })

  it('sin búsqueda global quedan solo las del proyecto', () => {
    expect(mergeCandidates({ projectIssues: [{ id: '1', projectId: web }], projectId: web, issueId: 'x' })).toHaveLength(1)
  })

  it('proyecto de un resultado: el de la lista o el identificador del código', () => {
    const projects = new Map([[amc, { id: amc, name: 'App Móvil Clientes', identifier: 'AMC' }]])
    expect(projectOf({ projectId: amc, code: 'AMC-4' }, projects).name).toBe('App Móvil Clientes')
    expect(projectOf({ projectId: 'p-x', code: 'MKT-12' }, projects)).toEqual({ id: 'p-x', identifier: 'MKT' })
    // Si la tarea trae su proyecto (con el color), se usa ese
    const mkt = { id: 'p-x', name: 'Marketing', identifier: 'MKT', color: 'PINK' }
    expect(projectOf({ projectId: 'p-x', code: 'MKT-12', project: mkt }, projects)).toBe(mkt)
    // La lista de proyectos manda: está al día si el project manager acaba de cambiar el color
    expect(projectOf({ projectId: amc, code: 'AMC-4', project: { id: amc, color: 'TEAL' } }, projects).name).toBe(
      'App Móvil Clientes',
    )
    expect(identifierFromCode('APP-WEB-3')).toBe('APP-WEB')
    expect(identifierFromCode('raro')).toBe('')
  })
})

describe('a dónde lleva una tarea relacionada', () => {
  const context = { slug: 'equipo', projectId: web }
  it('de este proyecto se abre en el panel', () => {
    expect(relationTarget({ accessible: true, issue: { id: '2', project: { id: web } } }, context)).toEqual({ kind: 'panel' })
  })
  it('de otro proyecto con acceso lleva a su proyecto', () => {
    expect(relationTarget({ accessible: true, issue: { id: 'a4', project: { id: amc } } }, context)).toEqual({
      kind: 'link',
      to: '/equipo/projects/p-amc/issues?issue=a4',
    })
  })
  it('sin acceso no lleva a ninguna parte', () => {
    expect(relationTarget({ accessible: false, issue: { id: 'a4', project: { id: amc } } }, context)).toEqual({ kind: 'none' })
  })
})
