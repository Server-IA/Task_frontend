import { describe, expect, it } from 'vitest'
import {
  excerptSegments,
  inboxTab,
  isOpenedNotification,
  markReadInPages,
  notificationIssue,
  notificationProject,
  notificationTarget,
  openedIssueFromParams,
  withOpenedIssue,
} from './notificationParts'

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

describe('tarea abierta junto a la Bandeja', () => {
  const mention = { id: 'n1', type: 'ISSUE_MENTIONED', issue, cycle: null, comment: { id: 'c9', excerpt: 'hola' } }
  const assigned = { id: 'n2', type: 'ISSUE_ASSIGNED', issue, cycle: null, comment: null }

  it('la tarea de un aviso (con su comentario); los de retrospectiva no se abren en el panel', () => {
    expect(notificationIssue(mention)).toEqual({ slug: 'equipo', projectId: 'p1', issueId: 'i1', commentId: 'c9' })
    expect(notificationIssue(assigned)).toEqual({ slug: 'equipo', projectId: 'p1', issueId: 'i1', commentId: null })
    expect(notificationIssue({ type: 'RETRO_STARTED', issue: null, cycle })).toBeNull()
    expect(notificationIssue({ type: 'ISSUE_ASSIGNED', issue: { id: 'i1' } })).toBeNull()
  })

  it('va y vuelve de la URL conservando la pestaña', () => {
    const params = withOpenedIssue(new URLSearchParams('tab=mentions'), notificationIssue(mention))
    expect(params.toString()).toBe('tab=mentions&workspace=equipo&project=p1&issue=i1&comment=c9')
    expect(openedIssueFromParams(params)).toEqual(notificationIssue(mention))
    expect(withOpenedIssue(params, null).toString()).toBe('tab=mentions')
    expect(openedIssueFromParams(new URLSearchParams('issue=i1'))).toBeNull()
  })

  it('reconoce el aviso abierto: la misma tarea y el mismo comentario', () => {
    const opened = notificationIssue(mention)
    expect(isOpenedNotification(mention, opened)).toBe(true)
    expect(isOpenedNotification(assigned, opened)).toBe(false)
    expect(isOpenedNotification(assigned, notificationIssue(assigned))).toBe(true)
    expect(isOpenedNotification(mention, null)).toBe(false)
  })

  it('marca leído un aviso en la caché sin quitarlo de la lista', () => {
    const data = { pages: [{ content: [{ id: 'n1', read: false }, { id: 'n2', read: false }] }], pageParams: [0] }
    const next = markReadInPages(data, 'n2')
    expect(next.pages[0].content).toEqual([
      { id: 'n1', read: false },
      { id: 'n2', read: true },
    ])
    expect(next.pageParams).toEqual([0])
    expect(markReadInPages(undefined, 'n1')).toBeUndefined()
  })
})
