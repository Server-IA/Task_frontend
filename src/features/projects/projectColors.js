/**
 * Colores de proyecto: las mismas claves que `ProjectColor` del backend, en su orden. Los tonos (pastilla y
 * versión suave para cada tema) están en `styles/globals.css` y se aplican con `data-project-color`.
 */
import { t } from '@/i18n'

/** @typedef {NonNullable<import('@/api/types').ProjectResponse['color']>} ProjectColor */

/** @type {{ key: ProjectColor, label: string }[]} */
export const PROJECT_COLORS = [
  { key: 'TEAL', label: t('Turquesa') },
  { key: 'AMBER', label: t('Ámbar') },
  { key: 'BLUE', label: t('Azul') },
  { key: 'PINK', label: t('Rosa') },
  { key: 'VIOLET', label: t('Violeta') },
  { key: 'ORANGE', label: t('Naranja') },
  { key: 'GREEN', label: t('Verde') },
]

/** @type {[ProjectColor, ...ProjectColor[]]} */
export const PROJECT_COLOR_KEYS = /** @type {any} */ (PROJECT_COLORS.map((color) => color.key))

/**
 * Color sugerido para un proyecto nuevo: el menos usado en el workspace y, entre los empatados, el primero de la
 * paleta (la misma regla que aplica el backend cuando no se envía color).
 * @param {{ color?: string | null }[]} projects
 * @returns {ProjectColor}
 */
export function suggestProjectColor(projects = []) {
  const counts = new Map(PROJECT_COLOR_KEYS.map((key) => [key, 0]))
  for (const project of projects) {
    if (counts.has(project?.color)) counts.set(project.color, counts.get(project.color) + 1)
  }
  return PROJECT_COLOR_KEYS.reduce((best, key) => (counts.get(key) < counts.get(best) ? key : best))
}

/** Nombre del color para mostrarlo («Turquesa»); vacío si la clave no es de la paleta. */
export const projectColorLabel = (key) => PROJECT_COLORS.find((color) => color.key === key)?.label ?? ''
