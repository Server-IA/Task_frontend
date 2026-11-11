import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFlashStore } from '@/lib/flash'
import { landNewTask } from './taskMotion'

// Aquí sí «hay» animaciones: se comprueba a dónde va la ficha de la tarea recién creada
vi.mock('@/lib/intro', () => ({ canAnimate: () => true }))

const DIALOG = { left: 300, top: 50, width: 980, height: 620 }
const issue = { id: 'n', code: 'WEB-9', title: 'Nueva' }

/** Una fila de la tarea, que registra si la midieron (la ficha mide la fila a la que va). */
function row(parent) {
  const element = document.createElement('div')
  element.dataset.issueId = issue.id
  element.getBoundingClientRect = vi.fn(() => ({ left: 10, top: 10, right: 510, bottom: 50, width: 500, height: 40 }))
  parent.append(element)
  return element
}

beforeEach(() => {
  Element.prototype.animate = vi.fn(() => ({ finished: Promise.resolve() }))
})

afterEach(() => {
  delete Element.prototype.animate
  document.body.replaceChildren()
  useFlashStore.setState({ settled: null, created: null, completed: null, closedCycle: null })
})

describe('landNewTask: a dónde va la ficha', () => {
  it('sin un panel abierto debajo, va a la fila de la tarea en la página y no deja nada flotando', async () => {
    const inPage = row(document.body)
    await landNewTask(DIALOG, issue)
    expect(inPage.getBoundingClientRect).toHaveBeenCalled()
    expect(document.querySelector('.tf-task-chip, .tf-ghost')).toBeNull()
  })

  it('con un panel abierto debajo (una subtarea creada desde el detalle), va a la fila dentro del panel, no a la lista que tapa', async () => {
    const inList = row(document.body)
    const panel = document.createElement('div')
    document.body.append(panel)
    const inPanel = row(panel)
    await landNewTask(DIALOG, issue, panel)
    expect(inPanel.getBoundingClientRect).toHaveBeenCalled()
    expect(inList.getBoundingClientRect).not.toHaveBeenCalled()
  })

  it('si la tarea no aparece en el panel, la ficha se va y la tarea queda marcada igual', async () => {
    const inList = row(document.body)
    const panel = document.createElement('div')
    document.body.append(panel)
    // Espera de verdad lo que la ficha espera a la fila (segundo y medio)
    await landNewTask(DIALOG, issue, panel)
    expect(inList.getBoundingClientRect).not.toHaveBeenCalled()
    expect(useFlashStore.getState().created).toBe('n')
    expect(document.querySelector('.tf-task-chip')).toBeNull()
  })
})
