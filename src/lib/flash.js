import { create } from 'zustand'

/**
 * Marcas de corta vida para animar UNA cosa concreta justo después de una acción: la tarjeta que se acaba de soltar en
 * el tablero (`settled`), la tarea recién creada (`created`), la recién completada (`completed`) y el ciclo recién
 * cerrado (`closedCycle`). Quien pinta esa cosa pregunta con `useFlash` y se anima solo mientras dura la marca; el
 * resto de la pantalla no se entera.
 */
export const useFlashStore = create(() => ({ settled: null, created: null, completed: null, closedCycle: null }))

const timers = {}

/** Marca `id` durante `ms` milisegundos (una marca nueva del mismo tipo reemplaza a la anterior). */
export function flash(kind, id, ms = 1500) {
  useFlashStore.setState({ [kind]: id })
  clearTimeout(timers[kind])
  timers[kind] = setTimeout(() => useFlashStore.setState({ [kind]: null }), ms)
}

/** Si `id` es lo que se acaba de marcar. */
export const useFlash = (kind, id) => useFlashStore((state) => id != null && state[kind] === id)
