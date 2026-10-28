/**
 * Datos derivados de una tarea que se muestran en tarjetas y filas (bloqueo y avance de la checklist)
 * y la regla para pedir confirmación al completarla.
 */

/** @typedef {import('@/api/types').IssueResponse} IssueResponse */
/** @typedef {import('@/api/types').StateResponse} StateResponse */

/** Tareas abiertas que la bloquean (0 si ninguna). */
export const blockedCount = (issue) => issue?.blockedByCount ?? 0

/** Criterios de aceptación sin marcar. */
export const pendingCriteria = (issue) => Math.max(0, (issue?.criteriaTotal ?? 0) - (issue?.criteriaDone ?? 0))

/**
 * Avance de criterios y pasos juntos; null si la tarea no tiene ninguno.
 * @param {IssueResponse} issue
 * @returns {{ done: number, total: number, complete: boolean, label: string } | null}
 */
export function checklistProgress(issue) {
  const checks = issue?.checklistTotal ?? 0
  const criteria = issue?.criteriaTotal ?? 0
  const total = checks + criteria
  if (total === 0) return null
  const done = (issue.checklistDone ?? 0) + (issue.criteriaDone ?? 0)
  const parts = []
  if (checks > 0) parts.push(`${issue.checklistDone ?? 0}/${checks} ${checks === 1 ? 'paso' : 'pasos'}`)
  if (criteria > 0) parts.push(`${issue.criteriaDone ?? 0}/${criteria} ${criteria === 1 ? 'criterio' : 'criterios'}`)
  return { done, total, complete: done === total, label: parts.join(' · ') }
}

/**
 * Pasar la tarea a un estado completado con criterios sin marcar pide confirmación
 * (no la pide si ya estaba en un estado completado).
 * @param {IssueResponse} issue
 * @param {StateResponse | undefined} targetState
 */
export function needsCriteriaConfirm(issue, targetState) {
  if (targetState?.group !== 'COMPLETED' || issue?.state?.group === 'COMPLETED') return false
  return pendingCriteria(issue) > 0
}
