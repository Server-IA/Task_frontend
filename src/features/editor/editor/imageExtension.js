import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { fileReference, parseFileReference, rememberPreview } from '@/features/files/fileRefs'
import { ImageNodeView } from './ImageNodeView'

/**
 * Imagen subida, como bloque: `src` es la referencia `/files/<id>` (o, mientras sube, su vista previa `blob:` con el id
 * de la subida en `uploadId`); `alt` es el nombre del archivo, `title` el pie de foto y `wide` si va a todo el ancho. Se
 * guarda como `![nombre](/files/<id> "pie")` (ver serialize.js); una que todavía sube no se guarda.
 */
export const ImageBlock = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      title: { default: null },
      wide: { default: false },
      uploadId: { default: null },
    }
  },

  // Solo las imágenes copiadas de otro editor de TaskFlow (las de otros sitios no se cargan ni se suben solas)
  parseHTML() {
    return [
      {
        tag: 'img[data-tf-file]',
        getAttrs: (element) => {
          const reference = parseFileReference(element.getAttribute('data-tf-file'))
          if (!reference) return false
          return {
            src: fileReference(reference.id),
            alt: element.getAttribute('alt') ?? '',
            title: element.getAttribute('title') || null,
            wide: reference.wide || element.hasAttribute('data-wide'),
          }
        },
      },
    ]
  },

  renderHTML({ node }) {
    return ['img', { 'data-tf-file': node.attrs.src, alt: node.attrs.alt, title: node.attrs.title, ...(node.attrs.wide ? { 'data-wide': '' } : {}) }]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  },
})

/**
 * Pone al día las imágenes que se están subiendo según la cola: la que terminó pasa a su referencia definitiva (la vista
 * previa local se sigue usando, sin otra descarga) y la que se canceló se quita. No entra en el historial de deshacer:
 * deshacer quita la imagen pegada, no la subida.
 * @param {import('@tiptap/core').Editor} editor
 * @param {(id: string) => import('@/features/files/uploadQueue').UploadTask | undefined} getTask
 * @returns {number} imágenes que siguen subiendo (o en cola)
 */
export function syncUploadingImages(editor, getTask) {
  if (!editor || editor.isDestroyed) return 0
  const { state } = editor
  const changes = []
  let pending = 0
  state.doc.descendants((node, pos) => {
    if (node.type.name !== 'image' || !node.attrs.uploadId) return true
    const task = getTask(node.attrs.uploadId)
    if (!task) changes.push({ pos, node, remove: true })
    else if (task.status === 'done' && task.result?.id) changes.push({ pos, node, fileId: task.result.id })
    else if (task.status !== 'error') pending += 1
    return false
  })
  if (changes.length) {
    const tr = state.tr
    // De atrás para adelante: borrar no mueve las posiciones de las anteriores
    changes.reverse().forEach(({ pos, node, remove, fileId }) => {
      if (remove) {
        tr.delete(pos, pos + node.nodeSize)
      } else {
        rememberPreview(fileId, node.attrs.src)
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: fileReference(fileId), uploadId: null })
      }
    })
    tr.setMeta('addToHistory', false)
    editor.view.dispatch(tr)
  }
  return pending
}
