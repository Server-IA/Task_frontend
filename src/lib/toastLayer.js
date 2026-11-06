/** El contenedor de los avisos (sonner): vive fuera de los diálogos y paneles, por encima de ellos. */
const TOASTER_SELECTOR = '[data-sonner-toaster]'

/** Si `target` está dentro de un aviso. */
export const isInToaster = (target) => typeof target?.closest === 'function' && Boolean(target.closest(TOASTER_SELECTOR))

/**
 * `onInteractOutside` para un diálogo o panel: un clic (o el foco) en un aviso no lo cierra, así su botón
 * («Deshacer», «Copiar mi texto») funciona con el panel abierto. Llama además al manejador propio, si hay.
 */
export function keepOpenOnToast(handler) {
  return (event) => {
    if (isInToaster(event.target)) event.preventDefault()
    handler?.(event)
  }
}
