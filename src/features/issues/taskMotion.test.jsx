import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { useFlashStore } from '@/lib/flash'
import { becameCompleted, landNewTask, signalCompleted } from './taskMotion'

vi.mock('sonner', () => ({ toast: vi.fn() }))

const state = (group) => ({ state: { group } })

afterEach(() => {
  vi.clearAllMocks()
  useFlashStore.setState({ settled: null, created: null, completed: null, closedCycle: null })
})

describe('becameCompleted', () => {
  it('solo cuenta el paso a completada desde otro estado', () => {
    expect(becameCompleted(state('STARTED'), state('COMPLETED'))).toBe(true)
    expect(becameCompleted(state('CANCELLED'), state('COMPLETED'))).toBe(true)
  })

  it('no cuenta si ya estaba completada, si no queda completada o si no se sabe cómo estaba', () => {
    expect(becameCompleted(state('COMPLETED'), state('COMPLETED'))).toBe(false)
    expect(becameCompleted(state('STARTED'), state('CANCELLED'))).toBe(false)
    expect(becameCompleted(undefined, state('COMPLETED'))).toBe(false)
  })
})

describe('signalCompleted', () => {
  it('una tarea se marca para encenderse y sale el aviso, que reemplaza al anterior', () => {
    signalCompleted({ id: 'a', code: 'WEB-7', title: 'Pantalla de pago', type: 'TASK' })
    expect(useFlashStore.getState().completed).toBe('a')
    expect(toast).toHaveBeenCalledWith('WEB-7 completada', expect.objectContaining({ id: 'issue-completed', description: 'Pantalla de pago' }))
  })

  it('una historia solo se enciende: sus avisos son los de cerrarla', () => {
    signalCompleted({ id: 's', code: 'WEB-2', title: 'Pagos', type: 'STORY' })
    expect(useFlashStore.getState().completed).toBe('s')
    expect(toast).not.toHaveBeenCalled()
  })
})

describe('landNewTask', () => {
  it('sin animaciones (aquí no las hay) no deja nada flotando: solo marca la tarea para resaltarla', async () => {
    await landNewTask({ left: 0, top: 0, width: 900, height: 600 }, { id: 'n', code: 'WEB-9', title: 'Nueva' })
    expect(useFlashStore.getState().created).toBe('n')
    expect(document.querySelector('.tf-task-chip, .tf-ghost')).toBeNull()
  })
})
