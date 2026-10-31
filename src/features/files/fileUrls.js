import { useQueries, useQuery } from '@tanstack/react-query'
import { useSessionStore } from '@/stores/sessionStore'
import { filesApi } from './api'

/**
 * URLs firmadas (GET) de los archivos: el bucket es privado y un `<img>` no puede mandar el token. Las de todo lo que
 * se dibuja a la vez (las imágenes de una descripción, los avatares de una lista) se piden juntas en una sola petición
 * (`/files/urls`), quedan en caché mientras valen y se vuelven a pedir antes de que venzan (10 minutos antes). Así el
 * navegador reutiliza la misma URL (y la imagen de su caché) durante casi una hora.
 */

const MAX_IDS_PER_REQUEST = 100
/** Se renuevan cuando les queda esto. */
export const REFRESH_MARGIN_MS = 10 * 60 * 1000
const FALLBACK_TTL_MS = 60 * 60 * 1000

/** Ids pedidos en el mismo momento, por tipo: `'inline' | 'download' → Map(id → promesas en espera)`. */
const batches = new Map()

async function flush(kind) {
  const waiting = batches.get(kind)
  batches.delete(kind)
  const ids = [...waiting.keys()]
  for (let start = 0; start < ids.length; start += MAX_IDS_PER_REQUEST) {
    const chunk = ids.slice(start, start + MAX_IDS_PER_REQUEST)
    try {
      const urls = await filesApi.urls(chunk, kind === 'download')
      const byId = new Map(urls.map((url) => [url.id.toLowerCase(), url]))
      chunk.forEach((id) => waiting.get(id).forEach(({ resolve }) => resolve(byId.get(id) ?? null)))
    } catch (error) {
      chunk.forEach((id) => waiting.get(id).forEach(({ reject }) => reject(error)))
    }
  }
}

/**
 * La URL de un archivo (o `null` si no existe o no se puede ver), pedida junto con las demás del momento.
 * @param {string} id
 * @param {{ download?: boolean }} [options]
 * @returns {Promise<import('./api').FileUrl | null>}
 */
export function loadFileUrl(id, { download = false } = {}) {
  const kind = download ? 'download' : 'inline'
  const key = id.toLowerCase()
  return new Promise((resolve, reject) => {
    let waiting = batches.get(kind)
    if (!waiting) {
      waiting = new Map()
      batches.set(kind, waiting)
      setTimeout(() => flush(kind), 0)
    }
    if (!waiting.has(key)) waiting.set(key, [])
    waiting.get(key).push({ resolve, reject })
  })
}

export const fileUrlKey = (id, download = false) => ['fileUrl', id?.toLowerCase(), download ? 'download' : 'inline']

/** Cuánto falta para renovarla (0 si ya hay que hacerlo). */
export function msUntilRefresh(fileUrl, now = Date.now()) {
  const expires = fileUrl?.expiresAt ? Date.parse(fileUrl.expiresAt) : now + FALLBACK_TTL_MS
  return Math.max(0, expires - REFRESH_MARGIN_MS - now)
}

const queryOptions = (id, enabled) => ({
  queryKey: fileUrlKey(id),
  queryFn: () => loadFileUrl(id),
  enabled: Boolean(id) && enabled,
  // Fresca mientras falten más de 10 minutos para que venza; después se renueva sola (también sin foco)
  staleTime: (query) => (query.state.data ? msUntilRefresh(query.state.data) : 0),
  refetchInterval: (query) => (query.state.data ? Math.max(30_000, msUntilRefresh(query.state.data)) : false),
  refetchIntervalInBackground: true,
  gcTime: FALLBACK_TTL_MS - REFRESH_MARGIN_MS,
  retry: 1,
})

/**
 * URL de un archivo para mostrarlo (imágenes y PDF se abren; lo demás se descarga).
 * @param {string | null | undefined} id
 * @returns {{ data: import('./api').FileUrl | null | undefined, isLoading: boolean, isError: boolean }}
 */
export function useFileUrl(id) {
  const signedIn = useSessionStore((state) => Boolean(state.accessToken))
  return useQuery(queryOptions(id, signedIn))
}

/**
 * URLs de varios archivos: `Map(id → FileUrl)` con solo los que ya llegaron y se pueden ver.
 * @param {string[]} ids
 */
export function useFileUrls(ids) {
  const signedIn = useSessionStore((state) => Boolean(state.accessToken))
  return useQueries({
    queries: ids.map((id) => queryOptions(id, signedIn)),
    combine: (results) => {
      const found = new Map()
      results.forEach((result, index) => result.data && found.set(ids[index].toLowerCase(), result.data))
      return found
    },
  })
}

/**
 * Descarga un archivo con su nombre original: pide una URL nueva (con `attachment`) y la abre.
 * @param {string} id
 */
export async function downloadFile(id) {
  const url = await loadFileUrl(id, { download: true })
  if (!url) throw new Error('No tienes acceso a este archivo o ya no existe.')
  const link = document.createElement('a')
  link.href = url.url
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

/**
 * Abre un archivo en otra pestaña (los PDF con el visor del navegador). La pestaña se abre antes de pedir la URL para
 * que el navegador no la bloquee.
 * @param {string} id
 */
export async function openFileInNewTab(id) {
  const tab = window.open('', '_blank')
  try {
    const url = await loadFileUrl(id)
    if (!url) throw new Error('No tienes acceso a este archivo o ya no existe.')
    if (tab) {
      tab.opener = null
      tab.location.href = url.url
    } else {
      window.open(url.url, '_blank', 'noopener')
    }
  } catch (error) {
    tab?.close()
    throw error
  }
}
