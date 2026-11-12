/**
 * Orden del menú lateral (funciones puras). Cada persona elige cómo lo ve: como viene, alfabético o a su gusto.
 * «Buscar» no entra aquí: siempre va primero.
 */
import { localeTag, t } from '@/i18n'

/** Entradas del menú principal en su orden de fábrica. `key` es estable (se guarda en las preferencias). */
export const MAIN_MENU = [
  { key: 'inbox', label: t('Bandeja') },
  { key: 'my-work', label: t('Mi trabajo') },
  { key: 'activity', label: t('Actividad') },
  { key: 'projects', label: t('Proyectos') },
  { key: 'settings', label: t('Ajustes') },
]

/** Secciones de un proyecto. `path` es su clave y su ruta. */
export const PROJECT_SECTIONS = [
  { path: 'issues', label: t('Tareas') },
  { path: 'stories', label: t('Historias') },
  { path: 'cycles', label: t('Ciclos') },
  { path: 'daily', label: t('Daily') },
  { path: 'modules', label: t('Módulos') },
  { path: 'roadmap', label: t('Hoja de ruta') },
  { path: 'stats', label: t('Estadísticas') },
  { path: 'reports', label: t('Reportes') },
  { path: 'github', label: 'GitHub' },
  { path: 'settings', label: t('Ajustes') },
]

/** Secciones del proyecto que solo ve quien tiene ese permiso (las demás, cualquiera del proyecto). */
export const SECTION_PERMISSIONS = {
  stats: 'STATS_VIEW',
  reports: 'REPORT_GENERATE',
}

export const MENU_ORDER_MODES = [
  { value: 'default', label: t('Por defecto') },
  { value: 'alpha', label: t('Alfabético') },
  { value: 'custom', label: t('Personalizado') },
]
const MODE_VALUES = new Set(MENU_ORDER_MODES.map((mode) => mode.value))

/** Preferencia inicial: el orden de fábrica. */
export const DEFAULT_MENU_ORDER = { mode: 'default', main: [], sections: [] }

/** Lo guardado en el navegador, saneado (una versión vieja o editada a mano no rompe el menú). */
export function sanitizeMenuOrder(value) {
  const keys = (list) => (Array.isArray(list) ? list.filter((key) => typeof key === 'string') : [])
  return {
    mode: MODE_VALUES.has(value?.mode) ? value.mode : 'default',
    main: keys(value?.main),
    sections: keys(value?.sections),
  }
}

/**
 * Ordena `items` según el modo. En «alfabético» se ordena por el nombre ya traducido, con las reglas del idioma
 * elegido. En «personalizado» manda `customKeys`; lo que no esté ahí (una sección nueva que
 * todavía no existía cuando la persona ordenó) va al final en su orden de fábrica, y las claves que ya no existen se
 * ignoran.
 * @template T
 * @param {T[]} items en orden de fábrica
 * @param {'default' | 'alpha' | 'custom'} mode
 * @param {string[]} customKeys
 * @param {(item: T) => string} keyOf
 * @param {(item: T) => string} labelOf
 * @returns {T[]}
 */
export function orderItems(items, mode, customKeys = [], keyOf = (item) => item.key, labelOf = (item) => item.label) {
  if (mode === 'alpha') {
    return [...items].sort((a, b) => labelOf(a).localeCompare(labelOf(b), localeTag(), { sensitivity: 'base' }))
  }
  if (mode !== 'custom') return items
  const position = new Map(customKeys.map((key, index) => [key, index]))
  const rank = (item, index) => (position.has(keyOf(item)) ? position.get(keyOf(item)) : customKeys.length + index)
  return items
    .map((item, index) => ({ item, rank: rank(item, index) }))
    .sort((a, b) => a.rank - b.rank)
    .map((entry) => entry.item)
}

/** Las claves con `key` movida a `toIndex` (sin cambios si no está o el destino no vale). */
export function moveKey(keys, key, toIndex) {
  const from = keys.indexOf(key)
  if (from === -1 || toIndex < 0 || toIndex >= keys.length || from === toIndex) return keys
  const next = [...keys]
  next.splice(from, 1)
  next.splice(toIndex, 0, key)
  return next
}
