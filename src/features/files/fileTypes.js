/**
 * Qué archivos se aceptan, igual que el backend (que los vuelve a revisar antes de firmar la subida): la extensión
 * decide el tipo, el tipo que declara el navegador debe corresponderle (o venir vacío) y cada tipo tiene su límite.
 * Ejecutables, HTML y SVG no se aceptan: el navegador podría ejecutarlos.
 */

export const MB = 1024 * 1024
/** Imágenes (adjuntas o pegadas) y la foto de perfil. */
export const IMAGE_LIMIT = 5 * MB
/** Documentos y ZIP. */
export const FILE_LIMIT = 10 * MB
/** Espacio de cada workspace. */
export const WORKSPACE_QUOTA = 2 * 1024 * MB

export const NOT_ALLOWED = 'Este tipo de archivo no se puede adjuntar.'
export const ONLY_IMAGES = 'Solo se pueden pegar imágenes PNG, JPG, GIF o WebP.'
export const TYPE_MISMATCH = 'El tipo del archivo no coincide con su extensión.'

/** @typedef {'image' | 'document' | 'archive'} FileGroup */

/**
 * @type {Record<string, { type: string, group: FileGroup, aliases?: string[] }>}
 */
const TYPES = {
  png: { type: 'image/png', group: 'image' },
  jpg: { type: 'image/jpeg', group: 'image', aliases: ['image/jpg', 'image/pjpeg'] },
  jpeg: { type: 'image/jpeg', group: 'image', aliases: ['image/jpg', 'image/pjpeg'] },
  gif: { type: 'image/gif', group: 'image' },
  webp: { type: 'image/webp', group: 'image' },
  pdf: { type: 'application/pdf', group: 'document', aliases: ['application/x-pdf'] },
  docx: { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', group: 'document' },
  xlsx: { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', group: 'document' },
  pptx: { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', group: 'document' },
  txt: { type: 'text/plain', group: 'document' },
  md: { type: 'text/markdown', group: 'document', aliases: ['text/x-markdown', 'text/plain'] },
  csv: { type: 'text/csv', group: 'document', aliases: ['application/vnd.ms-excel', 'text/plain', 'application/csv'] },
  zip: { type: 'application/zip', group: 'archive', aliases: ['application/x-zip-compressed', 'application/x-zip', 'multipart/x-zip'] },
}

/** Lo que acepta el selector de archivos de «Adjuntar». */
export const ATTACHMENT_ACCEPT = Object.keys(TYPES)
  .map((extension) => `.${extension}`)
  .join(',')
/** Lo que acepta el selector de «Imagen» (y el de la foto de perfil, sin GIF). */
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp'
export const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp'

/** Extensión en minúsculas, sin el punto («» si no tiene). */
export function extensionOf(name = '') {
  const clean = name.trim()
  const dot = clean.lastIndexOf('.')
  return dot < 0 || dot === clean.length - 1 ? '' : clean.slice(dot + 1).toLowerCase()
}

const normalizeType = (type = '') => type.split(';')[0].trim().toLowerCase()

/** Si el archivo (por su nombre o su tipo) es una imagen que se puede pegar. */
export function isImageFile(file) {
  const known = TYPES[extensionOf(file?.name)]
  if (known) return known.group === 'image'
  return ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(normalizeType(file?.type))
}

/** Si un `Content-Type` guardado es de imagen. */
export const isImageType = (contentType = '') => contentType.startsWith('image/')

/**
 * Valida un archivo antes de pedir su subida.
 * @param {{ name: string, type?: string, size: number }} file
 * @param {{ imagesOnly?: boolean }} [options] `imagesOnly`: imágenes pegadas en un texto
 * @returns {{ ok: true, contentType: string, group: FileGroup } | { ok: false, error: string }}
 */
export function validateFile(file, { imagesOnly = false } = {}) {
  const known = TYPES[extensionOf(file.name)]
  if (!known || (imagesOnly && known.group !== 'image')) return { ok: false, error: imagesOnly ? ONLY_IMAGES : NOT_ALLOWED }
  const declared = normalizeType(file.type)
  if (declared && declared !== 'application/octet-stream' && declared !== known.type && !known.aliases?.includes(declared)) {
    return { ok: false, error: TYPE_MISMATCH }
  }
  if (!file.size) return { ok: false, error: 'El archivo está vacío.' }
  const limit = known.group === 'image' ? IMAGE_LIMIT : FILE_LIMIT
  if (file.size > limit) {
    const what = known.group === 'image' ? 'La imagen pesa' : 'Pesa'
    const hint = known.group === 'image' ? '' : ' Súbelo comprimido o pega un enlace.'
    return { ok: false, error: `${what} ${formatSize(file.size)} y el límite es ${formatSize(limit)}.${hint}` }
  }
  return { ok: true, contentType: known.type, group: known.group }
}

/** «2 GB», «2,4 MB», «86 KB», «512 B»: un decimal por debajo de 10, sin «,0». */
export function formatSize(bytes = 0) {
  const decimal = (value) => {
    const rounded = Math.round(value * 10) / 10
    return rounded >= 10 || Number.isInteger(rounded) ? String(Math.round(rounded)) : String(rounded).replace('.', ',')
  }
  if (bytes >= 1024 * MB) return `${decimal(bytes / (1024 * MB))} GB`
  if (bytes >= MB) return `${decimal(bytes / MB)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

/** Etiqueta corta del tipo para la insignia («PDF», «DOCX», «PNG»). */
export function badgeOf(name = '') {
  return (extensionOf(name) || 'archivo').toUpperCase().slice(0, 4)
}

/** «imagen», «documento» o «archivo» (para «1,8 MB · imagen»). */
export function kindLabel(contentType = '') {
  if (isImageType(contentType)) return 'imagen'
  if (contentType === 'application/zip') return 'comprimido'
  return 'documento'
}

/**
 * Nombre para una imagen pegada sin nombre propio (los navegadores llaman «image.png» a todo lo que viene del
 * portapapeles): `captura-2026-10-30-1042.png`.
 * @param {File} file
 * @param {Date} [now]
 */
export function pastedName(file, now = new Date()) {
  const name = file?.name ?? ''
  if (name && !/^image\.(png|jpe?g|gif|webp)$/i.test(name)) return name
  const pad = (value) => String(value).padStart(2, '0')
  const extension = extensionOf(name) || { 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' }[normalizeType(file?.type)] || 'png'
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
  return `captura-${stamp}.${extension}`
}

/** Un `File` con otro nombre (el contenido y el tipo no cambian). */
export function renameFile(file, name) {
  if (file.name === name) return file
  return new File([file], name, { type: file.type, lastModified: file.lastModified })
}
