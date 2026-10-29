import { markdownToDoc } from './parse'

/**
 * Markdown → texto plano para los lugares que muestran un extracto (la Bandeja, el feed de Actividad, avisos):
 * sin «**», «##», «- [ ]» ni tablas a la vista.
 */

const BLOCKS_WITH_TEXT = new Set(['paragraph', 'heading', 'codeBlock'])

/**
 * @param {import('./parse').DocNode} doc
 * @param {{ mentionTokens?: boolean }} options
 * @returns {string[]} una entrada por bloque con texto
 */
function blockTexts(doc, { mentionTokens }) {
  const lines = []
  const inlineText = (nodes = []) =>
    nodes
      .map((node) => {
        if (node.type === 'text') return node.text
        if (node.type === 'hardBreak') return '\n'
        if (node.type === 'mention') {
          const label = node.attrs?.label ?? ''
          return mentionTokens ? `@[${label}](${node.attrs?.id})` : `@${label}`
        }
        return ''
      })
      .join('')
  const visit = (node) => {
    if (node.type === 'codeBlock') {
      lines.push((node.content ?? []).map((child) => child.text ?? '').join(''))
      return
    }
    if (BLOCKS_WITH_TEXT.has(node.type)) {
      lines.push(inlineText(node.content))
      return
    }
    if (node.type === 'tableRow') {
      lines.push(
        (node.content ?? [])
          .map((cell) => (cell.content ?? []).map((block) => inlineText(block.content)).join(' ').trim())
          .filter(Boolean)
          .join(' · '),
      )
      return
    }
    node.content?.forEach(visit)
  }
  visit(doc)
  return lines.map((line) => line.trim()).filter(Boolean)
}

/** Restos de formato de un texto que llegó cortado («**negr…», «~~tach…»). */
const cleanLeftovers = (value) =>
  value
    .replace(/(\*\*|__|~~)/g, '')
    .replace(/(^|\s)#{1,6}\s+/g, '$1')
    .replace(/`+/g, '')

/**
 * Texto plano de un Markdown. Por defecto, en una sola línea (los bloques separados por espacios); con
 * `singleLine: false`, un bloque por línea. `mentionTokens` deja las menciones como `@[Nombre](id)` (para dibujarlas
 * con MentionText); si no, quedan como «@Nombre». `maxLength` corta con «…».
 * @param {string | null | undefined} markdown
 * @param {{ singleLine?: boolean, mentionTokens?: boolean, maxLength?: number }} [options]
 */
export function markdownToPlainText(markdown, { singleLine = true, mentionTokens = false, maxLength } = {}) {
  if (!markdown) return ''
  const lines = blockTexts(markdownToDoc(markdown), { mentionTokens }).map(cleanLeftovers)
  let text = singleLine ? lines.join(' ').replace(/\s+/g, ' ').trim() : lines.join('\n')
  if (maxLength && text.length > maxLength) text = `${text.slice(0, maxLength).trimEnd()}…`
  return text
}
