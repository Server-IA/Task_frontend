/**
 * Menciones en los comentarios. En el cuerpo que se guarda van como `@[Nombre Visible](id-del-usuario)`
 * (el backend las lee para avisar a esas personas); en pantalla y mientras se escribe se ven como «@Nombre Visible».
 */

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
/** El mismo formato que acepta el backend (MentionParser). */
const TOKEN = new RegExp(`@\\[([^\\]\\r\\n]{1,200})\\]\\((${UUID})\\)`, 'g')
/** Mención cortada al final de un extracto del historial (el backend recorta el comentario y agrega «…»). */
const CUT_TOKEN = /@\[([^\]\r\n]*)(?:\]\([^)\s]*)?…$/

/** @typedef {{ type: 'text', text: string } | { type: 'mention', name: string, userId: string | null }} MentionSegment */
/** @typedef {{ name: string, userId: string }} Mention */

/** Nombre apto para el token: sin «]» ni saltos de línea y con el largo que acepta el backend. */
export function mentionName(fullName = '') {
  return fullName.replace(/[\]\r\n]/g, '').trim().slice(0, 200)
}

/** `@[Ana Gómez](id)` */
export function mentionToken(name, userId) {
  return `@[${mentionName(name)}](${userId})`
}

/**
 * Divide un cuerpo guardado en trozos de texto y menciones.
 * @param {string} [body]
 * @returns {MentionSegment[]}
 */
export function parseMentions(body = '') {
  const segments = []
  const pushText = (text) => text && segments.push({ type: 'text', text })
  let last = 0
  for (const match of body.matchAll(TOKEN)) {
    pushText(body.slice(last, match.index))
    segments.push({ type: 'mention', name: match[1], userId: match[2] })
    last = match.index + match[0].length
  }
  const rest = body.slice(last)
  const cut = CUT_TOKEN.exec(rest)
  if (cut && cut[1]) {
    pushText(rest.slice(0, cut.index))
    segments.push({ type: 'mention', name: `${cut[1]}…`, userId: null })
  } else {
    pushText(rest)
  }
  return segments
}

/** Ids de las personas mencionadas, sin repetir y en orden de aparición. */
export function mentionedIds(body = '') {
  const ids = parseMentions(body)
    .filter((segment) => segment.type === 'mention' && segment.userId)
    .map((segment) => segment.userId)
  return [...new Set(ids)]
}

/** Cuerpo legible, con «@Nombre» en lugar de los tokens (para títulos, avisos o vistas previas). */
export function toPlainText(body = '') {
  return parseMentions(body)
    .map((segment) => (segment.type === 'text' ? segment.text : `@${segment.name}`))
    .join('')
}

/**
 * Cuerpo guardado → lo que se edita: el texto con «@Nombre» y las menciones que tiene (para volver a guardarlas).
 * @returns {{ text: string, mentions: Mention[] }}
 */
export function toEditable(body = '') {
  const mentions = []
  const text = parseMentions(body)
    .map((segment) => {
      if (segment.type === 'text') return segment.text
      if (segment.userId) mentions.push({ name: segment.name, userId: segment.userId })
      return `@${segment.name}`
    })
    .join('')
  return { text, mentions }
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Divide el texto que se está escribiendo en texto y menciones: es mención cada «@Nombre» de las personas
 * elegidas en la lista (los nombres más largos primero, y sin seguir pegado a otra letra).
 * @param {string} text
 * @param {Mention[]} mentions
 * @returns {MentionSegment[]}
 */
export function splitDisplayMentions(text, mentions) {
  // Si dos personas se llaman igual, gana la última que se eligió
  const idByName = new Map(mentions.map((mention) => [mention.name, mention.userId]))
  const names = [...idByName.keys()].filter(Boolean).sort((a, b) => b.length - a.length)
  if (names.length === 0) return text ? [{ type: 'text', text }] : []

  const pattern = new RegExp(`@(${names.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}_])`, 'gu')
  const segments = []
  let last = 0
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) segments.push({ type: 'text', text: text.slice(last, match.index) })
    segments.push({ type: 'mention', name: match[1], userId: idByName.get(match[1]) })
    last = match.index + match[0].length
  }
  if (last < text.length) segments.push({ type: 'text', text: text.slice(last) })
  return segments
}

/** Texto escrito → cuerpo para guardar: cada «@Nombre» elegido de la lista vuelve a ser un token. */
export function toStored(text, mentions) {
  return splitDisplayMentions(text, mentions)
    .map((segment) => (segment.type === 'text' ? segment.text : mentionToken(segment.name, segment.userId)))
    .join('')
}

/**
 * Mención que se está escribiendo justo antes del cursor («hola @an|» → `{ start: 5, query: 'an' }`).
 * La @ va al inicio o después de un espacio o un signo de apertura, y la búsqueda no pasa de una línea.
 * @returns {{ start: number, query: string } | null}
 */
export function findMentionQuery(text, caret) {
  const before = text.slice(0, caret)
  const match = /(^|[\s([{«"'¿¡])@([^@\n]{0,40})$/u.exec(before)
  if (!match) return null
  const query = match[2]
  if (/^\s/.test(query) || /\s{2}/.test(query)) return null
  return { start: match.index + match[1].length, query }
}

/**
 * Reemplaza la «@búsqueda» (de `start` a `end`) por «@Nombre » y deja el cursor después.
 * @returns {{ text: string, caret: number, mention: Mention }}
 */
export function insertMention(text, { start, end }, user) {
  const name = mentionName(user.fullName)
  const before = text.slice(0, start)
  const after = text.slice(end)
  const inserted = `@${name}${after.startsWith(' ') ? '' : ' '}`
  return { text: before + inserted + after, caret: before.length + inserted.length, mention: { name, userId: user.id } }
}

/** «Luis», «Luis y Ana», «Luis, Ana y Carlos». */
export function joinNames(names) {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} y ${names.at(-1)}`
}

/** Minúsculas y sin tildes, para buscar «jose» y encontrar «José». */
export const normalizeForSearch = (value = '') =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/**
 * Personas que coinciden con lo escrito tras la @: primero las que empiezan así, luego las que tienen una palabra
 * que empieza así y al final las que lo contienen (o su correo empieza así).
 * @template {{ fullName: string, email?: string }} T
 * @param {T[]} people
 * @param {string} query
 * @returns {T[]}
 */
export function filterPeople(people, query, limit = 6) {
  const needle = normalizeForSearch(query.trim())
  const scored = []
  people.forEach((person, index) => {
    const name = normalizeForSearch(person.fullName)
    let score = -1
    if (!needle || name.startsWith(needle)) score = 3
    else if (name.split(/\s+/).some((word) => word.startsWith(needle))) score = 2
    else if (name.includes(needle) || normalizeForSearch(person.email).startsWith(needle)) score = 1
    if (score >= 0) scored.push({ person, score, index })
  })
  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.person)
}
