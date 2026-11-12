import { t, tn } from '@/i18n'
import { formatDecimal, percent } from './chartMath'

/**
 * Cómo se leen las estadísticas de desarrollo (GitHub) en Estadísticas y en Reportes (funciones puras): las cinco
 * cifras con su explicación y los tiempos en palabras.
 */

/**
 * Horas de apertura a fusión como cifra y unidad: menos de una hora en minutos («12 min»), hasta dos días en horas
 * («5,3 h») y desde ahí en días («3,1 días»).
 * @param {number | null | undefined} hours
 * @returns {{ value: string, unit?: string }}
 */
export function mergeTime(hours) {
  if (hours == null) return { value: '—' }
  if (hours < 1) return { value: String(Math.max(1, Math.round(hours * 60))), unit: 'min' }
  if (hours < 48) return { value: formatDecimal(hours), unit: 'h' }
  const days = hours / 24
  return { value: formatDecimal(days), unit: Math.round(days * 10) === 10 ? t('día') : t('días') }
}

/** Duración media de un workflow: «45 s», «3 min 20 s» o «1 h 05 min»; «—» sin dato. */
export function formatDuration(seconds) {
  if (seconds == null) return '—'
  if (seconds < 60) return `${seconds} s`
  if (seconds < 3600) {
    const rest = seconds % 60
    return rest === 0 ? `${Math.floor(seconds / 60)} min` : `${Math.floor(seconds / 60)} min ${rest} s`
  }
  return `${Math.floor(seconds / 3600)} h ${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')} min`
}

/**
 * Las cinco cifras de desarrollo: PR abiertos, fusionados, tiempo medio a fusión, Actions correctas y tareas con PR
 * fusionado. `value` es el número ya formateado; `unit`, lo que va a su lado; `detail`, la línea que lo explica.
 * @param {import('@/api/types').DevelopmentStats} stats
 * @returns {{ key: string, label: string, value: string | number, unit?: string, detail: string, muted?: boolean }[]}
 */
export function developmentFigures(stats) {
  const time = mergeTime(stats.averageHoursToMerge)
  const runs = stats.runsFinished
  const completed = stats.completedIssues
  return [
    {
      key: 'open',
      label: t('PR abiertos'),
      value: stats.openPullRequests,
      detail:
        stats.draftPullRequests > 0
          ? t('{count} en borrador', { count: stats.draftPullRequests })
          : t('ninguno en borrador'),
    },
    {
      key: 'merged',
      label: t('PR fusionados'),
      value: stats.mergedPullRequests,
      detail: t('en las últimas {weeks} semanas', { weeks: stats.weeks }),
    },
    {
      key: 'time',
      label: t('Tiempo a fusión'),
      value: time.value,
      unit: time.unit,
      muted: stats.averageHoursToMerge == null,
      detail:
        stats.averageHoursToMerge == null
          ? t('ningún PR fusionado en el periodo')
          : t('promedio, de apertura a fusión'),
    },
    {
      key: 'runs',
      label: t('Actions correctas'),
      value: runs > 0 ? percent(stats.runsSucceeded, runs) : '—',
      unit: runs > 0 ? '%' : undefined,
      muted: runs === 0,
      detail:
        runs > 0
          ? tn(runs, '{ok} de {count} ejecución terminada', '{ok} de {count} ejecuciones terminadas', {
              ok: stats.runsSucceeded,
            })
          : t('ninguna ejecución terminada en el periodo'),
    },
    {
      key: 'issues',
      label: t('Tareas con PR fusionado'),
      value: completed > 0 ? percent(stats.completedWithMergedPullRequest, completed) : '—',
      unit: completed > 0 ? '%' : undefined,
      muted: completed === 0,
      detail:
        completed > 0
          ? tn(
              completed,
              '{with} de {count} completada en el periodo',
              '{with} de {count} completadas en el periodo',
              {
                with: stats.completedWithMergedPullRequest,
              },
            )
          : t('ninguna tarea completada en el periodo'),
    },
  ]
}
