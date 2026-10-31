/**
 * Documento del editor → Markdown para guardar. Es la inversa de `markdownToDoc`: lo que se guarda y se vuelve a
 * leer da el mismo documento. Escapa solo lo que haría falta para que el texto no se lea como formato
 * («*», «_» en los bordes de palabra, «[», «<div» o «- » al principio de una línea).
 */

import { fileReference, parseFileReference } from '@/features/files/fileRefs'

/** @typedef {import('./parse').DocNode} DocNode */

/** Orden de las marcas, de afuera hacia adentro (el código siempre va adentro). */
const MARK_ORDER = ['link', 'bold', 'italic', 'strike', 'code']
const DELIMITERS = { bold: '**', italic: '*', strike: '~~' }

const isWordChar = (char) => Boolean(char) && /[\p{L}\p{N}]/u.test(char)

/** Escapa los caracteres que el Markdown leería como formato. */
export function escapeText(value) {
  let out = ''
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    const previous = value[index - 1]
    const next = value[index + 1]
    if ('\\*`[]~'.includes(char)) out += `\\${char}`
    // «snake_case» queda igual; «_algo_» se escapa
    else if (char === '_' && !(isWordChar(previous) && isWordChar(next))) out += '\\_'
    // «<div» o «<https://…» serían HTML o un enlace automático
    else if (char === '<' && next && /[A-Za-z/!?]/.test(next)) out += '\\<'
    // «&amp;» sería una entidad
    else if (char === '&' && /^&(#\d+|#[xX][0-9a-fA-F]+|[A-Za-z]+);/.test(value.slice(index))) out += '\\&'
    else out += char
  }
  return out
}

/** Escapa lo que al principio de una línea empezaría un bloque: «# », «> », «- », «1. », «---». */
function escapeLineStart(value) {
  if (/^#{1,6}(\s|$)/.test(value)) return `\\${value}`
  if (/^>/.test(value)) return `\\${value}`
  if (/^[-+](\s|$)/.test(value)) return `\\${value}`
  if (/^\d{1,9}[.)](\s|$)/.test(value)) return value.replace(/^(\d+)([.)])/, '$1\\$2')
  // Una línea de solo «-» o «=» convertiría la anterior en título
  if (/^(-+|=+)\s*$/.test(value)) return `\\${value}`
  // «a | b» seguido de «--- | ---» sería una tabla
  if (/^[\s|:-]*\|[\s|:-]*$/.test(value) && value.includes('-')) return value.replace(/\|/g, '\\|')
  return value
}

const sortMarks = (marks = []) =>
  [...marks].filter((mark) => MARK_ORDER.includes(mark.type)).sort((a, b) => MARK_ORDER.indexOf(a.type) - MARK_ORDER.indexOf(b.type))

const sameMark = (a, b) => a.type === b.type && (a.type !== 'link' || a.attrs?.href === b.attrs?.href)

function linkHref(href = '') {
  const clean = href.replace(/\s/g, '%20')
  return /[()<>]/.test(clean) ? `<${clean.replace(/[<>]/g, encodeURIComponent)}>` : clean
}

