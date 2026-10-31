import { ONLY_IMAGES, validateFile } from '@/features/files/fileTypes'

/**
 * Recorte de la foto de perfil, sin React: qué parte de la imagen original entra en el marco (según el zoom y cuánto se
 * arrastró) y la copia cuadrada de 512 × 512 que se sube (WebP; PNG si el navegador no sabe hacer WebP). La original no
 * se sube.
 *
 * El marco es el cuadrado (o círculo) del recorte en pantalla, de `frame` px. Con zoom 1 la imagen lo cubre justo por
 * su lado más corto; el desplazamiento (`offset`) es cuánto se movió el centro de la imagen respecto al del marco, en
 * px de pantalla.
 *
 * @typedef {{ width: number, height: number }} Size tamaño natural de la imagen
 * @typedef {{ x: number, y: number }} Offset
 * @typedef {{ sx: number, sy: number, size: number }} CropRect cuadrado de la imagen original, en px de la original
 */

/** Lado de la foto que se sube. */
export const AVATAR_SIZE = 512
export const MIN_ZOOM = 1
export const MAX_ZOOM = 3
const WEBP_QUALITY = 0.9

export const AVATAR_TYPE_ERROR = 'Solo se aceptan fotos PNG, JPG o WebP.'
export const AVATAR_READ_ERROR = 'No se pudo leer la imagen. Prueba con otra.'

/**
 * Valida la foto elegida antes de recortarla: PNG, JPG o WebP de hasta 5 MB (`IMAGE_LIMIT`, como el backend).
 * @param {{ name: string, type?: string, size: number }} file
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateAvatarFile(file) {
  const check = validateFile(file, { imagesOnly: true })
  // «Solo se pueden pegar imágenes…» no aplica aquí: el mensaje es el de la foto (que tampoco acepta GIF)
  if (!check.ok) return { ok: false, error: check.error === ONLY_IMAGES ? AVATAR_TYPE_ERROR : check.error }
  if (check.contentType === 'image/gif') return { ok: false, error: AVATAR_TYPE_ERROR }
  return { ok: true }
}

export const clampZoom = (zoom) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number.isFinite(zoom) ? zoom : MIN_ZOOM))

/** Escala (px de pantalla por px de la original) con la que la imagen cubre el marco con zoom 1. */
export const coverScale = ({ width, height }, frame) => frame / Math.min(width, height)

/**
 * Lo más que se puede mover la imagen sin que el marco quede fuera de ella.
 * @param {Size} size
 * @param {{ zoom: number, frame: number }} view
 * @returns {Offset}
 */
export function maxOffset(size, { zoom, frame }) {
  const scale = coverScale(size, frame) * clampZoom(zoom)
  return { x: Math.max(0, (size.width * scale - frame) / 2), y: Math.max(0, (size.height * scale - frame) / 2) }
}

/**
 * El desplazamiento dentro de lo permitido.
 * @param {Size} size
 * @param {{ zoom: number, frame: number, offset: Offset }} view
 * @returns {Offset}
 */
export function clampOffset(size, { zoom, frame, offset }) {
  const limit = maxOffset(size, { zoom, frame })
  const clamp = (value, max) => Math.min(max, Math.max(-max, value || 0))
  // `|| 0` también evita «-0»
  return { x: clamp(offset.x, limit.x) || 0, y: clamp(offset.y, limit.y) || 0 }
}

/**
 * Al cambiar el zoom, el desplazamiento crece o se achica con él: el mismo punto de la foto sigue en el centro.
 * @param {Size} size
 * @param {{ frame: number, offset: Offset, from: number, to: number }} change
 */
export function zoomOffset(size, { frame, offset, from, to }) {
  const ratio = clampZoom(to) / clampZoom(from)
  return clampOffset(size, { zoom: to, frame, offset: { x: offset.x * ratio, y: offset.y * ratio } })
}

/**
 * El cuadrado de la imagen original que se ve en el marco (nunca se sale de la imagen).
 * @param {Size} size
 * @param {{ zoom?: number, frame: number, offset?: Offset }} view
 * @returns {CropRect}
 */
export function cropRect(size, { zoom = 1, frame, offset = { x: 0, y: 0 } }) {
  const scale = coverScale(size, frame) * clampZoom(zoom)
  const clamped = clampOffset(size, { zoom, frame, offset })
  const side = Math.min(size.width, size.height, frame / scale)
  const clampTo = (value, max) => Math.min(max, Math.max(0, value))
  // Si la imagen se mueve a la derecha, se ve lo que está más a la izquierda de la original
  return {
    sx: clampTo((size.width - side) / 2 - clamped.x / scale, size.width - side),
    sy: clampTo((size.height - side) / 2 - clamped.y / scale, size.height - side),
    size: side,
  }
}

const defaultCanvas = (width, height) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality))

/**
 * Dibuja el recorte en un lienzo de 512 × 512 y lo devuelve como WebP (o PNG si el navegador no codifica WebP: Safari
 * devuelve un PNG aunque se le pida WebP).
 * @param {CanvasImageSource} source la imagen ya cargada
 * @param {CropRect} rect
 * @param {{ size?: number, createCanvas?: (width: number, height: number) => HTMLCanvasElement }} [options]
 *   `createCanvas` se cambia en las pruebas (jsdom no dibuja)
 * @returns {Promise<Blob>}
 */
export async function renderCrop(source, rect, { size = AVATAR_SIZE, createCanvas = defaultCanvas } = {}) {
  const canvas = createCanvas(size, size)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No se pudo preparar la foto.')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, rect.sx, rect.sy, rect.size, rect.size, 0, 0, size, size)
  const webp = await toBlob(canvas, 'image/webp', WEBP_QUALITY)
  if (webp && (webp.type === 'image/webp' || webp.type === 'image/png')) return webp
  const png = await toBlob(canvas, 'image/png')
  if (!png) throw new Error('No se pudo preparar la foto.')
  return png
}

/** `File` para la cola de subidas a partir del recorte (`avatar.webp` o `avatar.png`). */
export function avatarFile(blob) {
  const extension = blob.type === 'image/png' ? 'png' : 'webp'
  return new File([blob], `avatar.${extension}`, { type: blob.type || 'image/webp' })
}

/**
 * Carga la imagen elegida para recortarla. El `url` (blob:) se libera con `URL.revokeObjectURL` al terminar.
 * @param {Blob} file
 * @returns {Promise<{ image: HTMLImageElement, url: string, width: number, height: number }>}
 */
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        URL.revokeObjectURL(url)
        reject(new Error(AVATAR_READ_ERROR))
        return
      }
      resolve({ image, url, width: image.naturalWidth, height: image.naturalHeight })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(AVATAR_READ_ERROR))
    }
    image.src = url
  })
}
