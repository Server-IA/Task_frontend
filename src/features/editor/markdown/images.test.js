import { describe, expect, it } from 'vitest'
import { taskImages } from '@/features/files/components/TaskImagesProvider'
import { markdownToDoc } from './parse'
import { docToPlainText } from './plainText'
import { docToMarkdown } from './serialize'

const ID = '3f2a1b4c-0000-4000-8000-000000000001'
const OTHER = '3f2a1b4c-0000-4000-8000-000000000002'
const roundTrip = (markdown) => docToMarkdown(markdownToDoc(markdown))

describe('imágenes en el Markdown', () => {
  it('una imagen subida es un bloque con su nombre, su pie de foto y su ancho', () => {
    const doc = markdownToDoc(`Antes\n\n![mockup perfil.png](/files/${ID}#full "El botón queda presionado")\n\nDespués`)
    expect(doc.content.map((node) => node.type)).toEqual(['paragraph', 'image', 'paragraph'])
    expect(doc.content[1].attrs).toEqual({ src: `/files/${ID}`, alt: 'mockup perfil.png', title: 'El botón queda presionado', wide: true })
  })

  it('se guarda igual que se leyó (referencia estable, nunca una URL que vence)', () => {
    const markdown = `Antes\n\n![captura-2026-10-30-1042.png](/files/${ID})\n\n![b.png](/files/${OTHER}#full "pie \\"citado\\"")\n\nDespués`
    expect(roundTrip(markdown)).toBe(markdown)
    expect(roundTrip(roundTrip(markdown))).toBe(markdown)
  })

  it('una imagen dentro de un párrafo queda en su propio bloque', () => {
    expect(roundTrip(`Mira esto:\n![a.png](/files/${ID})\ny esto`)).toBe(`Mira esto:\n\n![a.png](/files/${ID})\n\ny esto`)
  })

  it('las imágenes de otros sitios no se cargan: quedan como enlace', () => {
    const doc = markdownToDoc('![rastreo](https://otro.sitio/pixel.png)')
    expect(doc.content[0].type).toBe('paragraph')
    expect(doc.content[0].content[0].marks[0]).toEqual({ type: 'link', attrs: { href: 'https://otro.sitio/pixel.png' } })
  })

  it('una imagen que todavía sube no se guarda (el texto sí)', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Pasa en Safari' }] },
        { type: 'image', attrs: { src: 'blob:http://localhost/123', alt: 'captura.png', uploadId: 'upload-1' } },
      ],
    }
    expect(docToMarkdown(doc)).toBe('Pasa en Safari')
  })

  it('escapa el nombre para no romper el Markdown', () => {
    const doc = { type: 'doc', content: [{ type: 'image', attrs: { src: `/files/${ID}`, alt: 'a [b] c.png', title: null, wide: false } }] }
    const markdown = docToMarkdown(doc)
    expect(markdown).toBe(`![a \\[b\\] c.png](/files/${ID})`)
    expect(markdownToDoc(markdown).content[0].attrs.alt).toBe('a [b] c.png')
  })

  it('en un extracto se ven como [imagen: nombre]', () => {
    expect(docToPlainText(markdownToDoc(`Así quedó\n\n![arreglo.png](/files/${ID})`))).toBe('Así quedó [imagen: arreglo.png]')
  })
})

describe('imágenes de la tarea para el visor', () => {
  it('en orden: descripción, adjuntos y comentarios, sin repetir', () => {
    const images = taskImages({
      description: `![flujo.png](/files/${ID})`,
      attachments: [
        { id: OTHER, fileName: 'mockup.png', image: true, size: 1800, uploadedBy: { fullName: 'Ana' }, createdAt: '2026-10-30T10:00:00Z' },
        { id: 'pdf', fileName: 'requisitos.pdf', image: false },
      ],
      comments: [{ body: `![safari.png](/files/${ID}) otra vez`, author: { fullName: 'Luis' }, createdAt: '2026-10-30T11:00:00Z' }],
    })
    expect(images.map((image) => [image.id, image.name, image.group])).toEqual([
      [ID, 'flujo.png', 'descripción'],
      [OTHER, 'mockup.png', 'adjuntos'],
    ])
  })
})
