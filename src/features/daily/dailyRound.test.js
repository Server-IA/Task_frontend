import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { dailySummaryText, orderPeople, shuffled, useDailyRound } from './dailyRound'

const ana = { user: { id: 'a', fullName: 'Ana Gómez' } }
const luis = { user: { id: 'l', fullName: 'Luis Pérez' } }
const marta = { user: { id: 'm', fullName: 'Marta Ríos' } }

describe('orderPeople', () => {
  it('sigue el orden sorteado y deja al final a quien entró después', () => {
    expect(orderPeople([ana, luis, marta], ['m', 'a']).map((person) => person.user.id)).toEqual([
      'm',
      'a',
      'l',
    ])
    expect(orderPeople([ana, luis], null)).toEqual([ana, luis])
  })
})

describe('shuffled', () => {
  it('devuelve las mismas personas en otro orden que el anterior', () => {
    const next = shuffled(['a', 'l', 'm'], ['a', 'l', 'm'], () => 0)
    expect([...next].sort()).toEqual(['a', 'l', 'm'])
    expect(next).not.toEqual(['a', 'l', 'm'])
    expect(shuffled(['a'])).toEqual(['a'])
  })
})

describe('dailySummaryText', () => {
  it('arma la daily en texto: puntos, ayer, hoy, bloqueos y la nota', () => {
    const text = dailySummaryText({
      projectName: 'Web',
      daily: { date: '2026-11-12' },
      agenda: ['avisos'],
      note: 'Revisar el deploy',
      people: [
        {
          user: ana.user,
          yesterday: [{ issue: { code: 'WEB-1', title: 'Login' }, fromState: 'En curso', toState: 'Hecho' }],
          today: [{ code: 'WEB-2', title: 'Perfil' }],
          blockers: [{ issue: { code: 'WEB-2', title: 'Perfil' }, blockedBy: [{ code: 'WEB-9' }] }],
        },
        { user: luis.user, yesterday: [], today: [], blockers: [] },
      ],
    })
    expect(text).toContain('Daily · Web')
    expect(text).toContain('1. avisos')
    expect(text).toContain('  - WEB-1 Login (En curso → Hecho)')
    expect(text).toContain('  - WEB-2 Perfil')
    expect(text).toContain('bloqueada por WEB-9')
    expect(text).toContain('Luis Pérez\n  Ayer: sin cambios\n  Hoy: nada asignado')
    expect(text.endsWith('Notas\nRevisar el deploy')).toBe(true)
  })
})

describe('useDailyRound', () => {
  afterEach(() => window.localStorage.clear())

  it('marca quién habló y los puntos vistos, y lo recuerda por proyecto y fecha', () => {
    const { result, rerender } = renderHook(({ date }) => useDailyRound('p1', date), {
      initialProps: { date: '2026-11-12' },
    })
    act(() => result.current.toggleSpoke('a'))
    act(() => result.current.toggleAgenda(0))
    act(() => result.current.markSpoke('a'))
    expect(result.current.round.spoke).toEqual(['a'])
    expect(result.current.round.agendaDone).toEqual([0])

    // Otro día empieza de cero; al volver, sigue como estaba
    rerender({ date: '2026-11-13' })
    expect(result.current.round.spoke).toEqual([])
    rerender({ date: '2026-11-12' })
    expect(result.current.round.spoke).toEqual(['a'])

    act(() => result.current.toggleSpoke('a'))
    expect(result.current.round.spoke).toEqual([])
  })
})
