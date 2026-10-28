import { describe, expect, it } from 'vitest'
import { excerptSegments, inboxTab, notificationProject, notificationTarget } from './notificationParts'

const issue = { id: 'i1', code: 'WEB-12', title: 'Portada', projectId: 'p1', workspaceSlug: 'equipo' }
const cycle = { id: 'c1', name: 'Sprint 1', projectId: 'p1', projectIdentifier: 'WEB', workspaceSlug: 'equipo' }

describe('avisos de la Bandeja', () => {
  it('pestaña de la URL', () => {
    expect(inboxTab(null)).toBe('unread')
    expect(inboxTab('mentions')).toBe('mentions')
    expect(inboxTab('all')).toBe('all')
    expect(inboxTab('otra')).toBe('unread')
  })

  it('lleva a la tarea o a la retrospectiva del ciclo', () => {
    expect(notificationTarget({ type: 'ISSUE_MENTIONED', issue })).toBe('/equipo/projects/p1/issues?issue=i1')
    expect(notificationTarget({ type: 'RETRO_STARTED', issue: null, cycle })).toBe('/equipo/projects/p1/cycles/c1/retro')
    expect(notificationTarget({ type: 'ISSUE_ASSIGNED', issue: null })).toBeNull()
  })

  it('proyecto en minúsculas', () => {
    expect(notificationProject({ issue })).toBe('web')
    expect(notificationProject({ issue: null, cycle })).toBe('web')
    expect(notificationProject({ issue: { code: 'APP-WEB-3' } })).toBe('app-web')
    expect(notificationProject({})).toBe('')
  })

  it('resalta mi mención en el extracto', () => {
    expect(excerptSegments('Esto depende del login. @Luis Muñoz ¿me avisas?', 'Luis Muñoz')).toEqual([
      { text: 'Esto depende del login. ', me: false },
      { text: '@Luis Muñoz', me: true },
      { text: ' ¿me avisas?', me: false },
    ])
    expect(excerptSegments('@Ana y @Ana', 'Ana')).toEqual([
      { text: '@Ana', me: true },
      { text: ' y ', me: false },
      { text: '@Ana', me: true },
    ])
    expect(excerptSegments('Sin menciones', 'Ana')).toEqual([{ text: 'Sin menciones', me: false }])
    expect(excerptSegments('Hola @Ana', null)).toEqual([{ text: 'Hola @Ana', me: false }])
    expect(excerptSegments('', 'Ana')).toEqual([])
  })
})
