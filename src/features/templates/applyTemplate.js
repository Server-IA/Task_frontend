import { PRIORITY_LABELS } from '@/features/issues/constants'

/**
 * Aplicar una plantilla al formulario de nueva tarea y textos que la resumen.
 * Una plantilla pone el prefijo del título, la descripción, la prioridad, las etiquetas y la checklist.
 */

/** @typedef {import('@/api/types').IssueTemplate} IssueTemplate */
/** @typedef {{ title: string, description: string, priority: string, labelIds: string[] }} TemplateFields */

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
    return { title, description: base.description, priority: base.priority, labelIds: base.labelIds }
  }
  const prefix = template.titlePrefix ?? ''
  return {
    title: prefix && !title.startsWith(prefix) ? `${prefix}${title}` : title,
    description: template.description ?? base.description,
    priority: template.priority && template.priority !== 'NONE' ? template.priority : base.priority,
    labelIds: template.labels?.length ? template.labels.map((label) => label.id) : base.labelIds,
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

/** Resumen de la lista de plantillas: «[Bug] · bug · alta · 4 pasos · 1 criterio». */
export function templateSummary(template) {
  return [
    template.titlePrefix?.trim(),
    ...(template.labels ?? []).map((label) => label.name),
    template.priority && template.priority !== 'NONE' ? PRIORITY_LABELS[template.priority].toLowerCase() : null,
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
