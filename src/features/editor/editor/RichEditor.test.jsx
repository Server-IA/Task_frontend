import { act, render, screen, waitFor } from '@testing-library/react'
import { TextSelection } from '@tiptap/pm/state'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { docToMarkdown } from '../markdown/serialize'
import RichEditor from './RichEditor'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // jsdom no mide: ProseMirror lo pide al llevar el cursor a la vista
  Range.prototype.getBoundingClientRect ??= () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 })
  Range.prototype.getClientRects ??= () => []
  document.elementFromPoint ??= () => null
})

const deferred = () => {
  let resolve
  const promise = new Promise((res) => {
    resolve = res
  })
  return { promise, resolve }
}

/** Editor con la madre «A» y su anidada «A1» seleccionadas; «Pasar al checklist» queda esperando a `request`. */
async function setup(request) {
  const onMoveTasks = vi.fn(() => request.promise)
  render(
    <TooltipProvider>
      <RichEditor value={'- [ ] A\n  - [ ] A1\n- [ ] B'} toolbar onMoveTasks={onMoveTasks} />
    </TooltipProvider>,
  )
  const editor = await waitFor(() => {
    const found = document.querySelector('.ProseMirror')?.editor
    if (!found) throw new Error('sin editor')
    return found
  })
  let from = null
  let to = null
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text === 'A') from = pos
    if (node.isText && node.text === 'A1') to = pos + 1
  })
  act(() => {
    editor.view.focus()
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, from, to)))
  })
  act(() => screen.getByRole('button', { name: /Pasar al checklist de la tarea/ }).click())
  expect(onMoveTasks).toHaveBeenCalledWith([
    { text: 'A', checked: false },
    { text: 'A1', checked: false },
  ])
  return editor
}

const markdownOf = (editor) => docToMarkdown(editor.getJSON())

describe('«Pasar al checklist» en el editor, si solo se creó parte', () => {
  it('sin cambios mientras tanto: vuelve solo la anidada que no se creó (la madre no se repite)', async () => {
    const request = deferred()
    const editor = await setup(request)
    expect(markdownOf(editor)).toBe('- [ ] B')

    await act(async () => request.resolve(1))
    await waitFor(() => expect(markdownOf(editor)).toBe('- [ ] A1\n- [ ] B'))
  })

  it('si se escribió mientras tanto, al final vuelve solo lo que no se creó', async () => {
    const request = deferred()
    const editor = await setup(request)
    act(() => {
      editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nuevo' }] }] })
    })

    await act(async () => request.resolve(1))
    await waitFor(() => expect(markdownOf(editor)).toBe('Nuevo\n\n- [ ] A1'))
  })
})

async function mountEditor(props = {}) {
  render(
    <TooltipProvider>
      <RichEditor value="" {...props} />
    </TooltipProvider>,
  )
  const editor = await waitFor(() => {
    const found = document.querySelector('.ProseMirror')?.editor
    if (!found) throw new Error('sin editor')
    return found
  })
  act(() => editor.commands.focus())
  return editor
}

const slashMenu = () => screen.queryByRole('listbox', { name: 'Insertar bloque' })

describe('menú «/»', () => {
  it('sigue abierto con espacios mientras coincide algo: «/lista de» llega a «Lista de tareas»', async () => {
    const onCommandChange = vi.fn()
    const editor = await mountEditor({ onCommandChange })

    act(() => editor.commands.insertContent('/lista de'))
    expect(slashMenu()).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Lista de tareas/ })).toBeInTheDocument()
    expect(onCommandChange).toHaveBeenLastCalledWith(true)

    act(() => editor.commands.insertContent(' tareas'))
    expect(screen.getByRole('option', { name: /Lista de tareas/ })).toBeInTheDocument()
  })

  it('se cierra cuando ya no coincide nada (y lo escrito queda como texto)', async () => {
    const onCommandChange = vi.fn()
    const editor = await mountEditor({ onCommandChange })

    act(() => editor.commands.insertContent('/lista de'))
    expect(slashMenu()).toBeInTheDocument()
    act(() => editor.commands.insertContent('x'))
    expect(slashMenu()).not.toBeInTheDocument()
    expect(onCommandChange).toHaveBeenLastCalledWith(false)
    expect(markdownOf(editor)).toBe('/lista dex')
  })

  it('Escape lo cierra, aunque lo escrito siga coincidiendo', async () => {
    const editor = await mountEditor()

    act(() => editor.commands.insertContent('/lista'))
    expect(slashMenu()).toBeInTheDocument()
    act(() => {
      editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(slashMenu()).not.toBeInTheDocument()
    act(() => editor.commands.insertContent(' de'))
    expect(slashMenu()).not.toBeInTheDocument()
  })
})
