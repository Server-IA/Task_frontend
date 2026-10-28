import { PRIORITIES } from './constants'

/**
 * Grupos de la vista de lista según «agrupar»: por estado (en el orden de las columnas), prioridad, asignado o
 * etiqueta. Una tarea con dos asignados (o dos etiquetas) aparece en el grupo de cada uno; las que no tienen
 * ninguno van al final («Sin asignar», «Sin etiqueta»).
 */

/** @typedef {import('@/api/types').IssueResponse} IssueResponse */
/**
 * @typedef {{ key: string, kind: 'state' | 'priority' | 'assignee' | 'label', label: string,
 *             state?: object, priority?: string, user?: object | null, labelItem?: object | null,
 *             issues: IssueResponse[] }} IssueGroup
 */

const NONE = 'none'

/**
 * @param {IssueResponse[]} issues tareas de la página, en el orden en que llegan
 * @param {'state' | 'priority' | 'assignee' | 'label'} groupBy
 * @param {{ states: { id: string }[], users: { id: string, fullName: string }[], labels: { id: string }[] }} meta
 * @returns {IssueGroup[]}
 */
export function groupIssues(issues, groupBy, meta) {
  const groups = new Map()
  const add = (key, make, issue) => {
    if (!groups.has(key)) groups.set(key, { key, ...make(), issues: [] })
    groups.get(key).issues.push(issue)
  }

  for (const issue of issues) {
    if (groupBy === 'priority') {
      const priority = issue.priority ?? 'NONE'
      add(priority, () => ({ kind: 'priority', priority, label: PRIORITIES.find((item) => item.value === priority)?.label ?? priority }), issue)
    } else if (groupBy === 'assignee') {
      const people = issue.assignees ?? []
      if (people.length === 0) add(NONE, () => ({ kind: 'assignee', user: null, label: 'Sin asignar' }), issue)
      for (const user of people) add(user.id, () => ({ kind: 'assignee', user, label: user.fullName }), issue)
    } else if (groupBy === 'label') {
      const labels = issue.labels ?? []
      if (labels.length === 0) add(NONE, () => ({ kind: 'label', labelItem: null, label: 'Sin etiqueta' }), issue)
      for (const labelItem of labels) add(labelItem.id, () => ({ kind: 'label', labelItem, label: labelItem.name }), issue)
    } else {
      add(issue.state.id, () => ({ kind: 'state', state: issue.state, label: issue.state.name }), issue)
    }
  }

  const order = groupOrder(groupBy, meta)
  const rank = (group) => (group.key === NONE ? Infinity : (order.get(group.key) ?? order.size))
  return [...groups.values()].sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label, 'es'))
}

/** Posición de cada grupo: columnas del tablero, de urgente a sin prioridad, miembros y etiquetas del proyecto. */
function groupOrder(groupBy, meta) {
  const ids =
    groupBy === 'priority'
      ? PRIORITIES.map((item) => item.value)
      : groupBy === 'assignee'
        ? [...meta.users].sort((a, b) => a.fullName.localeCompare(b.fullName, 'es')).map((user) => user.id)
        : groupBy === 'label'
          ? meta.labels.map((label) => label.id)
          : meta.states.map((state) => state.id)
  return new Map(ids.map((id, index) => [id, index]))
}
