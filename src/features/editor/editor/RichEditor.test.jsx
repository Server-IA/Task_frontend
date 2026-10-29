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
