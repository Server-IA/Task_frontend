import { badgeOf, extensionOf, formatSize, isImageType } from './fileTypes'

/**
 * Cómo se ve cada cosa de la sección Adjuntos: el color de la insignia por tipo, el estado de una subida en curso, el
 * resumen del encabezado y qué hace un clic en un archivo.
 */

/**
 * Colores de la insignia por tipo (los mismos tonos que las etiquetas, con los tokens del tema para el modo oscuro):
 * PDF en rojo, Word y texto en azul, Excel, CSV e imágenes en verde, presentaciones en ámbar, video en violeta y el
 * resto (ZIP, lo que no se acepta) en gris.
 */
const BADGE_TONES = {
  red: 'bg-ty-bug-soft text-ty-bug-text',
  blue: 'bg-ty-task-soft text-ty-task-text',
  green: 'bg-ok-soft text-ok',
  amber: 'bg-soon-soft text-soon',
  violet: 'bg-ty-story-soft text-ty-story-text',
  gray: 'bg-muted text-muted-foreground',
}

const TONE_BY_EXTENSION = {
  pdf: 'red',
  docx: 'blue',
  doc: 'blue',
  txt: 'blue',
  md: 'blue',
  xlsx: 'green',
  xls: 'green',
  csv: 'green',
  png: 'green',
  jpg: 'green',
  jpeg: 'green',
  gif: 'green',
  webp: 'green',
  pptx: 'amber',
  ppt: 'amber',
  mov: 'violet',
  mp4: 'violet',
  avi: 'violet',
  webm: 'violet',
}

/** Clases (fondo y texto) de la insignia de un archivo según su extensión. */
export function badgeToneOf(name = '') {
  return BADGE_TONES[TONE_BY_EXTENSION[extensionOf(name)] ?? 'gray']
}

/** «PDF», «DOCX»… y sus clases, para la insignia. */
export function fileBadge(name = '') {
  return { label: badgeOf(name), className: badgeToneOf(name) }
}

/**
 * «5 · 5,2 MB»: cuántos adjuntos hay y cuánto pesan (vacío si no hay).
 * @param {{ size: number }[]} files
 */
export function attachmentsSummary(files = []) {
  if (!files.length) return ''
  const total = files.reduce((sum, file) => sum + (file.size ?? 0), 0)
  return `${files.length} · ${formatSize(total)}`
}

/**
 * Qué hace un clic en un adjunto: las imágenes se abren en el visor, los PDF en otra pestaña (con el visor del
 * navegador) y el resto se descarga con su nombre original.
 * @param {{ contentType?: string, fileName?: string, image?: boolean }} file
 * @returns {'viewer' | 'tab' | 'download'}
 */
export function openActionOf(file) {
  if (file?.image || isImageType(file?.contentType)) return 'viewer'
  if (file?.contentType === 'application/pdf' || extensionOf(file?.fileName) === 'pdf') return 'tab'
  return 'download'
}

/**
 * Lo que muestra la fila de una subida de la cola.
 * @param {import('./uploadQueue').UploadTask} task
 * @returns {{ state: 'queued' | 'uploading' | 'error', label: string, percent: number, canRetry: boolean,
 *             dismissLabel: string }}
 */
export function uploadRowOf(task) {
  const percent = Math.round((task.progress ?? 0) * 100)
  switch (task.status) {
    case 'queued':
      return { state: 'queued', label: 'En cola', percent: 0, canRetry: false, dismissLabel: 'Cancelar subida' }
    case 'uploading':
      return { state: 'uploading', label: `Subiendo… ${percent} %`, percent, canRetry: false, dismissLabel: 'Cancelar subida' }
    case 'confirming':
    case 'done':
      // Ya subió: falta que el backend la registre (o que la lista de adjuntos se actualice)
      return { state: 'uploading', label: 'Terminando…', percent: 100, canRetry: false, dismissLabel: 'Cancelar subida' }
    default:
      return {
        state: 'error',
        label: task.error || 'No se pudo subir.',
        percent,
        canRetry: Boolean(task.retryable),
        dismissLabel: 'Quitar de la lista',
      }
  }
}

/**
 * Las subidas que se muestran como filas: no las que ya aparecen en la lista de adjuntos (entre que terminan y salen
 * de la cola pasa un momento).
 * @param {import('./uploadQueue').UploadTask[]} tasks
 * @param {{ id: string }[]} attachments
 */
export function visibleUploads(tasks, attachments = []) {
  const ids = new Set(attachments.map((file) => file.id.toLowerCase()))
  return tasks.filter((task) => !(task.status === 'done' && task.result?.id && ids.has(task.result.id.toLowerCase())))
}

/** Estados de una subida que todavía no termina (se puede cancelar). */
export const isPendingUpload = (task) => ['queued', 'uploading', 'confirming'].includes(task.status)

/**
 * La pastilla «Subiendo 3 archivos · 63 %» cuando hay varias a la vez (o `null` con menos de dos): el avance se pondera
 * por tamaño.
 * @param {import('./uploadQueue').UploadTask[]} tasks
 */
export function uploadsProgress(tasks) {
  const pending = tasks.filter(isPendingUpload)
  if (pending.length < 2) return null
  const total = pending.reduce((sum, task) => sum + (task.size || 1), 0)
  const sent = pending.reduce((sum, task) => sum + (task.size || 1) * (task.progress ?? 0), 0)
  return { count: pending.length, percent: Math.round((sent / total) * 100), ids: pending.map((task) => task.id) }
}

/** Primer nombre de quien subió el archivo («Ana»). */
export const firstName = (user) => user?.fullName?.split(' ')[0] ?? ''
