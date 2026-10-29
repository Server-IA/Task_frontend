import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { MarkdownView } from './MarkdownView'

vi.mock('../taskRefs', () => ({ useTaskRefs: () => new Map() }))

describe('MarkdownView: casillas', () => {
  const markdown = '- [ ] A\n  - [ ] A1\n- [ ] B'

  it('las anidadas se numeran en el orden del documento (el que usan marcar y pasar al checklist)', () => {
    const onToggleTask = vi.fn()
    render(
      <MemoryRouter>
        <MarkdownView markdown={markdown} onToggleTask={onToggleTask} />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('checkbox', { name: 'A' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'A1' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'B' }))
    expect(onToggleTask.mock.calls).toEqual([
      [0, true],
      [1, true],
      [2, true],
    ])
  })

  it('«Pasar al checklist» de una anidada pasa esa, no la hermana de su madre', () => {
    const onMoveTasks = vi.fn()
    render(
      <MemoryRouter>
        <MarkdownView markdown={markdown} onToggleTask={() => {}} onMoveTasks={onMoveTasks} />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Pasar «A1» al checklist' }))
    expect(onMoveTasks).toHaveBeenCalledWith([1])
  })
})
