/**
 * Historia de usuario: una cita que empieza con «**Como** … **quiero** … **para** …» se dibuja como la tarjeta
 * Como / quiero / para. Las tres palabras van en negrita (así una cita cualquiera que diga «como» no cambia);
 * pueden ir en una línea o en varias, y la negrita puede seguir con el texto («**Como persona registrada**»).
 */

const KEYWORDS = ['como', 'quiero', 'para']

/** Trozos de texto de la cita, con si van en negrita. Las menciones quedan como «@Nombre». */
function pieces(blockquote) {
  const result = []
  for (const block of blockquote.content ?? []) {
    if (block.type !== 'paragraph') return null
    if (result.length) result.push({ text: '\n', bold: false })
    for (const node of block.content ?? []) {
      if (node.type === 'text') result.push({ text: node.text, bold: Boolean(node.marks?.some((mark) => mark.type === 'bold')) })
      else if (node.type === 'hardBreak') result.push({ text: '\n', bold: false })
      else if (node.type === 'mention') result.push({ text: `@${node.attrs?.label ?? ''}`, bold: false })
    }
  }
  return result
}

const tidy = (value) => value.replace(/\s+/g, ' ').trim().replace(/^[:,]\s*/, '')

/**
 * Las tres partes de la historia, o `null` si la cita no sigue el patrón.
 * @param {import('./parse').DocNode} blockquote nodo `blockquote`
 * @returns {{ como: string, quiero: string, para: string } | null}
 */
export function parseUserStory(blockquote) {
  if (blockquote?.type !== 'blockquote') return null
  const parts = pieces(blockquote)
  if (!parts) return null
  const values = []
  for (const piece of parts) {
    const next = KEYWORDS[values.length]
    const match = next && piece.bold ? new RegExp(`^\\s*${next}(?![\\p{L}\\p{N}])`, 'iu').exec(piece.text) : null
    if (match) {
      values.push(piece.text.slice(match[0].length))
    } else if (values.length === 0) {
      // Antes de «Como» solo puede haber espacios
      if (piece.text.trim()) return null
    } else {
      values[values.length - 1] += piece.text
    }
  }
  if (values.length < KEYWORDS.length) return null
  const [como, quiero, para] = values.map(tidy)
  return { como, quiero, para }
}
