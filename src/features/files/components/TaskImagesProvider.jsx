import { useMemo, useState } from 'react'
import { useComments } from '@/features/comments/hooks'
import { markdownToDoc } from '@/features/editor/markdown/parse'
import { parseFileReference } from '../fileRefs'
import { useAttachments } from '../hooks'
import { ImageViewerContext } from '../imageViewerContext'
import { ImageViewer } from './ImageViewer'

/** Imágenes subidas de un Markdown, en orden: `[{ id, name, title }]`. */
export function markdownImages(markdown) {
  if (!markdown || !markdown.includes('/files/')) return []
  const found = []
  const visit = (node) => {
    if (node.type === 'image') {
      const reference = parseFileReference(node.attrs?.src)
      if (reference) found.push({ id: reference.id, name: node.attrs?.alt || 'imagen' })
      return
    }
    node.content?.forEach(visit)
  }
  visit(markdownToDoc(markdown))
  return found
}

/**
 * Todas las imágenes de la tarea para el visor, en el orden de la tarea: primero las de la descripción, luego las de
 * Adjuntos y luego las de los comentarios (sin repetir).
 * @returns {import('./ImageViewer').ViewerImage[]}
 */
export function taskImages({ description, attachments = [], comments = [] }) {
  const seen = new Set()
  const images = []
  const push = (image) => {
    if (seen.has(image.id)) return
    seen.add(image.id)
    images.push(image)
  }
  markdownImages(description).forEach((image) => push({ ...image, group: 'descripción' }))
  attachments
    .filter((file) => file.image)
    .forEach((file) => push({ id: file.id.toLowerCase(), name: file.fileName, group: 'adjuntos', size: file.size, author: file.uploadedBy, createdAt: file.createdAt }))
  comments.forEach((comment) =>
    markdownImages(comment.body).forEach((image) => push({ ...image, group: 'comentarios', author: comment.author, createdAt: comment.createdAt })),
  )
  return images
}

/**
 * Da el visor de imágenes a todo lo que se dibuja dentro de la tarea (la descripción, Adjuntos y los comentarios): un
 * clic en cualquier imagen lo abre en ella y se recorren todas.
 * @param {{ slug: string, projectId: string, issue?: import('@/api/types').IssueResponse | null, children: import('react').ReactNode }} props
 */
export function TaskImagesProvider({ slug, projectId, issue, children }) {
  const { data: attachments } = useAttachments(slug, projectId, issue?.id)
  const { data: comments } = useComments(slug, projectId, issue?.id)
  const [openId, setOpenId] = useState(null)
  const images = useMemo(
    () => taskImages({ description: issue?.description, attachments: attachments ?? [], comments: comments ?? [] }),
    [issue?.description, attachments, comments],
  )
  const viewer = useMemo(() => ({ open: (fileId) => setOpenId(fileId.toLowerCase()) }), [])
  const index = openId ? images.findIndex((image) => image.id === openId) : -1

  return (
    <ImageViewerContext.Provider value={viewer}>
      {children}
      {openId && (
        <ImageViewer
          images={index >= 0 ? images : [{ id: openId, name: 'imagen', group: 'descripción' }]}
          index={Math.max(0, index)}
          issueCode={issue?.code}
          onIndexChange={(next) => setOpenId(images[next]?.id ?? openId)}
          onClose={() => setOpenId(null)}
        />
      )}
    </ImageViewerContext.Provider>
  )
}
