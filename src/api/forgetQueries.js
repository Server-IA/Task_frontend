/**
 * Olvida las consultas de algo que ya no existe o ya no se puede abrir (un workspace eliminado, una tarea borrada).
 *
 * Las cancela todas. Lo que nadie mira se borra enseguida; lo que la página vieja todavía muestra se borra recién
 * cuando nadie lo mira: borrarlo antes hacía que la página, al volver a dibujarse antes de irse, lo pidiera de
 * nuevo (y recibiera 403 o 404). Quien llama navega fuera justo después.
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {readonly unknown[][]} keys prefijos de las consultas a olvidar
 */
export function forgetQueries(queryClient, keys) {
  const cache = queryClient.getQueryCache()
  const watched = new Set()
  for (const key of keys) {
    queryClient.cancelQueries({ queryKey: key })
    for (const query of cache.findAll({ queryKey: key })) {
      if (query.getObserversCount() > 0) watched.add(query)
      else cache.remove(query)
    }
  }
  if (watched.size > 0) {
    const unsubscribe = cache.subscribe((event) => {
      if (event.type !== 'observerRemoved' || !watched.has(event.query) || event.query.getObserversCount() > 0) return
      watched.delete(event.query)
      cache.remove(event.query)
      if (watched.size === 0) unsubscribe()
    })
  }
}
