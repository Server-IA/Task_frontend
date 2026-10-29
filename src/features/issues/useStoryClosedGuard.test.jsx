import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { closedStoryActions, closedStoryCode, useStoryClosedGuard } from './useStoryClosedGuard'

let role = 'OWNER'
vi.mock('@/features/workspaces/hooks', () => ({ useWorkspace: () => ({ data: { myRole: role } }) }))
vi.mock('@/lib/notify', () => ({ notifyError: vi.fn() }))

const story = { id: 's1', code: 'WEB-15', type: 'STORY' }
const task = { id: 't1', code: 'WEB-17', type: 'TASK', parent: story }
const todo = { id: 's-todo', name: 'Por hacer' }
const closedError = new ApiError({ status: 409, message: 'WEB-15 está cerrada. Reábrela…', code: 'STORY_CLOSED' })

/** Simula un cambio que falla con `error` y, al reintentar, llama a `retry`. */
function Harness({ error, retry }) {
  const { onStoryClosed, dialog } = useStoryClosedGuard('acme')
  return (
    <>
      <button type="button" onClick={() => onStoryClosed(task, closedStoryActions.move(task, todo), retry)(error)}>
        mover
      </button>
      {dialog}
    </>
  )
}

describe('useStoryClosedGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    role = 'OWNER'
  })

  it('el project manager puede reabrir la historia y se reintenta el cambio', async () => {
    const user = userEvent.setup()
    const retry = vi.fn()
    render(<Harness error={closedError} retry={retry} />)
    await user.click(screen.getByRole('button', { name: 'mover' }))

    expect(screen.getByRole('dialog')).toHaveTextContent('WEB-15 está cerrada. ¿La reabres para continuar?')
    expect(screen.getByRole('dialog')).toHaveTextContent('Mover WEB-17 a «Por hacer» la vuelve a abrir.')
    await user.click(screen.getByRole('button', { name: /Reabrir la historia y continuar/ }))
    expect(retry).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(notifyError).not.toHaveBeenCalled()
  })

  it('a un miembro le dice que solo el project manager la reabre', async () => {
    role = 'MEMBER'
    const user = userEvent.setup()
    const retry = vi.fn()
    render(<Harness error={closedError} retry={retry} />)
    await user.click(screen.getByRole('button', { name: 'mover' }))

    expect(screen.getByRole('button', { name: /Reabrir la historia y continuar/ })).toBeDisabled()
    expect(screen.getByText(/Solo el project manager puede reabrir la historia/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(retry).not.toHaveBeenCalled()
  })

  it('otro error se muestra como siempre', async () => {
    const user = userEvent.setup()
    const other = new ApiError({ status: 403, message: 'Sin permiso' })
    render(<Harness error={other} retry={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'mover' }))
    expect(notifyError).toHaveBeenCalledWith(other, undefined)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('closedStoryCode', () => {
  it('la del mensaje del backend o, si no viene, la historia de la tarea', () => {
    expect(closedStoryCode(closedError, task)).toBe('WEB-15')
    expect(closedStoryCode(new ApiError({ status: 409, message: 'APP-3 está cerrada. Reábrela…' }), { code: 'APP-9' })).toBe('APP-3')
    expect(closedStoryCode(new ApiError({ status: 409, message: 'Conflicto', code: 'STORY_CLOSED' }), task)).toBe('WEB-15')
  })

  it('al pasar la tarea de una historia abierta a otra cerrada, nombra la nueva (la del backend)', () => {
    const otherClosed = new ApiError({ status: 409, message: 'WEB-30 está cerrada. Reábrela…', code: 'STORY_CLOSED' })
    expect(closedStoryCode(otherClosed, task)).toBe('WEB-30')
  })
})
