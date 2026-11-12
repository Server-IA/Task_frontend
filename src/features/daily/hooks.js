import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { dailyApi } from './api'

/** Daily de un día. Al cambiar de fecha se mantiene la anterior (atenuada) mientras llega la nueva. */
export function useDaily(slug, projectId, date) {
  return useQuery({
    queryKey: queryKeys.daily(projectId, date),
    queryFn: () => dailyApi.get(slug, projectId, date),
    enabled: Boolean(slug && projectId && date),
    placeholderData: keepPreviousData,
  })
}

/**
 * `mutate(text)`: guarda la nota del día y la deja en caché (null si se borró). Los guardados de una misma nota
 * van en fila (`scope`): si corrieran a la vez, una respuesta vieja que llegara tarde pisaría el texto nuevo.
 */
export function useSaveDailyNote(slug, projectId, date) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (text) => dailyApi.saveNote(slug, projectId, date, text),
    scope: { id: `daily-note:${projectId}:${date}` },
    onSuccess: (note) =>
      queryClient.setQueryData(queryKeys.daily(projectId, date), (daily) => (daily ? { ...daily, note } : daily)),
  })
}

/** Ajustes de la daily del proyecto (cambian poco: se piden una vez y se refrescan al guardar). */
export function useDailySettings(slug, projectId) {
  return useQuery({
    queryKey: queryKeys.dailySettings(projectId),
    queryFn: () => dailyApi.getSettings(slug, projectId),
    enabled: Boolean(slug && projectId),
    staleTime: 60_000,
  })
}

/** `mutate(body)`: guarda los ajustes y los deja en caché. */
export function useSaveDailySettings(slug, projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => dailyApi.saveSettings(slug, projectId, body),
    onSuccess: (settings) => queryClient.setQueryData(queryKeys.dailySettings(projectId), settings),
  })
}
