/**
 * Reglas de la retrospectiva (funciones puras): columnas, orden por votos, permisos de cada nota y
 * cambios en la retro en caché (agregar, quitar y votar sin esperar a recargar).
 */

/** @typedef {import('@/api/types').RetroResponse} RetroResponse */
/** @typedef {import('@/api/types').RetroNote} RetroNote */
/** @typedef {import('@/api/types').RetroColumn} RetroColumn */
/** @typedef {'NOT_STARTED' | 'OPEN' | 'FINISHED'} RetroPhase */

/** Votos de cada persona por retrospectiva (el backend responde 409 al pasarse). */
export const MAX_VOTES = 5
/** Largo máximo del texto de una nota. */
export const NOTE_MAX_LENGTH = 500

/** Las tres columnas, en orden. */
export const RETRO_COLUMNS = /** @type {const} */ ([
  { key: 'WENT_WELL', name: 'Qué salió bien', placeholder: 'Algo que funcionó y conviene repetir…' },
  { key: 'IMPROVE', name: 'Qué mejorar', placeholder: 'Algo que costó o salió peor de lo esperado…' },
  { key: 'ACTION', name: 'Acciones', placeholder: 'Algo concreto que el equipo hará en el próximo ciclo…' },
])

/** En curso (se puede escribir y votar), terminada (solo lectura) o sin empezar. */
export function retroPhase(retro) {
  if (!retro?.started) return 'NOT_STARTED'
  return retro.finishedAt ? 'FINISHED' : 'OPEN'
}

/**
 * Más votadas primero; a igual número de votos, la más antigua primero (el orden en que se escribieron).
 * @param {RetroNote[]} notes
 */
export function sortByVotes(notes) {
  return [...(notes ?? [])].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0) || time(a.createdAt) - time(b.createdAt))
}

/** Milisegundos de una fecha ISO (0 si no hay). */
const time = (value) => (value ? Date.parse(value) : 0)

/**
 * Notas de cada columna, ordenadas por votos.
 * @param {RetroNote[]} notes
 * @returns {Record<RetroColumn, RetroNote[]>}
 */
export function groupNotes(notes) {
  const groups = Object.fromEntries(RETRO_COLUMNS.map((column) => [column.key, []]))
  for (const note of sortByVotes(notes)) groups[note.column]?.push(note)
  return groups
}

/** Cuántas personas escribieron al menos una nota. */
export function participantCount(notes) {
  return new Set((notes ?? []).map((note) => note.author?.id).filter(Boolean)).size
}

/** Editar o eliminar: su autor o el project manager, y solo con la retro en curso. */
export function canEditNote(note, { userId, manager, phase }) {
  if (phase !== 'OPEN') return false
  return manager || (Boolean(userId) && note.author?.id === userId)
}

/** Solo las acciones tienen responsable (en las otras columnas el backend responde 400). */
export const takesOwner = (column) => column === 'ACTION'

/**
 * Cuerpo de POST /notes: el responsable viaja solo en las acciones y si se eligió.
 * @param {RetroColumn} column
 * @param {string} text
 * @param {string | null} [ownerId]
 * @returns {{ column: RetroColumn, text: string, ownerId?: string }}
 */
export function buildNewNote(column, text, ownerId) {
  const body = { column, text: text.trim() }
  if (ownerId && takesOwner(column)) body.ownerId = ownerId
  return body
}

/**
 * Cuerpo parcial de PATCH /notes/{id}: solo lo que cambió. Quitar el responsable es `clearOwner: true`.
 * @param {RetroNote} note
 * @param {{ text?: string, ownerId?: string | null }} changes `ownerId` null = sin responsable
 * @returns {import('@/api/types').UpdateRetroNoteRequest | null} null si no cambió nada
 */
export function buildNoteUpdate(note, { text, ownerId }) {
  const patch = {}
  if (text !== undefined && text.trim() && text.trim() !== (note.text ?? '').trim()) patch.text = text.trim()
  if (ownerId !== undefined && takesOwner(note.column) && ownerId !== (note.owner?.id ?? null)) {
    if (ownerId) patch.ownerId = ownerId
    else patch.clearOwner = true
  }
  return Object.keys(patch).length > 0 ? patch : null
}

/** Votar (o quitar el voto): con la retro en curso y, para votar, si te quedan votos. */
export function voteState(note, retro) {
  if (retroPhase(retro) !== 'OPEN') return { enabled: false, reason: 'closed' }
  if (note.votedByMe) return { enabled: true }
  if ((retro.myVotesLeft ?? 0) <= 0) return { enabled: false, reason: 'noVotes' }
  return { enabled: true }
}

/** Reemplaza la nota (por id) o la agrega al final. */
export function upsertNote(retro, note) {
  const notes = retro.notes ?? []
  const exists = notes.some((item) => item.id === note.id)
  return { ...retro, notes: exists ? notes.map((item) => (item.id === note.id ? note : item)) : [...notes, note] }
}

/** Quita la nota; si tenía tu voto, lo recuperas. */
export function removeNote(retro, noteId) {
  const note = retro.notes?.find((item) => item.id === noteId)
  return {
    ...retro,
    notes: (retro.notes ?? []).filter((item) => item.id !== noteId),
    myVotesLeft: (retro.myVotesLeft ?? 0) + (note?.votedByMe ? 1 : 0),
  }
}

/** Voto optimista: suma o resta uno a la nota y a tus votos restantes (si el cambio aplica). */
export function applyVote(retro, noteId, vote) {
  const note = retro.notes?.find((item) => item.id === noteId)
  if (!note || Boolean(note.votedByMe) === vote) return retro
  if (vote && (retro.myVotesLeft ?? 0) <= 0) return retro
  const delta = vote ? 1 : -1
  return {
    ...upsertNote(retro, { ...note, votedByMe: vote, votes: Math.max(0, (note.votes ?? 0) + delta) }),
    myVotesLeft: (retro.myVotesLeft ?? 0) - delta,
  }
}

/** Acciones de la retro anterior: cuántas tienen su tarea hecha. */
export function actionsProgress(actions) {
  const list = actions ?? []
  return { done: list.filter((note) => note.issue?.state?.group === 'COMPLETED').length, total: list.length }
}

/**
 * El ciclo cerrado justo antes de este (el mismo criterio del backend para «acciones de la retro anterior»):
 * el último cerrado antes que él o, si este sigue abierto, el último cerrado.
 * @param {import('@/api/types').CycleResponse} cycle
 * @param {import('@/api/types').CycleResponse[]} cycles
 */
export function previousClosedCycle(cycle, cycles) {
  if (!cycle) return null
  const candidates = (cycles ?? []).filter(
    (other) => other.closedAt && other.id !== cycle.id && (!cycle.closedAt || time(other.closedAt) < time(cycle.closedAt)),
  )
  return candidates.reduce((latest, other) => (!latest || time(other.closedAt) > time(latest.closedAt) ? other : latest), null)
}
