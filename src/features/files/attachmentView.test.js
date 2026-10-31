import { describe, expect, it } from 'vitest'
import { attachmentsSummary, badgeToneOf, fileBadge, openActionOf, uploadRowOf, uploadsProgress, visibleUploads } from './attachmentView'

const MB = 1024 * 1024
const task = (extra) => ({ id: 't1', name: 'iconos.zip', size: 2 * MB, status: 'queued', progress: 0, error: null, retryable: false, result: null, ...extra })

describe('insignia por tipo', () => {
  it('cada tipo con su color y la extensión en mayúsculas', () => {
    expect(fileBadge('requisitos.pdf')).toEqual({ label: 'PDF', className: 'bg-ty-bug-soft text-ty-bug-text' })
    expect(badgeToneOf('textos.DOCX')).toBe('bg-ty-task-soft text-ty-task-text')
    expect(badgeToneOf('campos.xlsx')).toBe('bg-ok-soft text-ok')
    expect(badgeToneOf('grabacion.mov')).toBe('bg-ty-story-soft text-ty-story-text')
  })

  it('lo que no se conoce (ZIP, ejecutables, sin extensión) va en gris', () => {
    expect(badgeToneOf('iconos.zip')).toBe('bg-muted text-muted-foreground')
    expect(badgeToneOf('instalador.exe')).toBe('bg-muted text-muted-foreground')
    expect(fileBadge('LEEME').label).toBe('ARCH')
  })
})

describe('encabezado', () => {
  it('cuántos son y cuánto pesan juntos', () => {
    expect(attachmentsSummary([{ size: 2.4 * MB }, { size: 2.8 * MB }])).toBe('2 · 5,2 MB')
    expect(attachmentsSummary([])).toBe('')
  })
})

describe('clic en un adjunto', () => {
  it('imagen → visor, PDF → pestaña nueva, el resto se descarga', () => {
    expect(openActionOf({ image: true, contentType: 'image/png', fileName: 'a.png' })).toBe('viewer')
    expect(openActionOf({ image: false, contentType: 'application/pdf', fileName: 'requisitos.pdf' })).toBe('tab')
    expect(openActionOf({ image: false, contentType: 'application/zip', fileName: 'iconos.zip' })).toBe('download')
    expect(openActionOf({ contentType: 'text/csv', fileName: 'datos.csv' })).toBe('download')
  })
})

describe('fila de una subida', () => {
  it('en cola y subiendo se pueden cancelar', () => {
    expect(uploadRowOf(task())).toMatchObject({ state: 'queued', label: 'En cola', dismissLabel: 'Cancelar subida', canRetry: false })
    expect(uploadRowOf(task({ status: 'uploading', progress: 0.456 }))).toMatchObject({
      state: 'uploading',
      label: 'Subiendo… 46 %',
      percent: 46,
      dismissLabel: 'Cancelar subida',
    })
    expect(uploadRowOf(task({ status: 'confirming', progress: 1 }))).toMatchObject({ state: 'uploading', percent: 100, label: 'Terminando…' })
  })

  it('un error muestra su mensaje; «Reintentar» solo si sirve', () => {
    const cut = uploadRowOf(task({ status: 'error', error: 'Se cortó la conexión al 70 %.', retryable: true }))
    expect(cut).toMatchObject({ state: 'error', label: 'Se cortó la conexión al 70 %.', canRetry: true, dismissLabel: 'Quitar de la lista' })
    const invalid = uploadRowOf(task({ status: 'error', error: 'Este tipo de archivo no se puede adjuntar.' }))
    expect(invalid).toMatchObject({ canRetry: false, label: 'Este tipo de archivo no se puede adjuntar.' })
  })

  it('una subida terminada no se repite cuando ya está en la lista de adjuntos', () => {
    const tasks = [task({ id: 'a', status: 'done', result: { id: 'F1' } }), task({ id: 'b', status: 'done', result: { id: 'f2' } }), task({ id: 'c' })]
    expect(visibleUploads(tasks, [{ id: 'f1' }]).map((item) => item.id)).toEqual(['b', 'c'])
  })
})

describe('pastilla de varias subidas', () => {
  it('con menos de dos en curso no aparece', () => {
    expect(uploadsProgress([task({ status: 'uploading' }), task({ id: 't2', status: 'error' })])).toBeNull()
  })

  it('cuenta las que siguen y pondera el avance por tamaño', () => {
    const progress = uploadsProgress([
      task({ id: 'a', status: 'uploading', size: 3 * MB, progress: 1 }),
      task({ id: 'b', status: 'queued', size: 1 * MB }),
      task({ id: 'c', status: 'error', size: 9 * MB }),
    ])
    expect(progress).toEqual({ count: 2, percent: 75, ids: ['a', 'b'] })
  })
})
