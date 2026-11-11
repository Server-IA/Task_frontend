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
  /** Al pulsar «Entrar»: el login se desvanece y el logo va de su lugar en el panel al centro. */
  enter: 700,
  /** Entrada de la app: el logo se desvanece y entran el menú, la página y lo demás, en ese orden. */
  app: 1800,
  /** Salida al cerrar sesión: la app se va y el logo vuelve al centro antes de pasar al login. */
  out: 460,
  /** Cuánto vale el pedido de entrada del login después de cerrar sesión (si el login no llega, se olvida). */
  loginRequest: 4000,
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
 * @returns {{ elapsed: number, fromLogout: boolean } | null}
 */
export function peekIntro() {
  if (!canAnimate()) return null
  // Después de cerrar sesión: el logo ya está dibujado en el centro y solo falta que vuele a su lugar
  if (loginIntroAt != null && now() - loginIntroAt < INTRO.loginRequest) return { elapsed: INTRO.draw, fromLogout: true }
  if (firstScreenShown) return null
  return { elapsed: splashElapsed(), fromLogout: false }
}

/*
 * Salida al cerrar sesión: la app se va, el logo vuelve al centro y el login que viene lo recibe ahí y entra animado
 * (`peekIntro` con `fromLogout`).
 */
let loginIntroAt = null

/** El login ya tomó su entrada: la siguiente vez aparece como siempre. */
export function markLoginIntroShown() {
  loginIntroAt = null
}

/**
 * Arranca la salida y avisa cuando terminó (para cerrar la sesión de verdad). `start` pone la app en modo salida.
 * Sin animaciones, o si la app no está a la vista, termina de una vez y no pide nada.
 * @param {() => void} start
 * @returns {Promise<void>}
 */
export function playLogoutOutro(start) {
  if (!canAnimate() || !document.querySelector('[data-app-shell]')) return Promise.resolve()
  loginIntroAt = now()
  start()
  return new Promise((resolve) => setTimeout(resolve, INTRO.out))
}

/*
 * Entrada de la app: al iniciar sesión (o al abrir la app con la sesión ya iniciada) el logo de carga se abre y deja
 * ver la app, que entra por partes: primero el menú y luego la página. Pasa una vez por cada entrada: al iniciar
 * sesión la pide el login (`requestAppIntro`); al abrir la página, vale por haber mostrado el logo de carga.
 */
let appIntroRequested = false
let appShown = false

/** El login la pide al entrar: la próxima vez que se monte la app, entra animada. */
export function requestAppIntro() {
  appIntroRequested = true
}

/**
 * Al iniciar sesión, antes de pasar a la app: el login se desvanece y su logo va al centro, donde lo recibe la pantalla
 * de carga y después la entrada de la app. `start` pone el login en modo salida; avisa cuando terminó. Sin
 * animaciones, o si el login no está a la vista, termina de una vez.
 * @param {() => void} start
 * @returns {Promise<void>}
 */
export function playLoginOutro(start) {
  if (!canAnimate() || !document.querySelector('[data-login-shell]')) return Promise.resolve()
  start()
  return new Promise((resolve) => setTimeout(resolve, INTRO.enter))
}

/** Si a la app que se está montando le toca entrar animada (se puede consultar varias veces durante el render). */
export function peekAppIntro() {
  if (!canAnimate()) return false
  return appIntroRequested || (splashAt != null && !appShown)
}

/** La app ya se mostró: hasta el próximo inicio de sesión no vuelve a entrar animada. */
export function markAppShown() {
  appIntroRequested = false
  appShown = true
}

/** Solo para pruebas: como si la página se acabara de abrir. */
export function resetIntro() {
  splashAt = null
  firstScreenShown = false
  appIntroRequested = false
  appShown = false
  loginIntroAt = null
}
