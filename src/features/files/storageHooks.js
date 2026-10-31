import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { filesApi } from './api'
import { invalidateTaskFiles } from './hooks'

/**
 * Pestaña «Almacenamiento» de los ajustes del workspace (solo PM): espacio usado, por tipo, por proyecto y los
 * archivos más pesados.
 * @returns {import('@tanstack/react-query').UseQueryResult<import('./storageReport').StorageReport>}
 */
export function useStorageReport(slug, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.storageReport(slug),
    queryFn: () => filesApi.report(slug),
    enabled: Boolean(slug) && enabled,
  })
}

/**
 * Elimina un archivo desde «Archivos más pesados» (un PM puede eliminar cualquiera). Se actualiza igual que al
 * eliminarlo desde su tarea: adjuntos, clip, historial y espacio usado (y con él este informe).
 */
export function useDeleteStoredFile(slug) {
  const queryClient = useQueryClient()
  return useMutation({
    /** @param {import('./storageReport').LargeFile} file */
    mutationFn: (file) => filesApi.remove(slug, file.project.id, file.id),
    onSuccess: (_data, file) =>
      invalidateTaskFiles(queryClient, { slug, projectId: file.project.id, issueId: file.issue?.id ?? null }),
  })
}
