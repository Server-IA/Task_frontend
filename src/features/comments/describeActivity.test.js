import { describe, expect, it } from 'vitest'
import { describeActivity, describeFeedEntry } from './describeActivity'

describe('describeActivity', () => {
  it('describe cambios de estado y prioridad', () => {
    expect(describeActivity({ field: 'STATE', oldValue: 'Todo', newValue: 'Done' })).toBe(
      'cambió el estado de «Todo» a «Done»',
    )
    expect(describeActivity({ field: 'PRIORITY', oldValue: 'LOW', newValue: 'URGENT' })).toBe(
      'cambió la prioridad de Baja a Urgente',
    )
  })

  it('distingue entre fijar, cambiar y quitar una fecha', () => {
    expect(describeActivity({ field: 'DUE_DATE', oldValue: null, newValue: '2026-11-15' })).toMatch(/^fijó la fecha límite en 15 nov/)
    expect(describeActivity({ field: 'DUE_DATE', oldValue: '2026-11-15', newValue: null })).toBe('quitó la fecha límite')
  })

  it('describe asignados, ciclos y creación', () => {
    expect(describeActivity({ field: 'ASSIGNEES', oldValue: null, newValue: 'Ana, Luis' })).toBe('asignó a Ana, Luis')
    expect(describeActivity({ field: 'ASSIGNEES', oldValue: 'Ana', newValue: null })).toBe('quitó a todos los asignados')
    expect(describeActivity({ field: 'CYCLE', oldValue: 'Sprint 1', newValue: null })).toBe('quitó la tarea del ciclo «Sprint 1»')
    expect(describeActivity({ field: 'CREATED', newValue: 'Login' })).toBe('creó la tarea')
  })
})

describe('casillas de la descripción', () => {
  it('marcar y desmarcar nombran la casilla, sin «editó la descripción»', () => {
    expect(describeActivity({ field: 'DESCRIPTION_CHECKED', newValue: 'Plantilla del correo con el enlace' })).toBe(
      'marcó «Plantilla del correo con el enlace» en la descripción',
    )
    expect(describeActivity({ field: 'DESCRIPTION_UNCHECKED', newValue: 'Enviar' })).toBe('desmarcó «Enviar» en la descripción')
  })

  it('el texto de la casilla se muestra sin el Markdown', () => {
    expect(
      describeActivity({
        field: 'DESCRIPTION_CHECKED',
        newValue: '**Revisar** el `token` con @[Ana Gómez](11111111-2222-3333-4444-555555555555)',
      }),
    ).toBe('marcó «Revisar el token con @Ana Gómez» en la descripción')
  })

  it('un texto largo se corta', () => {
    const text = describeActivity({ field: 'DESCRIPTION_CHECKED', newValue: 'a'.repeat(200) })
    expect(text).toMatch(/^marcó «a+…» en la descripción$/)
    expect(text.length).toBeLessThan(110)
  })

  it('en el feed va alrededor de la tarea', () => {
    expect(describeFeedEntry({ field: 'DESCRIPTION_CHECKED', newValue: 'Enviar' })).toMatchObject({
      verb: 'marcó «Enviar» en la descripción de',
      mark: '✓',
    })
    expect(describeFeedEntry({ field: 'DESCRIPTION_UNCHECKED', newValue: 'Enviar' }).verb).toBe('desmarcó «Enviar» en la descripción de')
  })
})

describe('describeFeedEntry', () => {
  it('un cambio de estado muestra «de → a» y distingue cuando se completa', () => {
    expect(describeFeedEntry({ field: 'STATE', oldValue: 'En curso', newValue: 'En revisión' })).toMatchObject({
      verb: 'movió',
      mark: '→',
      change: { from: 'En curso', to: 'En revisión', done: false },
    })
    expect(describeFeedEntry({ field: 'STATE', oldValue: 'En revisión', newValue: 'Hecho' }, { stateGroup: 'COMPLETED' })).toMatchObject({
      verb: 'completó',
      mark: '✓',
      tone: 'ok',
      change: { done: true },
    })
  })

  it('comentarios con su texto y asignaciones con a quién', () => {
    expect(describeFeedEntry({ field: 'COMMENT', newValue: 'Listo para revisar' })).toMatchObject({
      verb: 'comentó en',
      quote: 'Listo para revisar',
    })
    expect(describeFeedEntry({ field: 'ASSIGNEES', oldValue: null, newValue: 'Luis' })).toMatchObject({
      verb: 'asignó',
      suffix: 'a Luis',
      mark: '@',
    })
    expect(describeFeedEntry({ field: 'ASSIGNEES', oldValue: 'Luis', newValue: null }).verb).toBe('quitó los asignados de')
  })

  it('creación, ciclos y fechas', () => {
    expect(describeFeedEntry({ field: 'CREATED', newValue: 'Login' })).toMatchObject({ verb: 'creó', mark: '+' })
    expect(describeFeedEntry({ field: 'CYCLE', oldValue: null, newValue: 'Sprint 1' })).toMatchObject({
      verb: 'agregó',
      suffix: 'al ciclo «Sprint 1»',
    })
    expect(describeFeedEntry({ field: 'DUE_DATE', oldValue: null, newValue: '2026-12-03' }).suffix).toMatch(/^al 3 dic/)
  })
})

describe('relaciones en el historial', () => {
  it('describe la relación agregada o quitada', () => {
    expect(describeActivity({ field: 'RELATION', oldValue: null, newValue: 'bloquea WEB-12' })).toBe(
      'agregó la relación «bloquea WEB-12»',
    )
    expect(describeActivity({ field: 'RELATION', oldValue: 'bloqueada por WEB-3', newValue: null })).toBe(
      'quitó la relación «bloqueada por WEB-3»',
    )
  })

  it('en el feed se lee alrededor de la tarea', () => {
    expect(describeFeedEntry({ field: 'RELATION', newValue: 'bloquea WEB-12' })).toMatchObject({
      verb: 'marcó que',
      suffix: 'bloquea WEB-12',
    })
    expect(describeFeedEntry({ field: 'RELATION', newValue: 'bloqueada por WEB-3' }).suffix).toBe('está bloqueada por WEB-3')
    expect(describeFeedEntry({ field: 'RELATION', oldValue: 'relacionada con WEB-7', newValue: null }).suffix).toBe(
      'ya no está relacionada con WEB-7',
    )
  })
})
