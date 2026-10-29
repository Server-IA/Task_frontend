import { effectiveTypes, typesToUrl } from './issueTypes'

/**
 * Qué filtros de Tareas se ven como pastillas y cuáles quedan dentro de «+ filtro» (funciones puras).
 * Sin vista guardada, estado, prioridad, asignado, etiqueta y tipo están siempre a la vista (punteados mientras están
 * vacíos; el tipo siempre tiene valor: tareas y bugs por defecto) y «+ filtro» agrega los menos usados: ciclo, módulo
 * y bloqueadas. Con una vista guardada aplicada solo se
 * ven los filtros que tienen valor (o que cambiaron respecto de la vista) y todo lo demás está en «+ filtro».
 */

/** Los filtros, en el orden en que se muestran. `common`: siempre a la vista sin vista guardada. */
export const FILTER_KINDS = [
  { key: 'state', title: 'estado', type: 'multi', common: true },
  { key: 'priority', title: 'prioridad', type: 'multi', common: true },
  { key: 'assignee', title: 'asignado', type: 'multi', common: true },
  { key: 'label', title: 'etiqueta', type: 'multi', common: true },
  { key: 'type', title: 'tipo', type: 'types', common: true },
  { key: 'cycle', title: 'ciclo', type: 'single', common: false },
  { key: 'module', title: 'módulo', type: 'single', common: false },
  { key: 'blocked', title: 'bloqueadas', type: 'toggle', common: false },
]

/** Si el filtro tiene valor. */
export function hasValue(filters, key) {
  const value = filters?.[key]
  // El tipo «tiene valor» cuando no es el de siempre (tareas y bugs)
  if (key === 'type') return typesToUrl(effectiveTypes(value)).length > 0
  return Array.isArray(value) ? value.length > 0 : Boolean(value)
}

/**
 * Reparte los filtros entre la barra y el menú «+ filtro».
 * @param {{ filters: Record<string, unknown>, changed?: string[], compact?: boolean, hideState?: boolean,
 *           hasCycles?: boolean, hasModules?: boolean }} options `compact`: hay una vista guardada aplicada.
 * @returns {{ pills: string[], menu: string[] }} claves de los filtros, en orden
 */
export function splitFilters({ filters, changed = [], compact = false, hideState = false, hasCycles = false, hasModules = false }) {
  const pills = []
  const menu = []
  for (const kind of FILTER_KINDS) {
    if (kind.key === 'state' && hideState) continue
    const active = hasValue(filters, kind.key)
    // Un ciclo o módulo que ya no existe se sigue mostrando si está puesto (para poder quitarlo)
    if (kind.key === 'cycle' && !hasCycles && !active) continue
    if (kind.key === 'module' && !hasModules && !active) continue
    const visible = active || changed.includes(kind.key) || (kind.common && !compact)
    ;(visible ? pills : menu).push(kind.key)
  }
  return { pills, menu }
}
