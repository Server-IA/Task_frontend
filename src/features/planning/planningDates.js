/**
 * Fechas al editar un ciclo/módulo. El backend no cambia los campos `null` y solo sabe quitar las dos
 * fechas a la vez (`clearDates`, que además ignora las fechas que vengan en la misma petición).
 */

export const SINGLE_DATE_CLEARED_MESSAGE = 'Las fechas solo se pueden quitar juntas: quita también la otra o elige una nueva'

/**
 * Cuerpo del PATCH de edición o, si se quitó una sola fecha y la otra sigue, el campo que lo impide.
 * @param {{ id: string, startDate?: string | null } & Record<string, unknown>} item lo guardado
 * @param {{ name: string, description: string, startDate: string | null, endDate: string | null }} values
 * @param {string} endField 'endDate' (ciclos) | 'targetDate' (módulos)
 * @returns {{ body: object, error?: undefined } | { error: 'startDate' | 'endDate', body?: undefined }}
 */
export function planningUpdateBody(item, values, endField) {
  const hadStart = Boolean(item.startDate)
  const hadEnd = Boolean(item[endField])
  const clearedStart = hadStart && !values.startDate
  const clearedEnd = hadEnd && !values.endDate
  const keepsOne = Boolean(values.startDate || values.endDate)

  if ((clearedStart || clearedEnd) && keepsOne) {
    return { error: clearedStart ? 'startDate' : 'endDate' }
  }
  const base = { id: item.id, name: values.name, description: values.description }
  if ((hadStart || hadEnd) && !keepsOne) return { body: { ...base, clearDates: true } }
  return { body: { ...base, startDate: values.startDate, [endField]: values.endDate } }
}