function codeSpan(value) {
  const longest = Math.max(0, ...(value.match(/`+/g) ?? []).map((run) => run.length))
  const fence = '`'.repeat(longest + 1)
  const pad = value.startsWith('`') || value.endsWith('`') ? ' ' : ''
  return `${fence}${pad}${value}${pad}${fence}`
}

/**
 * Contenido en línea → Markdown. `table` escapa «|» y pasa los saltos de línea a espacios; `heading` también
 * pasa los saltos a espacios (un título es una sola línea).
 * @param {DocNode[]} nodes
 * @param {{ table?: boolean, heading?: boolean }} [options]
 */
export function serializeInline(nodes = [], { table = false, heading = false } = {}) {
  const singleLine = table || heading
  let out = ''
  let active = []
  let lineStart = !singleLine

  const close = (count) => {
    if (count <= 0) return
    const closing = active.slice(active.length - count).reverse()
    // Los delimitadores de cierre no pueden ir después de un espacio: el espacio pasa afuera
    const trailing = /\s+$/.exec(out)?.[0] ?? ''
    if (trailing) out = out.slice(0, -trailing.length)
    for (const mark of closing) {
      if (mark.type === 'link') out += `](${linkHref(mark.attrs?.href)})`
      else if (mark.type !== 'code') out += DELIMITERS[mark.type]
    }
    out += trailing
    active = active.slice(0, active.length - count)
  }

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (node.type === 'hardBreak') {
      close(active.length)
      out += singleLine ? ' ' : '\n'
      lineStart = !singleLine
      continue
    }
    if (node.type === 'mention') {
      close(active.length)
      const label = (node.attrs?.label ?? '').replace(/[\]\r\n]/g, '').trim().slice(0, 200)
      out += `@[${label}](${node.attrs?.id})`
      lineStart = false
      continue
    }
    if (node.type !== 'text' || !node.text) continue

    const marks = sortMarks(node.marks)
    const link = marks.find((mark) => mark.type === 'link')
    // Un enlace cuyo texto es la misma dirección se guarda suelto: «https://…»
    const bare =
      link &&
      marks.length === 1 &&
      node.text === link.attrs?.href &&
      /^https?:\/\/\S+$/.test(node.text) &&
      !active.some((mark) => mark.type === 'link') &&
      !nodes[index + 1]?.marks?.some((mark) => sameMark(mark, link)) &&
      (!out || /[\s*_~(]$/.test(out))
    if (bare) {
      close(active.length)
      out += node.text
      lineStart = false
      continue
    }

    let keep = 0
    while (keep < active.length && keep < marks.length && sameMark(active[keep], marks[keep])) keep += 1
    close(active.length - keep)

    let value = node.text
    const isCode = marks.some((mark) => mark.type === 'code')
    const opening = marks.slice(keep)
    // Los delimitadores de apertura no pueden ir antes de un espacio: el espacio queda afuera
    if (opening.length && !isCode) {
      const leading = /^\s+/.exec(value)?.[0] ?? ''
      if (leading && !lineStart) out += leading
      value = value.slice(leading.length)
      // Solo espacios: no hace falta abrir las marcas
      if (!value) continue
    }
    const atLineStart = lineStart && opening.length === 0
    for (const mark of opening) {
      if (mark.type === 'link') out += '['
      else if (mark.type !== 'code') out += DELIMITERS[mark.type]
    }
    active = marks

    if (isCode) {
      out += codeSpan(table ? value.replace(/\|/g, '\\|') : value)
    } else {
      out += value
        .split('\n')
        .map((line, lineIndex) => {
          let escaped = escapeText(line)
          if (table) escaped = escaped.replace(/\|/g, '\\|')
          // Al principio de una línea: sin sangría (sería un bloque de código) y sin «# », «- »…
          if (lineIndex > 0 || atLineStart) escaped = escapeLineStart(escaped.replace(/^[ \t]+/, ''))
          return escaped
        })
        .join(singleLine ? ' ' : '\n')
    }
    lineStart = false
  }
  close(active.length)
  return out
}

const indent = (value, width) =>
  value
    .split('\n')
    .map((line, index) => (index === 0 || !line ? line : ' '.repeat(width) + line))
    .join('\n')

/** Bloques dentro de un elemento de lista: una sublista va pegada al texto (la lista sigue compacta). */
function itemBlocks(nodes = []) {
  return nodes.reduce((out, node, index) => {
    const value = serializeBlock(node, nodes, index)
    if (index === 0) return value
    const isList = ['bulletList', 'orderedList', 'taskList'].includes(node.type)
    return `${out}${isList ? '\n' : '\n\n'}${value}`
  }, '')
}

function serializeList(node, siblings, index) {
  // Dos listas del mismo tipo seguidas se unirían en una: la segunda cambia de viñeta
  const previous = siblings?.[index - 1]
  const alternate = previous?.type === node.type
  const items = node.content ?? []
  return items
    .map((item, itemIndex) => {
      let marker
      if (node.type === 'orderedList') marker = `${(node.attrs?.start ?? 1) + itemIndex}${alternate ? ')' : '.'} `
      else if (node.type === 'taskList') marker = `${alternate ? '*' : '-'} [${item.attrs?.checked ? 'x' : ' '}] `
      else marker = `${alternate ? '*' : '-'} `
      const body = itemBlocks(item.content)
      const width = node.type === 'taskList' ? 2 : marker.length
      return (marker + indent(body, width)).trimEnd()
    })
    .join('\n')
}

/** Bloques con texto directo (párrafo, título, código): el resto (listas, citas) contiene otros bloques. */
const hasInlineContent = (block) => (block.content ?? []).some((child) => child.type === 'text' || child.type === 'mention' || child.type === 'hardBreak')

/**
 * Texto de un bloque dentro de una celda (una sola línea). El editor solo deja párrafos en las celdas; si llega otra
 * cosa (una lista, una cita), se aplana en vez de perderla: «• uno • dos».
 */
function cellBlockText(block) {
  if (!block.content?.length) return ''
  if (hasInlineContent(block)) return serializeInline(block.content, { table: true })
  return block.content
    .map((child) => {
      const text = cellBlockText(child)
      return text && (child.type === 'listItem' || child.type === 'taskItem') ? `• ${text}` : text
    })
    .filter(Boolean)
    .join(' ')
}

function serializeTable(node) {
  const rows = (node.content ?? []).map((row) =>
    (row.content ?? []).map((cell) =>
      (cell.content ?? [])
        .map(cellBlockText)
        .filter(Boolean)
        .join(' ')
        .trim(),
    ),
  )
  if (!rows.length) return ''
  const columns = Math.max(...rows.map((row) => row.length), 1)
  const line = (cells) => `| ${Array.from({ length: columns }, (_, index) => cells[index] || ' ').join(' | ')} |`
  return [line(rows[0]), line(Array(columns).fill('---')), ...rows.slice(1).map(line)].join('\n')
}

function serializeCode(node) {
  const value = (node.content ?? []).map((child) => child.text ?? '').join('')
  // Una cerca se cierra con hasta 3 espacios delante (CommonMark): esas también cuentan
  const longest = Math.max(2, ...(value.match(/^ {0,3}`{3,}/gm) ?? []).map((run) => run.trimStart().length))
  const fence = '`'.repeat(longest + 1)
  return `${fence}${node.attrs?.language ?? ''}\n${value}\n${fence}`
}

/**
 * Imagen subida → `![nombre](/files/<id> "pie de foto")` (con `#full` si va a todo el ancho). Una que todavía se está
 * subiendo (su vista previa es un `blob:`) no se guarda: «el texto se guarda igual» y la imagen entra al terminar.
 * @param {DocNode} node
 */
export function serializeImage(node) {
  const reference = parseFileReference(node.attrs?.src)
  if (!reference || node.attrs?.uploadId) return ''
  const alt = (node.attrs?.alt ?? '').replace(/[\r\n]+/g, ' ').replace(/([\\[\]])/g, '\\$1').trim()
  const title = (node.attrs?.title ?? '').replace(/[\r\n]+/g, ' ').trim()
  const src = fileReference(reference.id, { wide: Boolean(node.attrs?.wide) })
  return `![${alt}](${src}${title ? ` "${title.replace(/(["\\])/g, '\\$1')}"` : ''})`
}

/** @param {DocNode} node */
function serializeBlock(node, siblings, index) {
  switch (node.type) {
    case 'image':
      return serializeImage(node)
    case 'paragraph':
      return serializeInline(node.content)
    case 'heading': {
      const level = Math.min(Math.max(node.attrs?.level ?? 1, 1), 6)
      return `${'#'.repeat(level)} ${serializeInline(node.content, { heading: true }).trim()}`.trimEnd()
    }
    case 'blockquote':
      return serializeBlocks(node.content)
        .split('\n')
        .map((line) => (line ? `> ${line}` : '>'))
        .join('\n')
    case 'codeBlock':
      return serializeCode(node)
    case 'horizontalRule':
      return '---'
    case 'bulletList':
    case 'orderedList':
    case 'taskList':
      return serializeList(node, siblings, index)
    case 'table':
      return serializeTable(node)
    default:
      return node.content ? serializeBlocks(node.content) : ''
  }
}

/** Bloques separados por una línea en blanco; los párrafos vacíos no se guardan. */
function serializeBlocks(nodes = []) {
  return nodes
    .map((node, index) => serializeBlock(node, nodes, index))
    .filter((value) => value.trim() !== '')
    .join('\n\n')
}

/**
 * Documento → Markdown (sin espacios ni líneas en blanco al principio o al final).
 * @param {DocNode} doc
 */
export function docToMarkdown(doc) {
  return serializeBlocks(doc?.content ?? []).replace(/\s+$/, '').replace(/^\n+/, '')
}
