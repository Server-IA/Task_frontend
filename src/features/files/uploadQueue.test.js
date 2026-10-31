import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/errors'
import { createUploadQueue, describeUploadError, MAX_PARALLEL_UPLOADS } from './uploadQueue'
import { enqueueFiles } from './uploads'
import { UploadError } from './xhrUpload'

/** `put` falso: cada subida queda esperando hasta que la prueba la termine (o la cancele). */
function fakePut() {
  const calls = []
  const put = vi.fn((url, file, headers, { signal, onProgress }) => {
    let finish
    let fail
    const promise = new Promise((resolve, reject) => {
      finish = resolve
      fail = reject
    })
    signal.addEventListener('abort', () => fail(new UploadError('aborted')))
    calls.push({ url, file, headers, onProgress, finish: () => finish(), fail: (error) => fail(error) })
    return promise
  })
  return { put, calls }
}

const target = () => ({
  create: vi.fn(async (task) => ({ file: { id: `file-${task.name}` }, url: `https://r2/${task.name}`, headers: { 'Content-Type': 'image/png' } })),
  confirm: vi.fn(async (ticket) => ({ id: ticket.file.id, status: 'READY' })),
  discard: vi.fn(async () => {}),
  onDone: vi.fn(),
})

const file = (name, size = 100, type = 'image/png') => new File([new Uint8Array(size)], name, { type })
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('cola de subidas', () => {
  it('sube hasta 3 a la vez y el resto espera en cola', async () => {
    const { put, calls } = fakePut()
    const queue = createUploadQueue({ put })
    const destination = target()
    const ids = ['a', 'b', 'c', 'd', 'e'].map((name) => queue.add(file(`${name}.png`), { target: destination, scope: 's' }))
    await flush()

    expect(MAX_PARALLEL_UPLOADS).toBe(3)
    expect(calls).toHaveLength(3)
    expect(queue.getSnapshot().map((task) => task.status)).toEqual(['uploading', 'uploading', 'uploading', 'queued', 'queued'])

    // Al terminar una, entra la siguiente de la cola
    calls[0].onProgress(0.5)
    expect(queue.get(ids[0]).progress).toBe(0.5)
    calls[0].finish()
    await flush()
    await flush()
    expect(queue.get(ids[0]).status).toBe('done')
    expect(queue.get(ids[0]).result).toEqual({ id: 'file-a.png', status: 'READY' })
    expect(destination.onDone).toHaveBeenCalledWith({ id: 'file-a.png', status: 'READY' }, expect.objectContaining({ id: ids[0] }))
    expect(calls).toHaveLength(4)
    expect(queue.get(ids[3]).status).toBe('uploading')
    expect(calls[0].headers).toEqual({ 'Content-Type': 'image/png' })
  })

  it('un error no frena a las demás y se puede reintentar con una URL nueva', async () => {
    const { put, calls } = fakePut()
    const queue = createUploadQueue({ put })
    const destination = target()
    const failing = queue.add(file('paleta.png'), { target: destination })
    const other = queue.add(file('otra.png'), { target: destination })
    await flush()

    calls[0].onProgress(0.7)
    calls[0].fail(new UploadError('network', { progress: 0.7 }))
    calls[1].finish()
    await flush()
    await flush()

    expect(queue.get(failing)).toMatchObject({ status: 'error', error: 'Se cortó la conexión al 70 %.', retryable: true })
    expect(queue.get(other).status).toBe('done')

    queue.retry(failing)
    await flush()
    // La subida pendiente anterior se descarta y se pide otra
    expect(destination.discard).toHaveBeenCalledTimes(1)
    expect(destination.create).toHaveBeenCalledTimes(3)
    expect(queue.get(failing).status).toBe('uploading')
    calls[2].finish()
    await flush()
    await flush()
    expect(queue.get(failing).status).toBe('done')
  })

  it('cancelar aborta la subida, la quita de la lista y borra la pendiente', async () => {
    const { put, calls } = fakePut()
    const queue = createUploadQueue({ put })
    const destination = target()
    const running = queue.add(file('a.png'), { target: destination })
    const ids = ['b', 'c', 'd'].map((name) => queue.add(file(`${name}.png`), { target: destination }))
    await flush()

    // Cancelar una en cola: nunca se pide
    queue.cancel(ids[2])
    queue.cancel(running)
    await flush()
    await flush()

    expect(queue.get(running)).toBeUndefined()
    expect(queue.get(ids[2])).toBeUndefined()
    expect(destination.discard).toHaveBeenCalledWith(expect.objectContaining({ file: { id: 'file-a.png' } }))
    expect(destination.create).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'd.png' }), expect.anything())
    expect(destination.confirm).not.toHaveBeenCalled()
    // Su lugar lo toma la siguiente
    expect(calls).toHaveLength(3)
  })

  it('cancelar mientras se pide la URL no sube nada', async () => {
    const { put, calls } = fakePut()
    const queue = createUploadQueue({ put })
    let release
    const destination = {
      ...target(),
      create: vi.fn(() => new Promise((resolve) => (release = () => resolve({ file: { id: 'f' }, url: 'u', headers: {} })))),
    }
    const id = queue.add(file('a.png'), { target: destination })
    await flush()
    queue.cancel(id)
    release()
    await flush()
    await flush()
    expect(calls).toHaveLength(0)
    expect(destination.discard).toHaveBeenCalledTimes(1)
  })

  it('los archivos que no cumplen quedan con su error sin subirse', async () => {
    const { put, calls } = fakePut()
    const queue = createUploadQueue({ put })
    const destination = target()
    const [ok, exe, big] = enqueueFiles(
      [file('mockup.png'), file('instalador.exe', 10, 'application/x-msdownload'), file('grabacion.zip', 38 * 1024 * 1024, 'application/zip')],
      { target: destination, scope: 'adjuntos' },
      queue,
    )
    await flush()

    expect(queue.get(ok).status).toBe('uploading')
    expect(queue.get(exe)).toMatchObject({ status: 'error', error: 'Este tipo de archivo no se puede adjuntar.', retryable: false })
    expect(queue.get(big).error).toBe('Pesa 38 MB y el límite es 10 MB. Súbelo comprimido o pega un enlace.')
    expect(calls).toHaveLength(1)
    // Un error sin reintento solo se quita de la lista
    queue.retry(exe)
    expect(queue.get(exe).status).toBe('error')
    queue.dismiss(exe)
    expect(queue.get(exe)).toBeUndefined()
  })

  it('los errores del backend dicen si vale la pena reintentar', () => {
    expect(describeUploadError(new ApiError({ status: 409, message: 'Este archivo no cabe', code: 'STORAGE_FULL' }))).toEqual({
      message: 'Este archivo no cabe',
      retryable: false,
    })
    expect(describeUploadError(new ApiError({ status: 400, message: 'Otro tamaño', code: 'UPLOAD_REJECTED' })).retryable).toBe(true)
    expect(describeUploadError(new ApiError({ status: 400, message: 'Tipo no permitido' })).retryable).toBe(false)
    expect(describeUploadError(new ApiError({ status: 0, message: 'Sin conexión' })).retryable).toBe(true)
    expect(describeUploadError(new UploadError('status', { status: 403 })).retryable).toBe(true)
    expect(describeUploadError(new UploadError('network')).message).toBe('Se cortó la conexión.')
  })
})
