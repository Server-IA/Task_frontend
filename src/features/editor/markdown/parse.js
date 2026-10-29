import { Marked } from 'marked'

/**
 * Markdown guardado → documento del editor (el JSON de TipTap/ProseMirror). Lo usan el editor y la vista de lectura,
 * así las dos dibujan exactamente lo mismo.
 *
 * - GFM: tablas, tachado, listas de tareas y enlaces sueltos (https://…).
 * - Un salto de línea simple es un salto de línea (como en los comentarios de GitHub): las descripciones y los
 *   comentarios de antes eran texto plano y se siguen viendo igual.
 * - El HTML no se interpreta: se muestra tal cual, como texto.
 * - Las menciones `@[Nombre](id)` son nodos `mention`. Los códigos de tarea («WEB-12») quedan como texto: la vista
 *   los dibuja como pastilla si la tarea existe.
 */

/** @typedef {{ type: string, attrs?: Record<string, any>, content?: DocNode[], text?: string, marks?: Mark[] }} DocNode */
/** @typedef {{ type: string, attrs?: Record<string, any> }} Mark */

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
const MENTION = new RegExp(`^@\\[([^\\]\\r\\n]{1,200})\\]\\((${UUID})\\)`)

const mentionExtension = {
  name: 'mention',
  level: 'inline',
  start(src) {
    const index = src.indexOf('@[')
    return index < 0 ? undefined : index
  },
  tokenizer(src) {
    const match = MENTION.exec(src)
    if (match) return { type: 'mention', raw: match[0], label: match[1], id: match[2] }
    return undefined
  },
}

const marked = new Marked({ gfm: true, breaks: true, extensions: [mentionExtension] })

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', laquo: '«', raquo: '»', copy: '©', reg: '®' }

/** `&amp;`, `&#39;`, `&#x1F600;` → el carácter (marked deja las entidades tal cual en el texto). */
export function decodeEntities(text = '') {
  return text.replace(/&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z]+));/g, (match, dec, hex, name) => {
    if (dec || hex) {
      const code = dec ? Number(dec) : parseInt(hex, 16)
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
    }
    return NAMED_ENTITIES[name] ?? match
  })
}

const text = (value, marks) => (value ? { type: 'text', text: value, ...(marks.length ? { marks } : {}) } : null)
const paragraph = (content = []) => (content.length ? { type: 'paragraph', content } : { type: 'paragraph' })

/** Une los textos seguidos con las mismas marcas. */
function mergeText(nodes) {
  const result = []
  for (const node of nodes) {
    if (!node) continue
    const previous = result.at(-1)
    if (node.type === 'text' && previous?.type === 'text' && sameMarks(previous.marks, node.marks)) {
      previous.text += node.text
    } else {
      result.push({ ...node })
    }
  }
  return result
}

function sameMarks(a = [], b = []) {
  return a.length === b.length && a.every((mark, index) => mark.type === b[index].type && mark.attrs?.href === b[index].attrs?.href)
}

const withMark = (marks, mark) => (marks.some((current) => current.type === mark.type) ? marks : [...marks, mark])

/** Tokens en línea de marked → nodos en línea (texto con marcas, saltos de línea y menciones). */
function inline(tokens = [], marks = []) {
  const nodes = []
  for (const token of tokens) {
    switch (token.type) {
      case 'text':
        if (token.tokens?.length) nodes.push(...inline(token.tokens, marks))
        else nodes.push(text(decodeEntities(token.text), marks))
        break
      case 'escape':
        nodes.push(text(token.text, marks))
        break
      case 'strong':
        nodes.push(...inline(token.tokens, withMark(marks, { type: 'bold' })))
        break
      case 'em':
        nodes.push(...inline(token.tokens, withMark(marks, { type: 'italic' })))
        break
      case 'del':
        nodes.push(...inline(token.tokens, withMark(marks, { type: 'strike' })))
        break
      case 'codespan':
        nodes.push(text(decodeEntities(token.text), withMark(marks, { type: 'code' })))
        break
      case 'link':
        nodes.push(...inline(token.tokens, withMark(marks, { type: 'link', attrs: { href: token.href } })))
        break
      case 'image':
        // Las imágenes llegan con la subida de archivos: por ahora, un enlace con su texto alternativo
        nodes.push(text(token.text || token.href, withMark(marks, { type: 'link', attrs: { href: token.href } })))
        break
      case 'br':
        nodes.push({ type: 'hardBreak' })
        break
      case 'mention':
        nodes.push({ type: 'mention', attrs: { id: token.id, label: token.label } })
        break
      case 'checkbox':
        // La casilla de una lista de tareas «suelta» (con líneas en blanco, por ejemplo con una tabla dentro) llega
        // dentro del primer párrafo: ya está en el elemento de la lista (`item.task`), no es texto
        break
      case 'html':
        // El HTML no se interpreta
        nodes.push(text(token.raw ?? token.text, marks))
        break
      default:
        nodes.push(text(token.raw ?? token.text ?? '', marks))
    }
  }
  return mergeText(nodes)
}

