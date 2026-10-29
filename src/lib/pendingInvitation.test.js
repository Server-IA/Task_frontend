import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPostLoginPath, pendingInvitation } from './pendingInvitation'

describe('invitación pendiente', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  afterEach(() => vi.useRealTimers())

  it('vuelve a la invitación después del login mientras no vence', () => {
    pendingInvitation.set('tok-1', new Date(Date.now() + 60_000).toISOString())
    expect(getPostLoginPath({ state: null })).toBe('/invitations/tok-1')
  })

  it('una invitación vencida se olvida: no secuestra los logins siguientes', () => {
    pendingInvitation.set('tok-1', new Date(Date.now() - 1000).toISOString())
    expect(pendingInvitation.get()).toBeNull()
    expect(getPostLoginPath({ state: null })).toBe('/')
    expect(localStorage.getItem('taskflow-pending-invitation')).toBeNull()
  })

  it('sin fecha de vencimiento se olvida a los 7 días', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-01T10:00:00Z'))
    pendingInvitation.set('tok-1')
    vi.setSystemTime(new Date('2026-10-07T10:00:00Z'))
    expect(pendingInvitation.get()).toBe('tok-1')
    vi.setSystemTime(new Date('2026-10-08T10:00:01Z'))
    expect(pendingInvitation.get()).toBeNull()
  })

  it('lee el formato viejo (solo el token)', () => {
    localStorage.setItem('taskflow-pending-invitation', 'tok-viejo')
    expect(pendingInvitation.get()).toBe('tok-viejo')
  })

  it('la página que se pedía gana a la invitación', () => {
    pendingInvitation.set('tok-1')
    expect(getPostLoginPath({ state: { from: { pathname: '/acme', search: '?x=1' } } })).toBe('/acme?x=1')
  })
})
