export const PRIORITIES = [
  { value: 'URGENT', label: 'Urgente' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'LOW', label: 'Baja' },
  { value: 'NONE', label: 'Sin prioridad' },
]

export const PRIORITY_LABELS = Object.fromEntries(PRIORITIES.map(({ value, label }) => [value, label]))

/**
 * Opciones de orden del listado (el backend acepta `sort=campo,dirección`). `priorityRank` ordena de urgente a sin
 * prioridad y, dentro de cada prioridad, por fecha límite y número. `summary`: cómo se lee en el resumen de una vista.
 */
export const SORT_OPTIONS = [
  { value: 'sortOrder,asc', label: 'Manual' },
  { value: 'priorityRank,asc', label: 'Prioridad', summary: 'prioridad, luego fecha' },
  { value: 'sequenceId,desc', label: 'Más recientes' },
  { value: 'sequenceId,asc', label: 'Más antiguos' },
  { value: 'updatedAt,desc', label: 'Actualizados recientemente' },
  { value: 'dueDate,asc', label: 'Fecha límite' },
  { value: 'title,asc', label: 'Título (A-Z)' },
]

/** Cómo se agrupan las filas de la lista. Lo mismo acepta `groupBy` en las vistas guardadas. */
export const GROUP_BY_OPTIONS = [
  { value: 'state', label: 'Estado' },
  { value: 'priority', label: 'Prioridad' },
  { value: 'assignee', label: 'Asignado' },
  { value: 'label', label: 'Etiqueta' },
  { value: 'type', label: 'Tipo' },
]
export const GROUP_BY_DEFAULT = 'state'

/**
 * Agrupar del tablero: las columnas siempre son los estados; «historia» agrega un carril por historia (y «Sin
 * historia»). Se guarda en el mismo `groupBy` (la lista ignora «story» y el tablero, los de la lista).
 */
export const BOARD_GROUP_OPTIONS = [
  { value: 'state', label: 'Ninguno' },
  { value: 'story', label: 'Historia' },
]
export const BOARD_GROUP_STORY = 'story'

/** Tamaño de página del listado y de la carga del Kanban (el backend permite hasta 200). */
export const LIST_PAGE_SIZE = 50
export const BOARD_PAGE_SIZE = 200

/** Parámetro de la URL con la vista guardada que está aplicada en la lista de tareas. */
export const SAVED_VIEW_PARAM = 'savedView'
