import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { filesApi } from './api'
import { uploadQueue } from './uploadQueue'
import { attachmentScope, enqueueFiles, projectTarget } from './uploads'

/** Adjuntos confirmados de la tarea (del más antiguo al más reciente). */
export function useAttachments(slug, projectId, issueId) {
  return useQuery({
    queryKey: queryKeys.attachments(issueId),
    queryFn: () => filesApi.attachments(slug, projectId, issueId),
    enabled: Boolean(slug && projectId && issueId),
  })
}

/** Espacio usado del workspace (para avisar desde el 90 % y bloquear al 100 %). */
export function useStorageUsage(slug, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.storageUsage(slug),
    queryFn: () => filesApi.usage(slug),
    enabled: Boolean(slug) && enabled,
    staleTime: 60_000,
  })
}

/** Lo que cambia al adjuntar o eliminar un archivo de una tarea: su lista, el clip, el historial y el espacio usado. */
export function invalidateTaskFiles(queryClient, { slug, projectId, issueId }) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.attachments(issueId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.issue(issueId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.issuesOf(projectId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.activity(issueId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.workspaceActivityOf(slug) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.storageOf(slug) }),
  ])
}

/**
 * Adjunta archivos a la tarea: los valida y los pone en la cola de subidas (los que no cumplen quedan en la lista de
 * Adjuntos con su error). Al terminar cada uno, se actualizan los adjuntos y la subida sale de la cola.
 * @returns {(files: Iterable<File>) => string[]}
 */
export function useAttachFiles(slug, projectId, issueId) {
  const queryClient = useQueryClient()
  return useCallback(
    (files) =>
      enqueueFiles(files, {
        scope: attachmentScope(issueId),
        target: projectTarget({
          slug,
          projectId,
          issueId,
          purpose: 'ATTACHMENT',
          onDone: (file, task) => {
            invalidateTaskFiles(queryClient, { slug, projectId, issueId }).finally(() => uploadQueue.dismiss(task.id))
          },
        }),
      }),
    [queryClient, slug, projectId, issueId],
  )
}

/** Elimina un archivo de una tarea (quien lo subió o un PM). */
export function useDeleteFile(slug, projectId, issueId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fileId) => filesApi.remove(slug, projectId, fileId),
    onSuccess: () => invalidateTaskFiles(queryClient, { slug, projectId, issueId }),
  })
}

/**
 * Destino de las imágenes que se pegan en un editor de la tarea (descripción o comentario). Sin `issueId`, de
 * «Nueva tarea»: el backend las liga a la tarea al crearla.
 */
export function inlineImageTarget(slug, projectId, issueId = null) {
  return projectTarget({ slug, projectId, issueId, purpose: 'INLINE_IMAGE' })
}
