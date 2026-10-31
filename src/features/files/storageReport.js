import { differenceInCalendarDays, parseISO } from 'date-fns'
import { formatShortDate } from '@/lib/dates'
import { formatSize, MB } from './fileTypes'

/**
 * Cálculos de la pestaña «Almacenamiento» (ajustes del workspace): barra apilada por tipo, «Libre», barras por
 * proyecto y textos de la tabla de archivos más pesados.
 *
 * @typedef {import('./api').StorageUsage} StorageUsage
 * @typedef {'IMAGES' | 'DOCUMENTS' | 'OTHER'} StorageKind
 * @typedef {{ id: string, name: string, identifier: string, color?: string | null }} StorageProject
 * @typedef {{ id: string, fileName: string, contentType: string, size: number, image: boolean, project: StorageProject,
 *             issue: { id: string, code: string, title: string, type?: string } | null,
 *             uploadedBy: import('@/api/types').UserSummary | null, createdAt: string }} LargeFile
 * @typedef {{ usage: StorageUsage, byType: { type: StorageKind, bytes: number, count: number }[],
 *             byProject: { project: StorageProject, bytes: number, count: number }[], largest: LargeFile[] }} StorageReport
 */

const GB = 1024 * MB

/**
 * Tipos en el orden de la barra, con su color en cada tema (los mismos tonos validados del diseño; el oscuro es
 * más claro para que se distinga sobre la tarjeta).
 * @type {Record<StorageKind, { label: string, color: string }>}
 */
export const STORAGE_KINDS = {
  IMAGES: { label: 'Imágenes', color: 'bg-[#2F78C4] dark:bg-[#5A93D6]' },
  DOCUMENTS: { label: 'Documentos', color: 'bg-[#C2761A] dark:bg-[#C27A30]' },
  OTHER: { label: 'Otros', color: 'bg-[#7B5BD6] dark:bg-[#9178E8]' },
}
const KIND_ORDER = /** @type {StorageKind[]} */ (Object.keys(STORAGE_KINDS))

/** Porcentaje con dos decimales como mucho, para el ancho de una barra («35.16%»). */
const widthOf = (value, total) => `${total > 0 ? Math.round(Math.min(100, Math.max(0, (value / total) * 100)) * 100) / 100 : 0}%`

/**
 * «59 %»: hacia abajo, para no decir «90 %» antes de pasarlo ni «100 %» si aún cabe algo; «menos de 1 %» si hay
 * algo subido pero no llega.
 * @param {StorageUsage} usage
 */
export function formatPercent(usage) {
  const { usedBytes = 0, quotaBytes = 0 } = usage ?? {}
  const percent = typeof usage?.percent === 'number' ? usage.percent : quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0
  if (usedBytes > 0 && percent < 1) return 'menos de 1 %'
  return `${Math.min(100, Math.floor(percent))} %`
}

/**
 * Tamaño en GB con un decimal desde 0,1 GB («0,8 GB», «1,2 GB»), como el espacio libre y lo de cada proyecto; por
 * debajo, como cualquier archivo («86 MB»).
 */
export function formatGigabytes(bytes = 0) {
  if (bytes < 0.1 * GB) return formatSize(bytes)
  const rounded = Math.round((bytes / GB) * 10) / 10
  return `${String(rounded).replace('.', ',')} GB`
}

/** Lo que queda libre (nunca negativo: un workspace puede pasarse un poco si dos subidas terminan a la vez). */
export const freeBytes = (usage) => Math.max(0, (usage?.quotaBytes ?? 0) - (usage?.usedBytes ?? 0))

/**
 * Segmentos de la barra apilada (de la cuota total) en el orden fijo de los tipos, con el texto de la leyenda.
 * @param {StorageReport} report
 * @returns {{ type: StorageKind, label: string, color: string, bytes: number, count: number, value: string, width: string }[]}
 */
export function kindSegments(report) {
  const quota = report?.usage?.quotaBytes ?? 0
  const byType = new Map((report?.byType ?? []).map((entry) => [entry.type, entry]))
  return KIND_ORDER.map((type) => {
    const bytes = byType.get(type)?.bytes ?? 0
    return { type, ...STORAGE_KINDS[type], bytes, count: byType.get(type)?.count ?? 0, value: formatSize(bytes), width: widthOf(bytes, quota) }
  })
}

/** Texto de la barra para lectores de pantalla: «Imágenes 720 MB, documentos 390 MB, otros 90 MB; quedan 819 MB». */
export function usageBarLabel(report) {
  const parts = kindSegments(report).map((segment, index) =>
    `${index === 0 ? segment.label : segment.label.toLowerCase()} ${segment.value}`,
  )
  return `${parts.join(', ')}; quedan ${formatGigabytes(freeBytes(report?.usage))}`
}

/** «1 archivo», «214 archivos». */
export const filesCount = (count = 0) => `${count} ${count === 1 ? 'archivo' : 'archivos'}`

/**
 * Barras por proyecto: el que más ocupa llena la barra y los demás en proporción.
 * @param {StorageReport['byProject']} byProject
 */
export function projectBars(byProject = []) {
  const max = Math.max(0, ...byProject.map((entry) => entry.bytes))
  return byProject.map((entry) => ({
    ...entry,
    size: formatGigabytes(entry.bytes),
    files: filesCount(entry.count),
    width: widthOf(entry.bytes, max),
  }))
}

/** «hoy», «ayer» o la fecha corta («14 oct»), para «Subido por · fecha». */
export function uploadedWhen(value, now = new Date()) {
  if (!value) return ''
  const days = differenceInCalendarDays(now, typeof value === 'string' ? parseISO(value) : value)
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  return formatShortDate(value)
}