/** Texto con saltos de línea → nodos en línea con hardBreak (para HTML en bloque y casos raros). */
function literalLines(value) {
  const lines = value.replace(/\n+$/, '').split('\n')
  return lines.flatMap((line, index) => [...(index > 0 ? [{ type: 'hardBreak' }] : []), ...(line ? [{ type: 'text', text: line }] : [])])
}

/** Contenido de un elemento de lista: siempre empieza con un párrafo (lo pide el esquema del editor). */
function listItemContent(tokens, prefix = '') {
  const blocks = blocksOf(tokens.filter((token) => token.type !== 'checkbox'))
  if (blocks[0]?.type !== 'paragraph') blocks.unshift(paragraph())
  if (prefix) blocks[0] = paragraph(mergeText([{ type: 'text', text: prefix }, ...(blocks[0].content ?? [])]))
  return blocks
}

function list(token) {
  const allTasks = token.items.length > 0 && token.items.every((item) => item.task)
  if (allTasks) {
    return {
      type: 'taskList',
      content: token.items.map((item) => ({
        type: 'taskItem',
        attrs: { checked: Boolean(item.checked) },
        content: listItemContent(item.tokens),
      })),
    }
  }
  const items = token.items.map((item) => ({
    type: 'listItem',
    // En una lista mezclada, la casilla queda escrita como texto
    content: listItemContent(item.tokens, item.task ? (item.checked ? '[x] ' : '[ ] ') : ''),
  }))
  if (token.ordered) {
    const start = Number(token.start) || 1
    return { type: 'orderedList', attrs: { start }, content: items }
  }
  return { type: 'bulletList', content: items }
}

function tableCell(type, cell) {
  return { type, content: [paragraph(inline(cell.tokens))] }
}

function table(token) {
  const header = { type: 'tableRow', content: token.header.map((cell) => tableCell('tableHeader', cell)) }
  const rows = token.rows.map((row) => ({ type: 'tableRow', content: row.map((cell) => tableCell('tableCell', cell)) }))
  return { type: 'table', content: [header, ...rows] }
}

/** Tokens de bloque de marked → nodos de bloque. */
function blocksOf(tokens = []) {
  const blocks = []
  for (const token of tokens) {
    switch (token.type) {
      case 'space':
      case 'def':
        break
      case 'paragraph':
        blocks.push(paragraph(inline(token.tokens)))
        break
      case 'text':
        // Dentro de las listas compactas, el texto viene sin párrafo
        blocks.push(paragraph(token.tokens ? inline(token.tokens) : literalLines(decodeEntities(token.text))))
        break
      case 'heading':
        blocks.push({ type: 'heading', attrs: { level: Math.min(Math.max(token.depth, 1), 3) }, content: inline(token.tokens) })
        break
      case 'code': {
        const code = token.text ?? ''
        const node = { type: 'codeBlock', attrs: { language: token.lang?.trim().split(/\s+/)[0] || null } }
        blocks.push(code ? { ...node, content: [{ type: 'text', text: code }] } : node)
        break
      }
      case 'blockquote': {
        const content = blocksOf(token.tokens)
        blocks.push({ type: 'blockquote', content: content.length ? content : [paragraph()] })
        break
      }
      case 'hr':
        blocks.push({ type: 'horizontalRule' })
        break
      case 'list':
        blocks.push(list(token))
        break
      case 'table':
        blocks.push(table(token))
        break
      case 'html':
        blocks.push(paragraph(literalLines(token.raw ?? token.text ?? '')))
        break
      default:
        if (token.raw?.trim()) blocks.push(paragraph(literalLines(token.raw)))
    }
  }
  return blocks
}

/**
 * Markdown → documento (`{ type: 'doc', content: [...] }`). Un texto vacío da un documento con un párrafo vacío.
 * @param {string | null | undefined} markdown
 * @returns {DocNode}
 */
export function markdownToDoc(markdown) {
  const source = (markdown ?? '').replace(/\r\n?/g, '\n')
  const content = source.trim() ? blocksOf(marked.lexer(source)) : []
  return { type: 'doc', content: content.length ? content : [paragraph()] }
}
