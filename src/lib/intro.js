/**
 * Entrada animada al abrir la app en el login: el logo de carga se dibuja, vuela a su lugar en el panel de marca y el
 * contenido entra por partes. Solo pasa en la primera pantalla de cada carga de la página (al navegar dentro de la
 * app, por ejemplo al cerrar sesión, el login aparece como siempre).
 *
 * Este módulo lleva la cuenta de esa carga: cuándo apareció el logo y si ya se mostró alguna pantalla.
 */

/** Tiempos de la entrada, en milisegundos (los de `globals.css` van a juego). */
export const INTRO = {
  /** Lo que tarda el logo en aparecer y dibujarse (el check y luego la flecha). */
  draw: 1050,
  /** Pausa con el logo ya dibujado antes de despegar. */
  hold: 150,
  /** Vuelo del logo desde el centro hasta el panel de marca. */
  fly: 520,
  /** Desde que despega hasta que terminó de entrar todo el contenido. */
  settle: 1800,
}

let splashAt = null
let firstScreenShown = false

const now = () => (typeof performance === 'undefined' ? Date.now() : performance.now())

/** El logo de carga apareció: cuenta desde la primera vez en esta carga de la página. */
export function markSplash() {
  if (splashAt == null) splashAt = now()
}

/** Milisegundos que lleva en pantalla el logo de carga (0 si todavía no apareció). */
export const splashElapsed = () => (splashAt == null ? 0 : now() - splashAt)

/** Ya se mostró una pantalla: las siguientes llegan navegando y no llevan entrada. */
export function markFirstScreen() {
  firstScreenShown = true
}

/** Si el navegador puede hacer la entrada: tiene animaciones por script y la persona no pidió menos movimiento. */
function canAnimate() {
  if (typeof window === 'undefined' || typeof Element === 'undefined') return false
  if (typeof Element.prototype.animate !== 'function') return false
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * La entrada que le toca a la pantalla que se está montando, sin consumirla (se puede llamar varias veces durante el
 * render): `null` si ya se mostró otra pantalla o no se puede animar; si no, cuánto lleva el logo de carga a la vista.
 * @returns {{ elapsed: number } | null}
 */
export function peekIntro() {
  if (firstScreenShown || !canAnimate()) return null
  return { elapsed: splashElapsed() }
}

/** Solo para pruebas: como si la página se acabara de abrir. */
export function resetIntro() {
  splashAt = null
  firstScreenShown = false
}
