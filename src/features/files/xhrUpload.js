/**
 * Sube un archivo directo a R2 con la URL firmada (`PUT`), con avance real y cancelable. Se usa XHR porque `fetch`
 * todavía no informa el avance de lo que se envía.
 */

export class UploadError extends Error {
  /**
   * @param {'network' | 'status' | 'aborted'} reason
   * @param {{ status?: number, progress?: number }} [details]
   */
  constructor(reason, { status = 0, progress = 0 } = {}) {
    super(reason === 'aborted' ? 'Subida cancelada' : reason === 'network' ? 'Se cortó la conexión' : `R2 respondió ${status}`)
    this.name = 'UploadError'
    this.reason = reason
    this.status = status
    this.progress = progress
  }
}

/**
 * @param {string} url URL firmada
 * @param {Blob} body el archivo
 * @param {Record<string, string>} headers las que firmó el backend (el tipo); el tamaño lo pone el navegador
 * @param {{ onProgress?: (fraction: number) => void, signal?: AbortSignal }} [options]
 * @returns {Promise<void>}
 */
export function xhrPut(url, body, headers = {}, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    let progress = 0
    const abort = () => xhr.abort()
    if (signal?.aborted) {
      reject(new UploadError('aborted'))
      return
    }
    signal?.addEventListener('abort', abort, { once: true })
    const done = () => signal?.removeEventListener('abort', abort)

    xhr.open('PUT', url)
    Object.entries(headers).forEach(([name, value]) => xhr.setRequestHeader(name, value))
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !event.total) return
      progress = event.loaded / event.total
      onProgress?.(progress)
    }
    xhr.onload = () => {
      done()
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1)
        resolve()
      } else {
        reject(new UploadError('status', { status: xhr.status, progress }))
      }
    }
    xhr.onerror = () => {
      done()
      reject(new UploadError('network', { progress }))
    }
    xhr.onabort = () => {
      done()
      reject(new UploadError('aborted', { progress }))
    }
    xhr.send(body)
  })
}
