/**
 * Lógica del Kanban, igual a la del backend (SortOrderCalculator).
 * Las tarjetas se separan por GAP y al mover una se usa el promedio de sus vecinas.
 */
export const GAP = 65535

/**
 * Vecinas de una tarjeta en el orden final de su columna.
 * @param {string[]} columnIds ids de la columna destino en orden, incluida la tarjeta movida
 * @param {string} issueId tarjeta movida
 * @returns {{ afterIssueId: string | null, beforeIssueId: string | null }}
 *   afterIssueId = la de arriba, beforeIssueId = la de abajo (lo que espera PATCH /move)
 */
export function getNeighbors(columnIds, issueId) {
  const index = columnIds.indexOf(issueId)
  if (index === -1) return { afterIssueId: null, beforeIssueId: null }
  return {
    afterIssueId: index > 0 ? columnIds[index - 1] : null,
    beforeIssueId: index < columnIds.length - 1 ? columnIds[index + 1] : null,
  }
}

/** sortOrder que asignará el backend (se usa para la actualización optimista). */
export function sortOrderBetween(above, below, maxInColumn) {
  if (above != null && below != null) return (above + below) / 2
  if (above != null) return above + GAP
  if (below != null) return below - GAP
  return maxInColumn == null ? GAP : maxInColumn + GAP
}

/**
 * Agrupa los issues por estado, ordenados por sortOrder.
 * @param {import('@/api/types').IssueResponse[]} issues
 * @param {import('@/api/types').StateResponse[]} states
 * @returns {Record<string, string[]>} stateId → ids de issues
 */
export function groupByState(issues, states) {
  const columns = Object.fromEntries(states.map((state) => [state.id, []]))
  // Desempate por número: dos issues pueden compartir sortOrder si se crearon a la vez
  const sorted = [...issues].sort((a, b) => a.sortOrder - b.sortOrder || a.sequenceId - b.sequenceId)
  for (const issue of sorted) {
    if (columns[issue.state?.id]) columns[issue.state.id].push(issue.id)
  }
  return columns
}

/** Columna (stateId) en la que está un issue. */
export function findColumn(columns, issueId) {
  return Object.keys(columns).find((stateId) => columns[stateId].includes(issueId)) ?? null
}
