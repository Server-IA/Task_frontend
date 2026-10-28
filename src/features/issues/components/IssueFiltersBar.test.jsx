import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IssueFiltersBar } from './IssueFiltersBar'

const filters = { state: [], priority: [], assignee: [], label: [], cycle: null, module: null, blocked: false, search: '' }
const meta = { states: [], users: [], labels: [] }

function renderBar(props) {
  return render(
    <IssueFiltersBar filters={filters} activeCount={0} setFilter={vi.fn()} clearFilters={vi.fn()} meta={meta} {...props} />,
  )
}

describe('IssueFiltersBar: buscar o saltar', () => {
  it('Enter con un código abre esa tarea, en mayúsculas', async () => {
    const onJumpToCode = vi.fn()
    renderBar({ onJumpToCode, codeExample: 'AMC-12' })
    const input = screen.getByPlaceholderText('buscar o saltar a AMC-12')
    await userEvent.setup().type(input, ' web-4 {Enter}')
    expect(onJumpToCode).toHaveBeenCalledWith('WEB-4')
    expect(input).toHaveValue('')
  })

  it('Enter con texto que no es un código solo busca', async () => {
    const onJumpToCode = vi.fn()
    renderBar({ onJumpToCode })
    const input = screen.getByPlaceholderText('buscar o saltar a WEB-12')
    await userEvent.setup().type(input, 'login{Enter}')
    expect(onJumpToCode).not.toHaveBeenCalled()
    expect(input).toHaveValue('login')
  })
})
