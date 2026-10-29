import { describe, expect, it } from 'vitest'
import {
  actionsProgress,
  applyVote,
  buildNewNote,
  buildNoteUpdate,
  canEditNote,
  groupNotes,
  participantCount,
  previousClosedCycle,
  removeNote,
  retroPhase,
  shortName,
  sortByVotes,
  takesOwner,
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

describe('responsable de las acciones', () => {
  it('solo las acciones llevan responsable al crearlas', () => {
    expect(takesOwner('ACTION')).toBe(true)
    expect(takesOwner('IMPROVE')).toBe(false)
    expect(buildNewNote('ACTION', '  Dividir WEB-2  ', 'luis')).toEqual({ column: 'ACTION', text: 'Dividir WEB-2', ownerId: 'luis' })
    expect(buildNewNote('ACTION', 'Sin dueño', null)).toEqual({ column: 'ACTION', text: 'Sin dueño' })
    expect(buildNewNote('WENT_WELL', 'Bien', 'luis')).toEqual({ column: 'WENT_WELL', text: 'Bien' })
  })

  it('al editar solo viaja lo que cambió', () => {
    const action = note('a', 'ACTION', 0, '', { text: 'Dividir WEB-2', owner: luis })
    expect(buildNoteUpdate(action, { text: 'Dividir WEB-2 en tres', ownerId: 'luis' })).toEqual({ text: 'Dividir WEB-2 en tres' })
    expect(buildNoteUpdate(action, { text: 'Dividir WEB-2', ownerId: 'ana' })).toEqual({ ownerId: 'ana' })
    expect(buildNoteUpdate(action, { text: ' Dividir WEB-2 ', ownerId: 'luis' })).toBeNull()
  })

  it('quitar el responsable es clearOwner; las otras columnas no lo mandan', () => {
    const action = note('a', 'ACTION', 0, '', { text: 'Dividir WEB-2', owner: luis })
    expect(buildNoteUpdate(action, { ownerId: null })).toEqual({ clearOwner: true })
    expect(buildNoteUpdate(note('b', 'ACTION', 0, '', { text: 'x', owner: null }), { ownerId: null })).toBeNull()
    expect(buildNoteUpdate(note('c', 'IMPROVE', 0, '', { text: 'x' }), { ownerId: 'luis' })).toBeNull()
  })

  it('un texto vacío no se manda (el backend respondería 400)', () => {
    expect(buildNoteUpdate(note('a', 'IMPROVE', 0, '', { text: 'algo' }), { text: '   ' })).toBeNull()
  })

  it('el responsable se muestra con nombre y primer apellido', () => {
    expect(shortName({ fullName: 'Luis Muñoz Pérez' })).toBe('Luis Muñoz')
    expect(shortName({ fullName: '  Ana  ' })).toBe('Ana')
    expect(shortName(null)).toBe('')
  })
})
