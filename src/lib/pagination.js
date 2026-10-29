/**
 * Paginación por cursor (la Bandeja y la actividad): la primera página se pide sin `before` y cada siguiente con
 * el `nextCursor` de la anterior (`null` cuando no hay más). El cursor señala el último elemento recibido, así que
 * lo que llega o cambia mientras tanto no corre las páginas siguientes. Con `before`, `totalElements` y
 * `totalPages` vienen en -1: no se muestran.
 * @param {{ nextCursor?: string | null }} lastPage
 * @returns {string | undefined}
 */
export const nextCursorParam = (lastPage) => lastPage?.nextCursor ?? undefined

/**
 * Elementos de una consulta infinita (`{ pages: [{ content }] }`), sin repetidos. Con paginación por offset, lo
 * que llega entre una página y la siguiente corre los elementos y el mismo puede venir en dos páginas (y
 * repetiría la key de React); con cursor no debería pasar, pero queda como resguardo.
 * @template {{ id: string }} T
 * @param {{ pages?: { content?: T[] }[] } | undefined} data
 * @returns {T[]}
 */
export function flattenUniquePages(data) {
  const seen = new Set()
  const items = []
  for (const page of data?.pages ?? []) {
    for (const item of page.content ?? []) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      items.push(item)
    }
  }
  return items
}
