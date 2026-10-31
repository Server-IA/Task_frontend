import { beforeEach, describe, expect, it, vi } from 'vitest'
import { filesApi } from './api'
import { fileIdsIn, fileReference, parseFileReference } from './fileRefs'
import { loadFileUrl, msUntilRefresh, REFRESH_MARGIN_MS } from './fileUrls'

vi.mock('./api', () => ({ filesApi: { urls: vi.fn() } }))

const A = '3f2a1b4c-0000-4000-8000-000000000001'
const B = '3f2a1b4c-0000-4000-8000-000000000002'

describe('referencias a archivos', () => {
  it('lee /files/<id> y la marca de ancho completo', () => {
    expect(parseFileReference(`/files/${A}`)).toEqual({ id: A, wide: false })
    expect(parseFileReference(`/files/${A.toUpperCase()}#full`)).toEqual({ id: A, wide: true })
    expect(parseFileReference('https://otro.sitio/a.png')).toBeNull()
    expect(parseFileReference('blob:http://localhost/x')).toBeNull()
    expect(parseFileReference(`/files/${A}/extra`)).toBeNull()
    expect(fileReference(A, { wide: true })).toBe(`/files/${A}#full`)
    expect(fileIdsIn(`![a](/files/${A}) y ![b](/files/${B}#full) y otra vez /files/${A}`)).toEqual([A, B])
  })
})

describe('URLs firmadas', () => {
  beforeEach(() => vi.mocked(filesApi.urls).mockReset())

  it('las del mismo momento se piden juntas y las que no se pueden ver vienen en null', async () => {
    vi.mocked(filesApi.urls).mockResolvedValue([{ id: A, url: 'https://r2/a', expiresAt: '2026-10-30T12:00:00Z' }])

    const [first, second, again] = await Promise.all([loadFileUrl(A), loadFileUrl(B), loadFileUrl(A)])

    expect(filesApi.urls).toHaveBeenCalledTimes(1)
    expect(filesApi.urls).toHaveBeenCalledWith([A, B], false)
    expect(first.url).toBe('https://r2/a')
    expect(again).toBe(first)
    expect(second).toBeNull()
  })

  it('las de descarga van aparte', async () => {
    vi.mocked(filesApi.urls).mockResolvedValue([])
    await Promise.all([loadFileUrl(A), loadFileUrl(A, { download: true })])
    expect(filesApi.urls).toHaveBeenCalledWith([A], false)
    expect(filesApi.urls).toHaveBeenCalledWith([A], true)
  })

  it('un error llega a todas las que esperaban', async () => {
    const mocked = filesApi.urls
    // Una función simple (el espía de vitest deja una copia de la promesa rechazada sin manejar)
    filesApi.urls = () => Promise.reject(new Error('caído'))
    const results = await Promise.allSettled([loadFileUrl(A), loadFileUrl(B)]).finally(() => {
      filesApi.urls = mocked
    })
    expect(results.map((result) => [result.status, result.reason?.message])).toEqual([
      ['rejected', 'caído'],
      ['rejected', 'caído'],
    ])
  })

  it('se renuevan 10 minutos antes de vencer', () => {
    const now = Date.parse('2026-10-30T11:00:00Z')
    expect(REFRESH_MARGIN_MS).toBe(600_000)
    expect(msUntilRefresh({ expiresAt: '2026-10-30T12:00:00Z' }, now)).toBe(50 * 60 * 1000)
    expect(msUntilRefresh({ expiresAt: '2026-10-30T11:05:00Z' }, now)).toBe(0)
  })
})
