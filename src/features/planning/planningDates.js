/**
 * Fechas al editar un ciclo/módulo. El backend no cambia los campos `null`: quitar una fecha guardada se pide
 * con su bandera (`clearStartDate`, `clearEndDate` en ciclos, `clearTargetDate` en módulos). Mandar una fecha
 * y su bandera a la vez responde 400, así que nunca van juntas.
 */

/**
 * Cuerpo del PATCH de edición.
 * @param {{ id: string, startDate?: string | null } & Record<string, unknown>} item lo guardado
 * @param {{ name: string, description: string, startDate: string | null, endDate: string | null }} values
 * @param {'endDate' | 'targetDate'} endField 'endDate' (ciclos) | 'targetDate' (módulos)
 */
export function planningUpdateBody(item, values, endField) {
  const body = { id: item.id, name: values.name, description: values.description }
  const clearEndField = `clear${endField[0].toUpperCase()}${endField.slice(1)}`
  dateField(body, 'startDate', 'clearStartDate', item.startDate, values.startDate)
  dateField(body, endField, clearEndField, item[endField], values.endDate)
  return body
}

function dateField(body, field, clearField, saved, value) {
  if (value) body[field] = value
  else if (saved) body[clearField] = true
}
