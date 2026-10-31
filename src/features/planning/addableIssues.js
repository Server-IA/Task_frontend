/** Grupos de estado de trabajo ya terminado: no tiene sentido planearlo en un ciclo. */
const DONE_GROUPS = new Set(['COMPLETED', 'CANCELLED'])

/**
 * Tareas que se pueden agregar a un ciclo o módulo: las que no están ya ahí. En un ciclo, además, solo trabajo
 * pendiente (sin las terminadas o canceladas, que incluye las historias cerradas); en un módulo valen todas, porque
 * un módulo también documenta lo que ya se hizo.
 * @param {import('@/api/types').IssueResponse[]} issues
 * @param {Set<string>} existingIds
 * @param {'cycles' | 'modules'} kind
 */
export function addableIssues(issues, existingIds, kind) {
  return issues.filter(
    (issue) => !existingIds.has(issue.id) && (kind !== 'cycles' || !DONE_GROUPS.has(issue.state?.group)),
  )
}
