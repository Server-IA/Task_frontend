/**
 * Referencias estables a archivos subidos, como se guardan en el Markdown y en `avatarUrl`: `/files/<id>`. Una imagen
 * a todo el ancho lleva `#full` (`![captura.png](/files/<id>#full "pie de foto")`). Nunca se guarda una URL firmada:
 * vencen en una hora; se piden al mostrarlas (ver fileUrls.js).
 */

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
const REFERENCE = new RegExp(`^/files/(${UUID})(#full)?$`)
const REFERENCES = new RegExp(`/files/(${UUID})`, 'g')

/** `/files/<id>` de un archivo. */
export const fileReference = (id, { wide = false } = {}) => `/files/${id}${wide ? '#full' : ''}`

/**
 * El archivo de una referencia, o `null` si no es una (una URL externa, un `blob:`).
 * @param {string | null | undefined} src
 * @returns {{ id: string, wide: boolean } | null}
 */
export function parseFileReference(src) {
  const match = REFERENCE.exec(src ?? '')
  return match ? { id: match[1].toLowerCase(), wide: Boolean(match[2]) } : null
}

/** Ids de las referencias de un texto, sin repetir y en orden. */
export function fileIdsIn(text = '') {
  return [...new Set([...(text ?? '').matchAll(REFERENCES)].map((match) => match[1].toLowerCase()))]
}

/**
 * Vistas previas locales (`blob:`) de lo que se acaba de subir en esta pestaña: la imagen se sigue viendo al cambiar la
 * vista previa por la referencia, sin parpadeo ni otra descarga.
 */
const previews = new Map()

export function rememberPreview(fileId, objectUrl) {
  if (fileId && objectUrl) previews.set(fileId.toLowerCase(), objectUrl)
}

export const localPreview = (fileId) => (fileId ? previews.get(fileId.toLowerCase()) : undefined)
