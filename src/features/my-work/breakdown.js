import { PRIORITIES } from '@/features/issues/constants'

/**
 * Reparto de las tareas de «Mi trabajo» para el panel lateral (funciones puras): cuántas hay por proyecto y por
 * prioridad en la lista que se está viendo.
 */

/**
 * Tareas por proyecto, de más a menos (a igual cantidad, por nombre).
 * @param {{ projectId: string, project?: { id: string, name: string } }[]} issues
 * @param {Map<string, { id: string, name: string }>} projectsById proyectos ya cargados (traen color e identificador)
 * @returns {{ projectId: string, project: object | undefined, name: string, count: number }[]}
 */
export function countByProject(issues, projectsById = new Map()) {
  const rows = new Map()
  for (const issue of issues ?? []) {
    const project = projectsById.get(issue.projectId) ?? issue.project
    const row = rows.get(issue.projectId) ?? { projectId: issue.projectId, project, name: project?.name ?? 'Proyecto', count: 0 }
    row.count += 1
    rows.set(issue.projectId, row)
  }
  return [...rows.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'))
}

/**
 * Tareas por prioridad, de urgente a sin prioridad; solo las que tienen alguna.
 * @param {{ priority?: string }[]} issues
 * @returns {{ priority: string, label: string, count: number }[]}
 */
export function countByPriority(issues) {
  const counts = new Map()
  for (const issue of issues ?? []) {
    const priority = issue.priority ?? 'NONE'
    counts.set(priority, (counts.get(priority) ?? 0) + 1)
  }
  return PRIORITIES.filter((priority) => counts.has(priority.value)).map((priority) => ({
    priority: priority.value,
    label: priority.label,
    count: counts.get(priority.value),
  }))
}
