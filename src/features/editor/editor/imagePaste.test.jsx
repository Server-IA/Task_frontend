import { act, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { uploadQueue } from '@/features/files/uploadQueue'
import { docToMarkdown } from '../markdown/serialize'
import RichEditor from './RichEditor'

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() }) }))

const FILE_ID = '3f2a1b4c-0000-4000-8000-0000000000aa'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Range.prototype.getBoundingClientRect ??= () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 })
  Range.prototype.getClientRects ??= () => []
  document.elementFromPoint ??= () => null
  URL.createObjectURL ??= () => 'blob:http://localhost/vista-previa'
})

afterEach(() => {
  uploadQueue.getSnapshot().forEach((task) => uploadQueue.cancel(task.id))
  vi.restoreAllMocks()
})

async function mount(props) {
  const onChange = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <RichEditor value="Texto" onChange={onChange} {...props} />
      </TooltipProvider>
    </QueryClientProvider>,
  )
  const editor = await waitFor(() => {
    const found = document.querySelector('.ProseMirror')?.editor
    if (!found) throw new Error('sin editor')
    return found
  })
  return { editor, onChange }
}

/** Un evento de pegar con archivos (y texto) en el portapapeles. */
function pasteEvent(files, text = '') {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  event.clipboardData = { files, getData: (type) => (type === 'text/plain' ? text : '') }
  return event
}

const png = (name = 'image.png', size = 2048) => new File([new Uint8Array(size)], name, { type: 'image/png' })

describe('imágenes en el editor', () => {
  it('pegar una captura la inserta con su vista previa y la sube; al terminar queda la referencia', async () => {
    // La subida queda en curso hasta que la prueba la termine
    let finish
    const target = {
      create: vi.fn(async () => ({ file: { id: FILE_ID }, url: 'https://r2/x', headers: {} })),
      confirm: vi.fn(() => new Promise((resolve) => (finish = () => resolve({ id: FILE_ID })))),
    }
    vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(function open() {})
    vi.spyOn(XMLHttpRequest.prototype, 'setRequestHeader').mockImplementation(() => {})
    vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(function send() {
      Object.defineProperty(this, 'status', { value: 200 })
      setTimeout(() => this.onload())
    })
    const onUploadsChange = vi.fn()
    const { editor, onChange } = await mount({ imageUpload: { target }, onUploadsChange })

    act(() => {
      editor.view.dom.dispatchEvent(pasteEvent([png()]))
    })

    const image = () => editor.getJSON().content.find((node) => node.type === 'image')
    expect(image().attrs).toMatchObject({ src: expect.stringMatching(/^blob:/), uploadId: expect.any(String) })
    expect(image().attrs.alt).toMatch(/^captura-\d{4}-\d{2}-\d{2}-\d{4}\.png$/)
    expect(target.create).toHaveBeenCalledWith(expect.objectContaining({ contentType: 'image/png', size: 2048 }), expect.any(File))
    // Mientras sube, el Markdown no la lleva y se avisa que hay 1 subiendo
    expect(docToMarkdown(editor.getJSON())).toBe('Texto')
    await waitFor(() => expect(onUploadsChange).toHaveBeenLastCalledWith(1))

    await waitFor(() => expect(finish).toBeTypeOf('function'))
    await act(async () => finish())
    await waitFor(() => expect(image().attrs.uploadId).toBeNull())
    expect(image().attrs.src).toBe(`/files/${FILE_ID}`)
    expect(docToMarkdown(editor.getJSON())).toMatch(new RegExp(`!\\[captura-[^\\]]+\\.png\\]\\(/files/${FILE_ID}\\)`))
    expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining(`/files/${FILE_ID}`))
    await waitFor(() => expect(onUploadsChange).toHaveBeenLastCalledWith(0))
  })

  it('una imagen demasiado grande no se pega y lo dice', async () => {
    const { toast } = await import('sonner')
    const target = { create: vi.fn(), confirm: vi.fn() }
    const { editor } = await mount({ imageUpload: { target } })

    act(() => {
      editor.view.dom.dispatchEvent(pasteEvent([png('hero.png', 7.2 * 1024 * 1024)]))
    })

    expect(toast.error).toHaveBeenCalledWith('La imagen pesa 7,2 MB y el límite es 5 MB. No se pegó.')
    expect(editor.getJSON().content.some((node) => node.type === 'image')).toBe(false)
    expect(target.create).not.toHaveBeenCalled()
  })

  it('cancelar la subida quita la imagen', async () => {
    const target = { create: vi.fn(() => new Promise(() => {})), confirm: vi.fn() }
    const { editor } = await mount({ imageUpload: { target } })
    act(() => {
      editor.view.dom.dispatchEvent(pasteEvent([png('a.png')]))
    })
    const uploadId = editor.getJSON().content.find((node) => node.type === 'image').attrs.uploadId

    act(() => uploadQueue.cancel(uploadId))

    await waitFor(() => expect(editor.getJSON().content.some((node) => node.type === 'image')).toBe(false))
  })

  it('lo que no es imagen va a onOtherFiles (en la descripción, a Adjuntos)', async () => {
    const onOtherFiles = vi.fn()
    const target = { create: vi.fn(() => new Promise(() => {})), confirm: vi.fn() }
    const { editor } = await mount({ imageUpload: { target, onOtherFiles } })
    const pdf = new File(['%PDF'], 'requisitos.pdf', { type: 'application/pdf' })

    act(() => {
      editor.view.dom.dispatchEvent(pasteEvent([pdf]))
    })

    expect(onOtherFiles).toHaveBeenCalledWith([pdf])
    expect(target.create).not.toHaveBeenCalled()
  })

  it('soltar una imagen sobre el editor la inserta ahí y no llega al panel', async () => {
    const target = { create: vi.fn(() => new Promise(() => {})), confirm: vi.fn() }
    const { editor } = await mount({ imageUpload: { target } })
    editor.view.posAtCoords = () => ({ pos: 1, inside: -1 })
    const panelDrop = vi.fn()
    document.body.addEventListener('drop', panelDrop)
    const event = new Event('drop', { bubbles: true, cancelable: true })
    event.dataTransfer = { files: [png('soltada.png')], types: ['Files'], getData: () => '' }
    event.clientX = 10
    event.clientY = 10

    act(() => {
      editor.view.dom.dispatchEvent(event)
    })

    expect(editor.getJSON().content.some((node) => node.type === 'image' && node.attrs.alt === 'soltada.png')).toBe(true)
    expect(event.defaultPrevented).toBe(true)
    expect(panelDrop).not.toHaveBeenCalled()
    document.body.removeEventListener('drop', panelDrop)
  })

  it('sin subida de imágenes (fuera de una tarea), pegar una imagen no hace nada', async () => {
    const { editor } = await mount({})
    act(() => {
      editor.view.dom.dispatchEvent(pasteEvent([png()]))
    })
    expect(editor.getJSON().content.some((node) => node.type === 'image')).toBe(false)
    expect(uploadQueue.getSnapshot()).toHaveLength(0)
  })

  it('pegar texto con una imagen de Word pega el texto, no la imagen', async () => {
    const target = { create: vi.fn(), confirm: vi.fn() }
    const { editor } = await mount({ imageUpload: { target } })
    act(() => {
      editor.view.dom.dispatchEvent(pasteEvent([png()], 'Un párrafo copiado de Word'))
    })
    expect(target.create).not.toHaveBeenCalled()
    expect(editor.getJSON().content.some((node) => node.type === 'image')).toBe(false)
  })
})
