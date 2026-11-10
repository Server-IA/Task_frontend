/**
 * Descarga un archivo que ya está en memoria (un PDF generado por la API) con el nombre indicado: crea un enlace
 * temporal, lo pulsa y libera la URL.
 * @param {Blob} blob
 * @param {string} fileName
 */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  // Un momento después: algunos navegadores cancelan la descarga si la URL se libera en el mismo tick
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
