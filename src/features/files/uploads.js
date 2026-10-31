import { useCallback, useSyncExternalStore } from 'react'
import { filesApi } from './api'
import { validateFile } from './fileTypes'
import { uploadQueue } from './uploadQueue'

/**
 * Destinos de la cola de subidas y el hook para ver las subidas de un lugar (los adjuntos de una tarea, las imágenes de
 * un editor).
 */

/**
 * Archivos de una tarea (o de «Nueva tarea», sin `issueId`).
 * @param {{ slug: string, projectId: string, issueId?: string | null, purpose: 'ATTACHMENT' | 'INLINE_IMAGE',
 *           onDone?: (file: import('./api').StoredFile, task: import('./uploadQueue').UploadTask) => void }} options
 * @returns {import('./uploadQueue').UploadTarget}
 */
export function projectTarget({ slug, projectId, issueId = null, purpose, onDone }) {
  return {
    create: (task) =>
      filesApi.createUpload(slug, projectId, { purpose, issueId, fileName: task.name, contentType: task.contentType, size: task.size }),
    confirm: (ticket) => filesApi.confirm(slug, projectId, ticket.file.id),
    discard: (ticket) => filesApi.remove(slug, projectId, ticket.file.id),
    onDone,
  }
}

/**
 * Foto de perfil (ya recortada).
 * @param {{ onDone?: (user: import('@/api/types').UserResponse) => void }} [options]
 * @returns {import('./uploadQueue').UploadTarget}
 */
export function avatarTarget({ onDone } = {}) {
  return {
    create: (task) => filesApi.createAvatarUpload({ contentType: task.contentType, size: task.size }),
    confirm: (ticket) => filesApi.confirmAvatar(ticket.file.id),
    onDone,
  }
}

/**
 * Valida los archivos y los pone en la cola: los válidos se suben; los demás quedan en la lista con su error (un error
 * no frena a los demás).
 * @param {Iterable<File>} files
 * @param {{ target: import('./uploadQueue').UploadTarget, scope: string, imagesOnly?: boolean, meta?: Record<string, any> }} options
 * @param {typeof uploadQueue} [queue]
 * @returns {string[]} ids de las subidas, en el mismo orden
 */
export function enqueueFiles(files, { target, scope, imagesOnly = false, meta = {} }, queue = uploadQueue) {
  return [...files].map((file) => {
    const check = validateFile(file, { imagesOnly })
    return queue.add(file, {
      target,
      scope,
      meta,
      contentType: check.ok ? check.contentType : file.type,
      error: check.ok ? null : check.error,
    })
  })
}

/** Clave de las subidas de los adjuntos de una tarea. */
export const attachmentScope = (issueId) => `attachments:${issueId}`

/**
 * Las subidas de un lugar (en el orden en que se agregaron), con la cola para cancelarlas o reintentarlas.
 * @param {string | ((task: import('./uploadQueue').UploadTask) => boolean)} scope
 * @param {typeof uploadQueue} [queue]
 */
export function useUploads(scope, queue = uploadQueue) {
  const all = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot)
  const matches = useCallback((task) => (typeof scope === 'function' ? scope(task) : task.scope === scope), [scope])
  return { tasks: all.filter(matches), queue }
}

/** «Subiendo 2 imágenes…»: cuántas siguen en curso o en cola. */
export const pendingCount = (tasks) => tasks.filter((task) => ['queued', 'uploading', 'confirming'].includes(task.status)).length
