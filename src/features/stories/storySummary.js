import { parseUserStory } from '@/features/editor/markdown/userStory'
import { markdownToDoc } from '@/features/editor/markdown/parse'
import { docToPlainText } from '@/features/editor/markdown/plainText'

/**
 * Extracto de una historia para su fila en «Historias». Si la descripción tiene la cita «Como … quiero … para …»,
 * va lo que se escribió en ella («Como admin, quiero exportar, para auditar»); el esqueleto de la plantilla, vacío,
 * no se muestra («Como quiero para» no dice nada). Si no, el texto del resto de la descripción.
 * @param {string | null | undefined} markdown
 * @param {number} [maxLength]
 */
export function storySummary(markdown, maxLength = 140) {
  if (!markdown?.trim()) return ''
  const doc = markdownToDoc(markdown)
  const blocks = doc.content ?? []
  const index = blocks.findIndex((block) => parseUserStory(block))
  if (index >= 0) {
    const { como, quiero, para } = parseUserStory(blocks[index])
    const story = [como && `Como ${como}`, quiero && `quiero ${quiero}`, para && `para ${para}`].filter(Boolean).join(', ')
    if (story) return story.length > maxLength ? `${story.slice(0, maxLength).trimEnd()}…` : story
  }
  const rest = index >= 0 ? { ...doc, content: blocks.filter((_, at) => at !== index) } : doc
  return docToPlainText(rest, { maxLength })
}
