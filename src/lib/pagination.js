/**
 * Elementos de una consulta infinita paginada por número de página (`{ pages: [{ content }] }`), sin repetidos.
 * Con paginación por offset, lo que llega entre una página y la siguiente corre los elementos: el mismo puede
 * venir en dos páginas (y repetiría la key de React).
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
