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

/** Cómo se agrupan las filas de la lista (el tablero siempre va por estado). Lo mismo acepta `groupBy` en las vistas guardadas. */
export const GROUP_BY_OPTIONS = [
  { value: 'state', label: 'Estado' },
  { value: 'priority', label: 'Prioridad' },
  { value: 'assignee', label: 'Asignado' },
  { value: 'label', label: 'Etiqueta' },
]
export const GROUP_BY_DEFAULT = 'state'

/** Tamaño de página del listado y de la carga del Kanban (el backend permite hasta 200). */
export const LIST_PAGE_SIZE = 50
export const BOARD_PAGE_SIZE = 200

/** Parámetro de la URL con la vista guardada que está aplicada en la lista de tareas. */
export const SAVED_VIEW_PARAM = 'savedView'
