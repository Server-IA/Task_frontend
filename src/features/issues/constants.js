import { t } from '@/i18n'

export const PRIORITIES = [
  { value: 'URGENT', label: t('Urgente') },
  { value: 'HIGH', label: t('Alta') },
  { value: 'MEDIUM', label: t('Media') },
  { value: 'LOW', label: t('Baja') },
  { value: 'NONE', label: t('Sin prioridad') },
]

export const PRIORITY_LABELS = Object.fromEntries(PRIORITIES.map(({ value, label }) => [value, label]))

/**
 * Opciones de orden del listado (el backend acepta `sort=campo,dirección`). `priorityRank` ordena de urgente a sin
 * prioridad y, dentro de cada prioridad, por fecha límite y número. `summary`: cómo se lee en el resumen de una vista.
 */
export const SORT_OPTIONS = [
  { value: 'sortOrder,asc', label: t('Manual') },
  { value: 'priorityRank,asc', label: t('Prioridad'), summary: t('prioridad, luego fecha') },
  { value: 'sequenceId,desc', label: t('Más recientes') },
  { value: 'sequenceId,asc', label: t('Más antiguos') },
  { value: 'updatedAt,desc', label: t('Actualizados recientemente') },
  { value: 'dueDate,asc', label: t('Fecha límite') },
  { value: 'title,asc', label: t('Título (A-Z)') },
]

export const DEFAULT_SORT = 'sortOrder,asc'
const SORT_VALUES = new Set(SORT_OPTIONS.map((option) => option.value))

/**
 * El orden de la URL o de una vista guardada, si es uno de los de la lista; si no (un enlace viejo o editado a mano,
 * «-createdAt»), el manual: el backend responde 400 a un orden que no conoce.
 * @param {string | null | undefined} value
 */
export const sanitizeSort = (value) => (SORT_VALUES.has(value) ? value : DEFAULT_SORT)

/** Cómo se agrupan las filas de la lista. Lo mismo acepta `groupBy` en las vistas guardadas. */
export const GROUP_BY_OPTIONS = [
  { value: 'state', label: t('Estado') },
  { value: 'priority', label: t('Prioridad') },
  { value: 'assignee', label: t('Asignado') },
  { value: 'label', label: t('Etiqueta') },
  { value: 'type', label: t('Tipo') },
]
export const GROUP_BY_DEFAULT = 'state'

/**
 * Agrupar del tablero: las columnas siempre son los estados; «historia» agrega un carril por historia (y «Sin
 * historia»). Se guarda en el mismo `groupBy` (la lista ignora «story» y el tablero, los de la lista).
 */
export const BOARD_GROUP_OPTIONS = [
  { value: 'state', label: t('Ninguno') },
  { value: 'story', label: t('Historia') },
]
export const BOARD_GROUP_STORY = 'story'

/** Tamaño de página del listado y de la carga del Kanban (el backend permite hasta 200). */
export const LIST_PAGE_SIZE = 50
export const BOARD_PAGE_SIZE = 200

/** Parámetro de la URL con la vista guardada que está aplicada en la lista de tareas. */
export const SAVED_VIEW_PARAM = 'savedView'

/**
 * Clase de una fila que se abre con un clic en cualquier parte pero cuyo botón (para el teclado) es solo el título
 * (`data-row-main`): la fila se resalta cuando ese botón tiene el foco.
 */
export const ROW_FOCUS = 'has-[[data-row-main]:focus-visible]:bg-accent'
