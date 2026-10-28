/**
 * Tareas para «agregar relación» y a dónde lleva cada tarea relacionada (puede ser de otro proyecto del workspace).
 */

/** @typedef {import('@/api/types').IssueResponse} IssueResponse */
/** @typedef {import('@/api/types').IssueRelation} IssueRelation */
/** @typedef {{ id?: string, name?: string, identifier?: string }} ProjectRef */

/**
 * Resultados del buscador: primero las de este proyecto (la lista de tareas) y luego las del resto del workspace
 * (la búsqueda global), sin repetir y sin la tarea misma.
 * @param {{ projectIssues?: IssueResponse[], workspaceIssues?: IssueResponse[], projectId: string, issueId: string }} input
 * @returns {IssueResponse[]}
 */
export function mergeCandidates({ projectIssues = [], workspaceIssues = [], projectId, issueId }) {
  const seen = new Set([issueId])
  const merged = []
  for (const candidate of [...projectIssues, ...workspaceIssues]) {
    if (seen.has(candidate.id)) continue
    seen.add(candidate.id)
    merged.push(candidate)
  }
  const here = (candidate) => (candidate.projectId === projectId ? 0 : 1)
  // sort es estable: dentro de cada grupo se conserva el orden en que llegaron
  return merged.sort((a, b) => here(a) - here(b))
}

/** Identificador del proyecto sacado del código («AMC-4» → «AMC»). */
export function identifierFromCode(code = '') {
  const dash = code.lastIndexOf('-')
  return dash > 0 ? code.slice(0, dash) : ''
}

/**
 * Proyecto de un resultado de búsqueda (trae solo `projectId`): el de la lista de proyectos o, si no está,
 * el identificador del código.
 * @param {IssueResponse} issue
 * @param {Map<string, ProjectRef>} projectsById
 * @returns {ProjectRef}
 */
export function projectOf(issue, projectsById) {
  return projectsById.get(issue.projectId) ?? { id: issue.projectId, identifier: identifierFromCode(issue.code) }
}

/**
 * Qué se puede hacer con una tarea relacionada: abrirla en el panel (es de este proyecto), ir a su proyecto
 * (otro proyecto al que tengo acceso) o nada (no tengo acceso a su proyecto: solo se ve el código).
 * @param {IssueRelation} relation
 * @param {{ slug: string, projectId: string }} context
 * @returns {{ kind: 'panel' } | { kind: 'link', to: string } | { kind: 'none' }}
 */
export function relationTarget(relation, { slug, projectId }) {
  if (relation.accessible === false) return { kind: 'none' }
  const other = relation.issue
  const otherProjectId = other?.project?.id
  if (!otherProjectId || otherProjectId === projectId) return { kind: 'panel' }
  return { kind: 'link', to: `/${slug}/projects/${otherProjectId}/issues?issue=${other.id}` }
}
