/**
 * Las líneas de «Partir en tareas» (funciones puras): cada línea es una tarea con su tipo, su asignado y su
 * prioridad; «@texto» abre el selector de personas y «!texto» el de prioridades.
 */

let counter = 0

/** Línea vacía (Tarea por defecto, o el tipo de la línea anterior). */
export function emptyLine(type = 'TASK') {
  counter += 1
  return { id: `line-${counter}`, title: '', type, assignee: null, priority: null }
}

/**
 * Si el cursor está justo después de «@algo» o «!algo» (al principio o después de un espacio), qué selector abrir y
 * qué texto se está buscando. `start`/`end`: dónde está ese token en el texto (para quitarlo al elegir).
 * @param {string} text
 * @param {number} caret posición del cursor
 * @returns {{ kind: 'person' | 'priority', query: string, start: number, end: number } | null}
 */
export function pickerQuery(text, caret) {
  const before = text.slice(0, caret)
  const match = /(^|\s)([@!])([^\s@!]*)$/.exec(before)
  if (!match) return null
  const start = before.length - match[2].length - match[3].length
  return { kind: match[2] === '@' ? 'person' : 'priority', query: match[3], start, end: caret }
}

/** Quita del texto el token «@luis» o «!alta» (y un espacio de sobra). */
export function removeToken(text, start, end) {
  return `${text.slice(0, start)}${text.slice(end)}`.replace(/\s{2,}/g, ' ').trimStart()
}

/**
 * Lo que se manda a POST /split: las líneas con título (sin espacios sobrantes), con su tipo, asignado y prioridad.
 * @param {{ title: string, type: string, assignee: { id: string } | null, priority: string | null }[]} lines
 */
export function linesToItems(lines) {
  return lines
    .filter((line) => line.title.trim())
    .map((line) => ({
      title: line.title.trim(),
      type: line.type,
      assigneeIds: line.assignee ? [line.assignee.id] : [],
      ...(line.priority ? { priority: line.priority } : {}),
    }))
}
