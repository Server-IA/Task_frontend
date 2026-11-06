import { act, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { docToMarkdown } from '../markdown/serialize'
import RichEditor from './RichEditor'

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() }) }))

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Range.prototype.getBoundingClientRect ??= () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 })
  Range.prototype.getClientRects ??= () => []
  document.elementFromPoint ??= () => null
})

async function mount() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <RichEditor value="" onChange={() => {}} />
      </TooltipProvider>
    </QueryClientProvider>,
  )
  return waitFor(() => {
    const found = document.querySelector('.ProseMirror')?.editor
    if (!found) throw new Error('sin editor')
    return found
  })
}

/** Pegar como lo hace ProseMirror con el portapapeles (jsdom no lo lee del evento): HTML y texto plano. */
function paste(editor, html, text) {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  event.clipboardData = { files: [], types: ['text/html', 'text/plain'], getData: (type) => ({ 'text/html': html, 'text/plain': text })[type] ?? '' }
  act(() => {
    editor.view.pasteHTML(html, event)
  })
}

const item = (level, marker, text) =>
  `<p class=MsoListParagraphCxSpMiddle style='text-indent:-18.0pt;mso-list:l0 level${level} lfo1'><![if !supportLists]><span style='font-family:Symbol'><span style='mso-list:Ignore'>${marker}<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp; </span></span></span><![endif]>${text}<o:p></o:p></p>`

describe('pegar desde Word', () => {
  it('las listas llegan como listas (con su negrita), aunque el texto plano parezca Markdown', async () => {
    const editor = await mount()
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><body><p class=MsoNormal><b>Pasos</b></p>${item(1, '1.', 'Abrir la app')}${item(1, '2.', 'Ir a <b>Pedidos</b>')}<p class=MsoNormal>Notas:</p>${item(1, '·', 'Uno')}${item(2, 'o', 'Sub')}</body></html>`
    paste(editor, html, 'Pasos\n1.\tAbrir la app\n2.\tIr a Pedidos\nNotas:\n·\tUno\no\tSub')
    expect(docToMarkdown(editor.getJSON())).toBe('**Pasos**\n\n1. Abrir la app\n2. Ir a **Pedidos**\n\nNotas:\n\n- Uno\n  - Sub')
  })
})
