import { useState } from 'react'

/**
 * La clave de lo que de verdad se está mostrando cuando una consulta guarda los datos anteriores mientras llegan los
 * nuevos (`placeholderData: keepPreviousData`): al cambiar de filtro o de pestaña sigue siendo la anterior hasta que
 * llegan los datos nuevos. Con ella como `key` de la lista, lo nuevo entra con su animación una sola vez y en el
 * momento justo: sin vaciarse ni pasar por el esqueleto, y sin animar los datos viejos bajo el filtro nuevo.
 * @param {string} key la clave del filtro o la pestaña que se pidió
 * @param {boolean} isPlaceholderData si lo que hay en pantalla todavía es lo anterior
 */
export function useShownKey(key, isPlaceholderData) {
  const [shown, setShown] = useState(key)
  if (!isPlaceholderData && shown !== key) setShown(key)
  return isPlaceholderData ? shown : key
}
