import { useCallback, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { filesApi } from '@/features/files/api'
import { parseFileReference, rememberPreview } from '@/features/files/fileRefs'
import { uploadQueue } from '@/features/files/uploadQueue'
import { avatarTarget, useUploads } from '@/features/files/uploads'
import { useSessionStore } from '@/stores/sessionStore'
import { avatarFile } from './cropImage'

/** Clave de las subidas de la foto de perfil en la cola de la app. */
export const AVATAR_SCOPE = 'avatar'
const ACTIVE = new Set(['queued', 'uploading', 'confirming'])

/**
 * Guarda el usuario que devolvió la API (con su foto nueva o sin foto) en la sesión y en `me`, y vuelve a pedir lo que
 * muestra su avatar (miembros, asignados, comentarios…). Las URLs firmadas no hace falta pedirlas de nuevo.
 */
export function useApplyUser() {
  const queryClient = useQueryClient()
  return useCallback(
    (user) => {
      queryClient.setQueryData(queryKeys.me, user)
      useSessionStore.getState().setUser(user)
      queryClient.invalidateQueries({ predicate: (query) => !['me', 'fileUrl'].includes(query.queryKey[0]) })
    },
    [queryClient],
  )
}

/**
 * La subida de la foto (ya recortada) por la cola de la app: sigue aunque se salga del perfil. Al confirmarse, la vista
 * previa local queda recordada para que la foto nueva se vea al instante, sin descargarla.
 */
export function useAvatarUpload(queue = uploadQueue) {
  const applyUser = useApplyUser()
  const { tasks } = useUploads(AVATAR_SCOPE, queue)
  const task = tasks.at(-1) ?? null

  // Al salir del perfil se olvida el «Foto actualizada» (una subida en curso o con error sigue en la cola)
  useEffect(
    () => () => {
      queue
        .getSnapshot()
        .filter((current) => current.scope === AVATAR_SCOPE && current.status === 'done')
        .forEach((current) => queue.dismiss(current.id))
    },
    [queue],
  )

  /** Quita de la lista las subidas anteriores (y libera sus vistas previas si no llegaron a guardarse). */
  const clear = useCallback(() => {
    for (const current of queue.getSnapshot().filter((item) => item.scope === AVATAR_SCOPE)) {
      if (current.status !== 'done' && current.meta.previewUrl) URL.revokeObjectURL(current.meta.previewUrl)
      if (ACTIVE.has(current.status)) queue.cancel(current.id)
      else queue.dismiss(current.id)
    }
  }, [queue])

  /** @param {Blob} blob la foto recortada (512 × 512) */
  const start = useCallback(
    (blob) => {
      clear()
      const file = avatarFile(blob)
      const previewUrl = URL.createObjectURL(blob)
      return queue.add(file, {
        target: avatarTarget({
          onDone: (user) => {
            const reference = parseFileReference(user?.avatarUrl)
            if (reference) rememberPreview(reference.id, previewUrl)
            applyUser(user)
          },
        }),
        scope: AVATAR_SCOPE,
        contentType: file.type,
        meta: { previewUrl },
      })
    },
    [queue, clear, applyUser],
  )

  return {
    task,
    active: Boolean(task && ACTIVE.has(task.status)),
    start,
    /** Cancela la subida en curso o descarta la que falló. */
    clear,
    retry: () => task && queue.retry(task.id),
  }
}

/** «Quitar foto»: vuelven las iniciales. */
export function useRemoveAvatar() {
  const applyUser = useApplyUser()
  return useMutation({ mutationFn: filesApi.removeAvatar, onSuccess: applyUser })
}
