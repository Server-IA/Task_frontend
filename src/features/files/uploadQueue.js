import { toApiError } from '@/lib/errors'
import { UploadError, xhrPut } from './xhrUpload'

/**
 * Cola de subidas de toda la app: hasta 3 a la vez, el resto espera «en cola». Cada subida pide su URL firmada, manda el
 * archivo directo a R2 (con avance y cancelable) y la confirma. Un error no frena a las demás.
 *
 * Quien agrega una subida indica su `target` (qué endpoints usar) y un `scope` para encontrar las suyas (por ejemplo,
 * los adjuntos de una tarea). Las subidas terminadas quedan en la lista (`done`) hasta que alguien las quita.
 *
 * @typedef {'queued' | 'uploading' | 'confirming' | 'done' | 'error'} UploadStatus
 * @typedef {{
 *   id: string,
 *   name: string,
 *   size: number,
 *   contentType: string,
 *   status: UploadStatus,
 *   progress: number,
 *   error: string | null,
 *   retryable: boolean,
 *   result: any,
 *   scope: string,
 *   meta: Record<string, any>,
 * }} UploadTask
 * @typedef {{
 *   create: (task: UploadTask, file: File) => Promise<import('./api').UploadTicket>,
 *   confirm: (ticket: import('./api').UploadTicket, task: UploadTask) => Promise<any>,
 *   discard?: (ticket: import('./api').UploadTicket) => Promise<unknown>,
 *   onDone?: (result: any, task: UploadTask) => void,
 * }} UploadTarget
 */

export const MAX_PARALLEL_UPLOADS = 3
const ACTIVE = new Set(['uploading', 'confirming'])

let sequence = 0
const nextId = () => `upload-${Date.now().toString(36)}-${(sequence += 1)}`

/** Mensaje y si tiene sentido «Reintentar», según lo que falló. */
export function describeUploadError(error) {
  if (error instanceof UploadError) {
    if (error.reason === 'network') {
      const percent = Math.round((error.progress ?? 0) * 100)
      return { message: percent > 0 ? `Se cortó la conexión al ${percent} %.` : 'Se cortó la conexión.', retryable: true }
    }
    return { message: 'El almacenamiento rechazó la subida. Vuelve a intentarlo.', retryable: true }
  }
  const apiError = toApiError(error)
  const final =
    apiError.code === 'STORAGE_FULL' ||
    [403, 404].includes(apiError.status) ||
    (apiError.status === 400 && apiError.code !== 'UPLOAD_REJECTED')
  return { message: apiError.message, retryable: !final }
}

/**
 * @param {{ concurrency?: number, put?: typeof xhrPut }} [options] `put` se puede cambiar en las pruebas
 */
export function createUploadQueue({ concurrency = MAX_PARALLEL_UPLOADS, put = xhrPut } = {}) {
  /** @type {UploadTask[]} */
  let tasks = []
  const listeners = new Set()
  /** Por subida: el archivo, su destino y lo que hace falta para cancelarla. */
  const runtime = new Map()

  const emit = () => listeners.forEach((listener) => listener())
  const update = (id, changes) => {
    tasks = tasks.map((task) => (task.id === id ? { ...task, ...changes } : task))
    emit()
  }
  const find = (id) => tasks.find((task) => task.id === id)

  function pump() {
    let active = tasks.filter((task) => ACTIVE.has(task.status)).length
    for (const task of tasks) {
      if (active >= concurrency) break
      if (task.status !== 'queued') continue
      active += 1
      run(task.id)
    }
  }

  async function run(id) {
    const state = runtime.get(id)
    const controller = new AbortController()
    state.controller = controller
    state.ticket = null
    update(id, { status: 'uploading', progress: 0, error: null })
    try {
      const ticket = await state.target.create(find(id), state.file)
      state.ticket = ticket
      if (controller.signal.aborted) throw new UploadError('aborted')
      await put(ticket.url, state.file, ticket.headers, {
        signal: controller.signal,
        onProgress: (progress) => find(id)?.status === 'uploading' && update(id, { progress }),
      })
      update(id, { status: 'confirming', progress: 1 })
      const result = await state.target.confirm(ticket, find(id))
      if (!find(id)) return
      update(id, { status: 'done', result, progress: 1 })
      // El archivo ya no hace falta (puede pesar varios MB)
      state.file = null
      state.target.onDone?.(result, find(id))
    } catch (error) {
      if (!find(id) || controller.signal.aborted) {
        // Cancelada: se borra la subida pendiente, si se llegó a pedir
        if (state.ticket) state.target.discard?.(state.ticket)?.catch?.(() => {})
        return
      }
      const { message, retryable } = describeUploadError(error)
      update(id, { status: 'error', error: message, retryable })
    } finally {
      pump()
    }
  }

  return {
    /**
     * Agrega una subida. Con `error` (por ejemplo, de la validación) queda en la lista como error sin subirse.
     * @param {File} file
     * @param {{ target: UploadTarget, scope?: string, meta?: Record<string, any>, contentType?: string, error?: string | null }} options
     * @returns {string} id de la subida
     */
    add(file, { target, scope = '', meta = {}, contentType, error = null }) {
      const id = nextId()
      runtime.set(id, { file, target, controller: null, ticket: null })
      tasks = [
        ...tasks,
        {
          id,
          name: file.name,
          size: file.size,
          contentType: contentType ?? file.type,
          status: error ? 'error' : 'queued',
          progress: 0,
          error,
          retryable: false,
          result: null,
          scope,
          meta,
        },
      ]
      emit()
      if (!error) pump()
      return id
    },

    /** Cancela una subida (en cola o en curso) y la quita de la lista. */
    cancel(id) {
      const state = runtime.get(id)
      if (!find(id)) return
      tasks = tasks.filter((task) => task.id !== id)
      emit()
      state?.controller?.abort()
      runtime.delete(id)
      pump()
    },

    /** Vuelve a intentar una subida que falló (pide una URL nueva). */
    retry(id) {
      const task = find(id)
      const state = runtime.get(id)
      if (!task || task.status !== 'error' || !task.retryable || !state?.file) return
      if (state.ticket) state.target.discard?.(state.ticket)?.catch?.(() => {})
      state.ticket = null
      update(id, { status: 'queued', progress: 0, error: null })
      pump()
    },

    /** Quita de la lista una subida terminada o con error. */
    dismiss(id) {
      const task = find(id)
      if (!task || ACTIVE.has(task.status) || task.status === 'queued') return
      tasks = tasks.filter((current) => current.id !== id)
      runtime.delete(id)
      emit()
    },

    get: find,
    getSnapshot: () => tasks,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** La cola de la app (una sola: el límite de 3 a la vez vale para todo). */
export const uploadQueue = createUploadQueue()
