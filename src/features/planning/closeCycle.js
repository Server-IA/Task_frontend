import { differenceInCalendarDays, parseISO } from 'date-fns'

/**
 * Reglas del cierre de un ciclo (funciones puras: el diálogo y las páginas de ciclos las usan).
 *
 * Las tareas sin terminar van a un destino general y cada una puede tener su excepción:
 * - `NEXT`: al ciclo siguiente que propone el backend (`preview.nextCycle`).
 * - `OTHER`: a otro ciclo abierto que se elige a mano.
 * - `BACKLOG`: salen del ciclo sin cambiar de estado.
 * Cada fila elige entre «el ciclo destino» (`CYCLE`) y `BACKLOG`.
 */

/** @typedef {import('@/api/types').CycleResponse} CycleResponse */
/** @typedef {import('@/api/types').CloseCyclePreview} CloseCyclePreview */
/** @typedef {'NEXT' | 'OTHER' | 'BACKLOG'} CloseMode */
/** @typedef {'CYCLE' | 'BACKLOG'} RowDestination */

/** El ciclo ya se cerró (un ciclo cerrado siempre está COMPLETED y tiene `closedAt`). */
export const isCycleClosed = (cycle) => Boolean(cycle?.closedAt)

/**
 * Se puede cerrar: no está cerrado y ya empezó (tiene fecha de inicio y es de hoy o antes).
 * El backend responde 409 si aún no empieza; un ciclo sin fechas tampoco se ofrece para cerrar.
 * @param {CycleResponse} cycle
 * @param {Date} today
 */
export function canCloseCycle(cycle, today = new Date()) {
  if (!cycle || isCycleClosed(cycle) || !cycle.startDate) return false
  return differenceInCalendarDays(parseISO(cycle.startDate), today) <= 0
}

/** Destino general por defecto: el ciclo siguiente si existe; si no, el backlog. */
export function defaultCloseMode(preview) {
  return preview?.nextCycle ? 'NEXT' : 'BACKLOG'
}

/**
 * Ciclos abiertos que pueden recibir las tareas (todos menos el que se cierra y los ya cerrados).
 * @param {CycleResponse[]} cycles
 * @param {string} cycleId ciclo que se cierra
 */
export function openTargetCycles(cycles, cycleId) {
  return (cycles ?? []).filter((cycle) => cycle.id !== cycleId && !isCycleClosed(cycle))
}

/**
 * Ciclo al que irían las tareas que eligen «ciclo»: el elegido a mano con `OTHER`; si no, el siguiente
 * (también con `BACKLOG`, para las excepciones). `null` si no hay ninguno.
 * @returns {CycleResponse | null}
 */
export function targetCycleOf({ mode, nextCycle, otherCycle }) {
  if (mode === 'OTHER') return otherCycle ?? null
  return nextCycle ?? null
}

/** Destino general expresado como el de una fila. */
export const modeDestination = (mode) => (mode === 'BACKLOG' ? 'BACKLOG' : 'CYCLE')

/**
 * Destino de una tarea: su excepción o el general. Sin ciclo destino, todo va al backlog.
 * @param {string} issueId
 * @param {{ mode: CloseMode, overrides: Record<string, RowDestination>, hasTarget: boolean }} options
 * @returns {RowDestination}
 */
export function rowDestination(issueId, { mode, overrides, hasTarget }) {
  if (!hasTarget) return 'BACKLOG'
  return overrides[issueId] ?? modeDestination(mode)
}

/**
 * Reparte las tareas sin terminar entre el ciclo destino y el backlog, y separa las excepciones
 * (las que no siguen el destino general).
 * @param {import('@/api/types').IssueRef[]} unfinished
 * @param {{ mode: CloseMode, overrides: Record<string, RowDestination>, hasTarget: boolean }} options
 */
export function splitUnfinished(unfinished, options) {
  const toCycle = []
  const toBacklog = []
  const exceptions = []
  const general = options.hasTarget ? modeDestination(options.mode) : 'BACKLOG'
  for (const issue of unfinished ?? []) {
    const destination = rowDestination(issue.id, options)
    ;(destination === 'CYCLE' ? toCycle : toBacklog).push(issue)
    if (destination !== general) exceptions.push(issue)
  }
  return { toCycle, toBacklog, exceptions }
}

/**
 * Cuerpo de POST /close. Solo viajan las excepciones (las filas que no siguen el destino general).
 * @param {{ mode: CloseMode, otherCycleId?: string | null, overrides: Record<string, RowDestination>,
 *           unfinished: import('@/api/types').IssueRef[], hasTarget: boolean, startRetro: boolean }} options
 * @returns {import('@/api/types').CloseCycleRequest}
 */
export function buildCloseRequest({ mode, otherCycleId, overrides, unfinished, hasTarget, startRetro }) {
  const moveTo = mode === 'BACKLOG' || !hasTarget ? 'BACKLOG' : 'NEXT_CYCLE'
  const { exceptions } = splitUnfinished(unfinished, { mode, overrides, hasTarget })
  const body = {
    moveTo,
    overrides: exceptions.map((issue) => ({
      issueId: issue.id,
      moveTo: moveTo === 'BACKLOG' ? 'NEXT_CYCLE' : 'BACKLOG',
    })),
    startRetro: Boolean(startRetro),
  }
  if (mode === 'OTHER' && otherCycleId) body.targetCycleId = otherCycleId
  return body
}

/**
 * Aviso sobre la fecha de fin: al cerrar antes de tiempo (o sin fecha de fin) el fin pasa a hoy.
 * @param {CycleResponse} cycle
 * @param {Date} today
 * @returns {{ kind: 'shortens' | 'today' | 'ended' | 'noEnd', days?: number }}
 */
export function endDateNotice(cycle, today = new Date()) {
  if (!cycle?.endDate) return { kind: 'noEnd' }
  const days = differenceInCalendarDays(parseISO(cycle.endDate), today)
  if (days > 0) return { kind: 'shortens', days }
  if (days === 0) return { kind: 'today' }
  return { kind: 'ended', days: -days }
}

/** «1 tarea» / «3 tareas». */
export const tasksLabel = (count) => `${count} ${count === 1 ? 'tarea' : 'tareas'}`
