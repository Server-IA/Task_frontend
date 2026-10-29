import { isCycleClosed } from './closeCycle'

/** Orden de los grupos en la lista de ciclos: el que está en curso, los próximos, los borradores y al final los terminados. */
const GROUP_ORDER = { CURRENT: 0, UPCOMING: 1, DRAFT: 2, COMPLETED: 3, CLOSED: 4 }

const time = (value) => (value ? new Date(value).getTime() : null)

/**
 * Ciclos en el orden de la lista (sin depender del orden en que los mande el backend): en curso, próximos (el más
 * cercano primero), borradores y, al final, terminados y cerrados (el más reciente primero). No cambia la lista.
 * @param {import('@/api/types').CycleResponse[]} cycles
 */
export function sortCycles(cycles) {
  // Como cycleStatusKey: cerrado a mano, o el estado que calcula el backend por fechas
  const group = (cycle) => (isCycleClosed(cycle) ? GROUP_ORDER.CLOSED : (GROUP_ORDER[cycle.status] ?? GROUP_ORDER.DRAFT))
  return cycles
    .map((cycle, index) => ({ cycle, index }))
    .sort((a, b) => {
      const byGroup = group(a.cycle) - group(b.cycle)
      if (byGroup !== 0) return byGroup
      const finished = group(a.cycle) >= GROUP_ORDER.COMPLETED
      const keyA = finished ? time(a.cycle.closedAt ?? a.cycle.endDate) : time(a.cycle.startDate)
      const keyB = finished ? time(b.cycle.closedAt ?? b.cycle.endDate) : time(b.cycle.startDate)
      if (keyA != null && keyB != null && keyA !== keyB) return finished ? keyB - keyA : keyA - keyB
      if (keyA == null && keyB != null) return 1
      if (keyB == null && keyA != null) return -1
      return a.index - b.index
    })
    .map(({ cycle }) => cycle)
}
