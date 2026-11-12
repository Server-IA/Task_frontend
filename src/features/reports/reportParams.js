import { t } from '@/i18n'

/**
 * Opciones de un reporte de tareas (funciones puras): cómo se agrupa y ordena, qué secciones lleva, los rangos de
 * fechas y cómo se arma la consulta para la API.
 */

/** Cómo se agrupa el listado del PDF (lo que acepta `groupBy` en el backend). */
export const REPORT_GROUPS = [
  { value: 'STATE', label: t('Estado') },
  { value: 'PRIORITY', label: t('Prioridad') },
  { value: 'ASSIGNEE', label: t('Persona') },
  { value: 'TYPE', label: t('Tipo') },
  { value: 'NONE', label: t('Sin agrupar') },
]

/** Orden dentro de cada grupo (lo que acepta `sort`). */
export const REPORT_SORTS = [
  { value: 'PRIORITY', label: t('Prioridad') },
  { value: 'NEWEST', label: t('Más recientes') },
  { value: 'OLDEST', label: t('Más antiguas') },
  { value: 'UPDATED', label: t('Actualizadas recientemente') },
  { value: 'DUE_DATE', label: t('Fecha límite') },
  { value: 'TITLE', label: t('Título (A-Z)') },
  { value: 'MANUAL', label: t('Orden del tablero') },
]

/** Secciones del PDF que se pueden quitar. */
export const REPORT_SECTIONS = [
  { key: 'summary', label: t('Resumen'), hint: t('Totales y reparto por estado, prioridad, persona y tipo.') },
  { key: 'issues', label: t('Listado de tareas'), hint: t('La tabla con código, título, estado, prioridad, asignados, etiquetas y fecha.') },
]

export const DEFAULT_REPORT_OPTIONS = {
  createdFrom: null,
  createdTo: null,
  dueFrom: null,
  dueTo: null,
  groupBy: 'STATE',
  sort: 'PRIORITY',
  summary: true,
  issues: true,
}

/** Un rango al revés («desde» después de «hasta»): las fechas son «2026-11-10», que se comparan como texto. */
export const isRangeReversed = (from, to) => Boolean(from && to && from > to)

/**
 * Por qué no se puede generar el reporte con esas opciones, o null si se puede.
 * @param {typeof DEFAULT_REPORT_OPTIONS} options
 */
export function reportOptionsError(options) {
  if (isRangeReversed(options.createdFrom, options.createdTo)) return t('En «Creadas», la fecha «desde» es posterior a «hasta».')
  if (isRangeReversed(options.dueFrom, options.dueTo)) return t('En «Fecha límite», la fecha «desde» es posterior a «hasta».')
  if (!options.summary && !options.issues) return t('Deja al menos una sección: el resumen o el listado.')
  return null
}

/**
 * Parámetros de la consulta: los filtros del listado (como van a la API de tareas) más las opciones del reporte.
 * Lo vacío no viaja; las secciones solo cuando se quitan (por defecto van las dos).
 * @param {Record<string, unknown>} queryFilters `queryFilters` de useIssueFilters
 * @param {typeof DEFAULT_REPORT_OPTIONS} options
 */
export function reportParams(queryFilters, options) {
  const params = {}
  for (const [key, value] of Object.entries(queryFilters ?? {})) {
    if (Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '') params[key] = value
  }
  for (const key of ['createdFrom', 'createdTo', 'dueFrom', 'dueTo']) {
    if (options[key]) params[key] = options[key]
  }
  params.groupBy = options.groupBy
  params.sort = options.sort
  if (!options.summary) params.summary = false
  if (!options.issues) params.issues = false
  return params
}

/** Solo lo que decide qué tareas entran (la vista previa no depende de cómo se agrupa ni de las secciones). */
export function previewParams(queryFilters, options) {
  const { groupBy: _groupBy, sort: _sort, summary: _summary, issues: _issues, ...params } = reportParams(queryFilters, options)
  return params
}

/** «reporte-tareas-PORT-2026-11-10.pdf» (en inglés, «task-report-PORT-2026-11-10.pdf»). */
export const reportFileName = (identifier, isoDay) => t('reporte-tareas-{identifier}-{date}.pdf', { identifier, date: isoDay })
