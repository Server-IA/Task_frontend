import { createElement, Fragment } from 'react'
import { enUS, es } from 'date-fns/locale'
import { keepSplashOnReload } from '@/lib/intro'
import en from './en'

/**
 * Idiomas de la interfaz: español (el idioma en el que está escrito el código) e inglés.
 *
 * Cómo se usa:
 *  - `t('Nueva tarea')`: el texto en español ES la clave. En español se devuelve tal cual; en inglés se busca en el
 *    diccionario (`./en`). Con variables: `t('Espera {seconds} s', { seconds })`.
 *  - `tn(count, '{count} tarea', '{count} tareas')`: singular o plural según `count` (cada forma es una clave).
 *  - `tc('filtro', 'Todo')`: la misma palabra con otra traducción según el contexto (clave «Todo [[filtro]]»).
 *  - `tx('Abre {link} para seguir', { link: <a>…</a> })`: una frase con elementos de React adentro.
 *  - `stateName(state)`: el nombre de un estado; los de fábrica (Backlog, Todo…) se muestran en el idioma elegido.
 *  - `dateLocale()` / `localeTag()`: para date-fns e `Intl`.
 *
 * El idioma se lee una sola vez, al cargar la página, y cambiarlo la recarga (`setLanguage`). Por eso `t()` es una
 * función normal: sirve dentro y fuera de los componentes, también en constantes a nivel de módulo.
 *
 * Toda clave que aparezca en el código tiene que estar en `./en` (lo comprueba `coverage.test.js`).
 */

export const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
]
const CODES = LANGUAGES.map((language) => language.code)
const STORAGE_KEY = 'taskflow-language'
const DICTIONARIES = { en }

/** El idioma guardado en este navegador; si no hay, el del navegador (inglés si empieza por «en», si no español). */
function detectLanguage() {
  // Las pruebas están escritas con los textos en español (el navegador simulado dice que habla inglés)
  if (import.meta.env?.MODE === 'test') return 'es'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (CODES.includes(stored)) return stored
  } catch {
    // Sin almacenamiento (modo privado estricto): se usa el del navegador
  }
  const browser = typeof navigator === 'undefined' ? '' : (navigator.language ?? '')
  return browser.toLowerCase().startsWith('en') ? 'en' : 'es'
}

let language = detectLanguage()
if (typeof document !== 'undefined') document.documentElement.lang = language

/** @returns {'es' | 'en'} */
export const getLanguage = () => language

/**
 * Cambia el idioma: lo guarda en el navegador y recarga la página para que todo se vuelva a pintar. Sin cambio, no
 * hace nada. `reload: false` solo lo guarda (el llamador recarga cuando termine lo suyo).
 */
export function setLanguage(code, { reload = true } = {}) {
  if (!CODES.includes(code) || code === language) return
  try {
    window.localStorage.setItem(STORAGE_KEY, code)
  } catch {
    // Sin almacenamiento el cambio dura lo que dure la página
  }
  if (reload) reloadWithSplash()
}

/**
 * Recarga la página tapándola antes con el logo de carga (en vez de un salto en blanco): la tapa aparece, se anota que
 * la carga siguiente debe empezar con el logo puesto (`index.html` y `lib/intro` lo leen) y entonces se recarga.
 */
function reloadWithSplash() {
  try {
    keepSplashOnReload()
    const dark = document.documentElement.classList.contains('dark')
    const cover = document.createElement('div')
    cover.setAttribute('aria-hidden', 'true')
    cover.className = 'tf-fade fixed inset-0 z-[100] flex items-center justify-center bg-background'
    cover.innerHTML =
      '<svg viewBox="0 0 32 32" width="112" height="112">' +
      `<rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill="${dark ? '#38332b' : '#23201B'}" stroke="${dark ? '#5a5246' : 'none'}"/>` +
      '<path d="M8.5 16.5l5 5L23.5 11 M17.5 11h6v6" fill="none" stroke="#EAD9B0" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    document.body.append(cover)
    // Un momento para que la tapa se vea antes de recargar
    window.setTimeout(() => window.location.reload(), 220)
  } catch {
    window.location.reload()
  }
}

