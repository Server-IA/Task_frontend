/**
 * Cuentas de los criterios de aceptación (CRITERION) y los pasos de la checklist (CHECK) de una tarea.
 * `position` empieza en 0 dentro de cada tipo, igual que en el backend.
 */

/** @typedef {import('@/api/types').ChecklistItem} ChecklistItem */

const byPosition = (a, b) => a.position - b.position

/**
 * Elementos de un tipo, en orden.
 * @param {ChecklistItem[]} items
 * @param {'CRITERION' | 'CHECK'} kind
 */
export function itemsOfKind(items = [], kind) {
  return items.filter((item) => item.kind === kind).sort(byPosition)
}

/** Conteos con los mismos nombres que IssueResponse (para actualizar tarjetas y filas al instante). */
export function summarizeChecklist(items = []) {
  const count = (kind, done) => items.filter((item) => item.kind === kind && (!done || item.done)).length
  return {
    criteriaTotal: count('CRITERION'),
    criteriaDone: count('CRITERION', true),
    checklistTotal: count('CHECK'),
    checklistDone: count('CHECK', true),
  }
}

/**
 * Mueve un elemento a `toIndex` dentro de su tipo y renumera las posiciones de ese tipo.
 * @param {ChecklistItem[]} items todos los elementos de la tarea
 * @returns {{ items: ChecklistItem[], position: number } | null} null si no cambia nada
 */
export function moveChecklistItem(items, itemId, toIndex) {
  const moved = items.find((item) => item.id === itemId)
  if (!moved) return null
  const ordered = itemsOfKind(items, moved.kind)
  const from = ordered.findIndex((item) => item.id === itemId)
  const to = Math.max(0, Math.min(ordered.length - 1, toIndex))
  if (from === to) return null

  const next = [...ordered]
  next.splice(from, 1)
  next.splice(to, 0, moved)
  const positions = new Map(next.map((item, index) => [item.id, index]))
  return {
    items: items.map((item) => (positions.has(item.id) ? { ...item, position: positions.get(item.id) } : item)),
    position: to,
  }
}

/** Índice al que va un elemento arrastrado sobre otro (`overId`) del mismo tipo; null si no aplica. */
export function dropIndex(items, activeId, overId) {
  const active = items.find((item) => item.id === activeId)
  const over = items.find((item) => item.id === overId)
  if (!active || !over || active.kind !== over.kind) return null
  return itemsOfKind(items, active.kind).findIndex((item) => item.id === overId)
}

/** Criterio con la forma «Dado …, cuando …, entonces …» (como los de las plantillas). */
const GHERKIN = /^\s*dado\s+(.+?),?\s+cuando\s+(.+?),?\s+entonces\s+(.+?)\s*$/is

/**
 * Separa un criterio en sus tres partes para mostrarlo en columnas; null si no tiene esa forma.
 * @returns {{ given: string, when: string, then: string } | null}
 */
export function parseCriterion(text = '') {
  const match = GHERKIN.exec(text)
  if (!match) return null
  const [, given, when, then] = match
  return { given: given.trim(), when: when.trim(), then: then.trim() }
}

/** Las tres partes → «Dado …, cuando …, entonces …». */
export function formatCriterion({ given, when, then }) {
  return `Dado ${given.trim()}, cuando ${when.trim()}, entonces ${then.trim()}`
}
