import { describe, expect, it } from 'vitest'
import {
  actionsProgress,
  applyVote,
  canEditNote,
  groupNotes,
  participantCount,
  previousClosedCycle,
  removeNote,
  retroPhase,
  sortByVotes,
  upsertNote,
  voteState,
} from './retroNotes'

const ana = { id: 'ana', fullName: 'Ana' }
const luis = { id: 'luis', fullName: 'Luis' }
const note = (id, column, votes, createdAt, extra = {}) => ({ id, column, votes, createdAt, author: ana, votedByMe: false, ...extra })

describe('orden y agrupación', () => {
  it('ordena por votos y, a igual número, por antigüedad', () => {
    const notes = [
      note('a', 'IMPROVE', 1, '2026-10-28T10:00:00Z'),
      note('b', 'IMPROVE', 3, '2026-10-28T10:05:00Z'),
      note('c', 'IMPROVE', 1, '2026-10-28T09:00:00Z'),
    ]
    expect(sortByVotes(notes).map((item) => item.id)).toEqual(['b', 'c', 'a'])
  })

  it('reparte las notas en sus tres columnas (todas presentes aunque estén vacías)', () => {
    const groups = groupNotes([
      note('a', 'ACTION', 0, '2026-10-28T10:00:00Z'),
      note('b', 'WENT_WELL', 2, '2026-10-28T10:00:00Z'),
      note('c', 'WENT_WELL', 4, '2026-10-28T10:01:00Z'),
    ])
    expect(Object.keys(groups)).toEqual(['WENT_WELL', 'IMPROVE', 'ACTION'])
    expect(groups.WENT_WELL.map((item) => item.id)).toEqual(['c', 'b'])
    expect(groups.IMPROVE).toEqual([])
    expect(groups.ACTION.map((item) => item.id)).toEqual(['a'])
  })

  it('cuenta las personas que escribieron', () => {
    expect(participantCount([note('a'), note('b'), note('c', 'IMPROVE', 0, '', { author: luis })])).toBe(2)
    expect(participantCount([])).toBe(0)
  })
})

describe('fases y permisos', () => {
  it('distingue sin empezar, en curso y terminada', () => {
    expect(retroPhase({ started: false })).toBe('NOT_STARTED')
    expect(retroPhase({ started: true, finishedAt: null })).toBe('OPEN')
    expect(retroPhase({ started: true, finishedAt: '2026-10-28T12:00:00Z' })).toBe('FINISHED')
  })

  it('editar y eliminar: el autor o el project manager, solo en curso', () => {
    const own = note('a', 'IMPROVE', 0, '')
    expect(canEditNote(own, { userId: 'ana', manager: false, phase: 'OPEN' })).toBe(true)
    expect(canEditNote(own, { userId: 'luis', manager: false, phase: 'OPEN' })).toBe(false)
    expect(canEditNote(own, { userId: 'luis', manager: true, phase: 'OPEN' })).toBe(true)
    expect(canEditNote(own, { userId: 'ana', manager: true, phase: 'FINISHED' })).toBe(false)
  })

  it('votar requiere votos restantes; quitar el voto siempre se puede en curso', () => {
    const open = { started: true, finishedAt: null, myVotesLeft: 0 }
    expect(voteState(note('a'), open)).toEqual({ enabled: false, reason: 'noVotes' })
    expect(voteState(note('a', 'IMPROVE', 1, '', { votedByMe: true }), open)).toEqual({ enabled: true })
    expect(voteState(note('a'), { ...open, myVotesLeft: 2 })).toEqual({ enabled: true })
    expect(voteState(note('a'), { ...open, finishedAt: '2026-10-28T12:00:00Z' }).enabled).toBe(false)
  })
})

describe('cambios en caché', () => {
  const retro = { started: true, myVotesLeft: 2, notes: [note('a', 'IMPROVE', 1, ''), note('b', 'IMPROVE', 2, '', { votedByMe: true })] }

  it('votar suma a la nota y resta de tus votos; quitarlo hace lo contrario', () => {
    const voted = applyVote(retro, 'a', true)
    expect(voted.notes.find((item) => item.id === 'a')).toMatchObject({ votes: 2, votedByMe: true })
    expect(voted.myVotesLeft).toBe(1)
    const unvoted = applyVote(retro, 'b', false)
    expect(unvoted.notes.find((item) => item.id === 'b')).toMatchObject({ votes: 1, votedByMe: false })
    expect(unvoted.myVotesLeft).toBe(3)
  })

  it('no cambia nada si el voto ya estaba o no quedan votos', () => {
    expect(applyVote(retro, 'b', true)).toBe(retro)
    expect(applyVote({ ...retro, myVotesLeft: 0 }, 'a', true).myVotesLeft).toBe(0)
  })

  it('agrega o reemplaza notas y al borrar una votada devuelve el voto', () => {
    expect(upsertNote(retro, note('c', 'ACTION', 0, '')).notes).toHaveLength(3)
    expect(upsertNote(retro, { ...retro.notes[0], text: 'nuevo' }).notes[0].text).toBe('nuevo')
    const removed = removeNote(retro, 'b')
    expect(removed.notes.map((item) => item.id)).toEqual(['a'])
    expect(removed.myVotesLeft).toBe(3)
  })
})

describe('retro anterior', () => {
  it('cuenta las acciones con su tarea hecha', () => {
    const done = { state: { group: 'COMPLETED' } }
    const open = { state: { group: 'STARTED' } }
    expect(actionsProgress([{ issue: done }, { issue: open }, { issue: null }])).toEqual({ done: 1, total: 3 })
  })

  it('es el último ciclo cerrado antes que este', () => {
    const cycles = [
      { id: 's0', closedAt: '2026-10-01T10:00:00Z' },
      { id: 's1', closedAt: '2026-10-14T10:00:00Z' },
      { id: 's2', closedAt: '2026-10-28T10:00:00Z' },
      { id: 's3', closedAt: null },
    ]
    expect(previousClosedCycle(cycles[2], cycles).id).toBe('s1')
    expect(previousClosedCycle(cycles[3], cycles).id).toBe('s2')
    expect(previousClosedCycle(cycles[0], cycles)).toBeNull()
  })
})
