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

/** Carril de una tarea en el tablero agrupado por historia: el id de su historia o «none» (Sin historia). */
export const NO_STORY_LANE = 'none'

export function laneKeyOf(issue) {
  return issue?.parent?.type === 'STORY' ? issue.parent.id : NO_STORY_LANE
}

/**
 * Columna de un carril: «carril|estado» (los ids no llevan «|»). Sin carriles (`laneKey` null) es solo el estado.
 * @param {string | null} laneKey
 * @param {string} stateId
 */
export function columnKey(laneKey, stateId) {
  return laneKey == null ? stateId : `${laneKey}|${stateId}`
}

/** Estado de una columna (`columnKey`). */
export function stateOfColumn(key) {
  return String(key).split('|').pop()
}

/** Carril de una columna (`columnKey`); null en el tablero sin carriles. */
export function laneOfColumn(key) {
  const parts = String(key).split('|')
  return parts.length > 1 ? parts[0] : null
}

/**
 * Las columnas de todos los carriles en un solo mapa (`columnKey` → ids en orden): así una tarjeta se puede soltar
 * en el carril de otra historia.
 * @param {{ key: string, issues: import('@/api/types').IssueResponse[] }[]} lanes
 * @param {import('@/api/types').StateResponse[]} states
 */
export function groupByLaneAndState(lanes, states) {
  const columns = {}
  for (const lane of lanes) {
    for (const [stateId, ids] of Object.entries(groupByState(lane.issues, states))) columns[columnKey(lane.key, stateId)] = ids
  }
  return columns
}
