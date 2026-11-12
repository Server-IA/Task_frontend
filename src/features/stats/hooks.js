import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { statsApi } from './api'
import { assigneesKey } from './personFilter'

/**
 * Estadísticas del periodo y, si hay, solo de las personas elegidas. Al cambiar el periodo o las personas se
 * mantienen los datos anteriores (atenuados) mientras llegan los nuevos.
 */
export function useProjectStats(slug, projectId, weeks, assignees = []) {
  const assignee = assigneesKey(assignees)
  return useQuery({
    // Mismo prefijo ['stats', proyecto] que invalidan las mutaciones de tareas
    queryKey: [...queryKeys.stats(projectId, weeks), assignee],
    queryFn: () => statsApi.get(slug, projectId, { weeks, assignee }),
    enabled: Boolean(slug && projectId),
    placeholderData: keepPreviousData,
  })
}

/**
 * Estadísticas de desarrollo (GitHub) del periodo. No dependen del filtro de personas: un pull request no siempre
 * tiene a alguien de TaskFlow detrás.
 */
export function useDevelopmentStats(slug, projectId, weeks) {
  return useQuery({
    queryKey: [...queryKeys.stats(projectId, weeks), 'development'],
    queryFn: () => statsApi.development(slug, projectId, { weeks }),
    enabled: Boolean(slug && projectId),
    placeholderData: keepPreviousData,
  })
}
