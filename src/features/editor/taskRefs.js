import { useQueries } from '@tanstack/react-query'
import { searchApi } from '@/features/search/api'

/**
 * Tareas a las que apunta un código («WEB-12») dentro de una descripción o un comentario. Las consultas de
 * todos los textos que se dibujan a la vez se juntan en una sola petición (`/search/codes`) y cada código queda
 * en caché un minuto: abrir una tarea con varios comentarios no hace una petición por código.
 */

const MAX_CODES_PER_REQUEST = 50
/** Códigos pedidos en el mismo momento, por workspace: `slug → Map(código → promesas en espera)`. */
const batches = new Map()

async function flush(slug) {
  const waiting = batches.get(slug)
  batches.delete(slug)
  const codes = [...waiting.keys()]
  for (let start = 0; start < codes.length; start += MAX_CODES_PER_REQUEST) {
    const chunk = codes.slice(start, start + MAX_CODES_PER_REQUEST)
    try {
      const issues = await searchApi.byCodes(slug, chunk)
      const byCode = new Map(issues.map((issue) => [issue.code?.toUpperCase(), issue]))
      chunk.forEach((code) => waiting.get(code).forEach(({ resolve }) => resolve(byCode.get(code) ?? null)))
    } catch (error) {
      chunk.forEach((code) => waiting.get(code).forEach(({ reject }) => reject(error)))
    }
  }
}

/** La tarea con ese código (o `null` si no existe o no se puede ver), pedida junto con las demás del momento. */
function loadTaskRef(slug, code) {
  return new Promise((resolve, reject) => {
    let waiting = batches.get(slug)
    if (!waiting) {
      waiting = new Map()
      batches.set(slug, waiting)
      setTimeout(() => flush(slug), 0)
    }
    if (!waiting.has(code)) waiting.set(code, [])
    waiting.get(code).push({ resolve, reject })
  })
}

/** Clave de la caché de una referencia (para invalidarlas cuando cambia una tarea). */
export const taskRefKey = (slug, code) => ['taskRef', slug, code]

/**
 * Tareas de esos códigos: `Map(código → tarea)` con solo las que existen (mientras cargan, no están).
 * @param {string | undefined} slug
 * @param {string[]} codes
 * @returns {Map<string, import('@/api/types').IssueResponse>}
 */
export function useTaskRefs(slug, codes) {
  return useQueries({
    queries: codes.map((code) => ({
      queryKey: taskRefKey(slug, code),
      queryFn: () => loadTaskRef(slug, code),
      enabled: Boolean(slug),
      staleTime: 60_000,
      retry: false,
    })),
    combine: (results) => {
      const found = new Map()
      results.forEach((result, index) => result.data && found.set(codes[index], result.data))
      return found
    },
  })
}
