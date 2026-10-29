import { PRIORITY_LABELS } from '@/features/issues/constants'

/**
 * Aplicar una plantilla al formulario de nueva tarea y textos que la resumen.
 * Una plantilla pone el prefijo del título, la descripción, la prioridad, el estado, los asignados, las etiquetas
 * y la checklist.
 */

/** @typedef {import('@/api/types').IssueTemplate} IssueTemplate */
/**
 * @typedef {{ title: string, description: string, priority: string, stateId: string | null, assigneeIds: string[],
 *             labelIds: string[] }} TemplateFields
 */

/** Quita el prefijo de una plantilla del inicio del título (si lo tiene). */
export function stripPrefix(title = '', prefix) {
  if (!prefix) return title
  if (title.startsWith(prefix)) return title.slice(prefix.length)
  // «[Bug]» sin el espacio final también cuenta
  const trimmed = prefix.trimEnd()
  return trimmed && title.startsWith(trimmed) ? title.slice(trimmed.length).trimStart() : title
}

/**
 * Valores del formulario con la plantilla aplicada. `base` son los valores de antes de aplicar cualquier
 * plantilla: lo que la plantilla no fija vuelve a ellos (así cambiar de una plantilla a otra no arrastra
 * la descripción o la prioridad de la anterior). El título conserva lo escrito y solo cambia el prefijo.
 * Con `template` null se quita la plantilla.
 * @param {TemplateFields} values valores actuales
 * @param {IssueTemplate | null} template plantilla nueva
 * @param {{ previous?: IssueTemplate | null, base: TemplateFields }} context
 * @returns {TemplateFields}
 */
export function applyTemplate(values, template, { previous = null, base }) {
  const title = stripPrefix(values.title, previous?.titlePrefix)
  if (!template) {
    return {
      title,
      description: base.description,
      priority: base.priority,
      stateId: base.stateId,
      assigneeIds: base.assigneeIds,
      labelIds: base.labelIds,
    }
  }
  const prefix = template.titlePrefix ?? ''
  return {
    title: prefix && !title.startsWith(prefix) ? `${prefix}${title}` : title,
    description: template.description ?? base.description,
    priority: template.priority && template.priority !== 'NONE' ? template.priority : base.priority,
    stateId: template.state?.id ?? base.stateId,
    assigneeIds: template.assignees?.length ? template.assignees.map((user) => user.id) : base.assigneeIds,
    labelIds: template.labels?.length ? template.labels.map((label) => label.id) : base.labelIds,
  }
}

/**
 * Si la descripción se editó después de aplicar la plantilla: cambiar de plantilla (o quitarla) la reemplaza por otra,
 * y «Deshacer» solo vuelve a la de antes de la primera plantilla. Sin plantilla aplicada no se pierde nada.
 * @param {string} description descripción actual
 * @param {IssueTemplate | null} template plantilla aplicada
 * @param {TemplateFields | null} base valores de antes de aplicar la primera plantilla
 */
export function descriptionEditedSinceTemplate(description, template, base) {
  if (!template) return false
  const applied = template.description ?? base?.description ?? ''
  return (description ?? '').trim() !== applied.trim()
}

/**
 * Qué valores del formulario siguen siendo los de la plantilla (para el punto dorado de cada pastilla): solo los
 * que la plantilla fija y nadie cambió después.
 * @param {IssueTemplate | null} template
 * @param {{ priority: string, stateId: string | null, assigneeIds: string[], labelIds: string[] }} values
 */
export function fromTemplateFlags(template, values) {
  const sameIds = (list = [], ids = []) =>
    list.length > 0 && list.length === ids.length && list.every((item) => ids.includes(item.id))
  return {
    priority: Boolean(template?.priority) && template.priority !== 'NONE' && values.priority === template.priority,
    state: Boolean(template?.state) && values.stateId === template.state.id,
    assignees: sameIds(template?.assignees, values.assigneeIds),
    labels: sameIds(template?.labels, values.labelIds),
  }
}

/** [«4 pasos», «1 criterio»] (sin los que no tiene). */
function checklistParts(checklist = []) {
  const steps = checklist.filter((item) => item.kind === 'CHECK').length
  const criteria = checklist.filter((item) => item.kind === 'CRITERION').length
  return [
    steps > 0 && `${steps} ${steps === 1 ? 'paso' : 'pasos'}`,
    criteria > 0 && `${criteria} ${criteria === 1 ? 'criterio' : 'criterios'}`,
  ].filter(Boolean)
}

/** «4 pasos · 1 criterio» (vacío si no tiene). */
export function checklistLabel(checklist = []) {
  return checklistParts(checklist).join(' · ')
}

/** «Luis Muñoz» → «@Luis». */
const mention = (user) => `@${user.fullName?.trim().split(/\s+/)[0] ?? ''}`

/** Resumen de la lista de plantillas: «[Bug] · bug · alta · Por hacer · @Ana · 4 pasos · 1 criterio». */
export function templateSummary(template) {
  return [
    template.titlePrefix?.trim(),
    ...(template.labels ?? []).map((label) => label.name),
    template.priority && template.priority !== 'NONE' ? PRIORITY_LABELS[template.priority].toLowerCase() : null,
    template.state?.name,
    ...(template.assignees ?? []).map(mention),
    checklistLabel(template.checklist),
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Lo que aplicó la plantilla, para el aviso del diálogo: «prefijo, descripción, prioridad y 4 pasos». */
export function appliedParts(template) {
  const parts = [
    template.titlePrefix && 'prefijo',
    template.description && 'descripción',
    template.labels?.length && (template.labels.length === 1 ? 'etiqueta' : 'etiquetas'),
    template.priority && template.priority !== 'NONE' && 'prioridad',
    template.state && 'estado',
    template.assignees?.length && (template.assignees.length === 1 ? 'asignado' : 'asignados'),
    ...checklistParts(template.checklist),
  ].filter(Boolean)
  if (parts.length <= 1) return parts[0] ?? 'nada'
  return `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}`
}

/** Cuántas tareas se crearon con la plantilla: «12 usos», «1 uso», «sin usos». */
export function usesLabel(count = 0) {
  if (!count) return 'sin usos'
  return `${count} ${count === 1 ? 'uso' : 'usos'}`
}