/** Solo para pruebas: cambia el idioma en memoria, sin guardar ni recargar. */
export function setLanguageForTests(code) {
  language = code
}

const fill = (text, vars) => (vars ? text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match)) : text)

/** La traducción de una clave sin rellenar las variables. */
function lookup(key, fallback = key) {
  if (language === 'es') return fallback
  return DICTIONARIES[language]?.[key] ?? fallback
}

/**
 * Traduce un texto escrito en español; `{nombre}` se reemplaza por `vars.nombre`.
 * @param {string} text
 * @param {Record<string, string | number>} [vars]
 */
export function t(text, vars) {
  return fill(lookup(text), vars)
}

/** Singular o plural: `tn(3, '{count} tarea', '{count} tareas')` → «3 tareas». `count` va en las variables. */
export function tn(count, one, other, vars) {
  return t(count === 1 ? one : other, { count, ...vars })
}

/** Como `t`, para una palabra que en inglés cambia según dónde va: `tc('filtro', 'Todo')`. */
export function tc(context, text, vars) {
  return fill(lookup(`${text} [[${context}]]`, text), vars)
}

/**
 * Una frase con elementos de React adentro: `tx('Abre {link} para seguir', { link: <a>…</a> })`. Devuelve nodos para
 * poner directamente en el JSX. Las variables que no sean elementos se ponen como texto.
 * @param {string} text
 * @param {Record<string, React.ReactNode>} parts
 */
export function tx(text, parts = {}) {
  const pieces = lookup(text).split(/(\{\w+\})/g)
  return createElement(
    Fragment,
    null,
    ...pieces.map((piece, index) => {
      const name = /^\{(\w+)\}$/.exec(piece)?.[1]
      if (!name || !(name in parts)) return piece
      return createElement(Fragment, { key: index }, parts[name])
    }),
  )
}

/** Marca un texto para traducirlo después con `t(...)` (no hace nada: sirve para que la comprobación lo encuentre). */
export const msg = (text) => text

/** Nombres de fábrica de los estados de un proyecto (como se guardan) y cómo se llaman en español. */
const DEFAULT_STATES = {
  backlog: { en: 'Backlog', es: 'Pendiente' },
  todo: { en: 'Todo', es: 'Sin empezar' },
  'in progress': { en: 'In Progress', es: 'En curso' },
  done: { en: 'Done', es: 'Completado' },
  cancelled: { en: 'Cancelled', es: 'Cancelado' },
}

/**
 * El nombre de un estado para mostrar. Los proyectos nacen con cinco estados que se guardan en inglés (Backlog, Todo,
 * In Progress, Done, Cancelled): mientras conserven ese nombre se ven en el idioma elegido. Uno renombrado o creado
 * por el equipo se ve como lo escribieron.
 * @param {{ name?: string } | string | null | undefined} state un estado o su nombre
 */
export function stateName(state) {
  const name = typeof state === 'string' ? state : state?.name
  if (!name) return name ?? ''
  return DEFAULT_STATES[name.trim().toLowerCase()]?.[language] ?? name
}

/**
 * Lo que se guarda al editar el nombre de un estado: si quedó igual a como se mostraba (el nombre de fábrica
 * traducido), se conserva el nombre guardado para que siga traduciéndose.
 */
export function stateNameToSave(storedName, shownName) {
  return shownName.trim() === stateName(storedName) ? storedName : shownName
}

/** Locale de date-fns del idioma elegido. */
export const dateLocale = () => (language === 'en' ? enUS : es)

/** Etiqueta de idioma para `Intl` y `toLocaleString` («es» o «en»). */
export const localeTag = () => language
