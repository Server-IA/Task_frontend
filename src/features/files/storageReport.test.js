import { describe, expect, it } from 'vitest'
import { MB, WORKSPACE_QUOTA } from './fileTypes'
import {
  filesCount,
  formatGigabytes,
  formatPercent,
  freeBytes,
  kindSegments,
  projectBars,
  uploadedWhen,
  usageBarLabel,
} from './storageReport'

const usage = { usedBytes: 1200 * MB, quotaBytes: WORKSPACE_QUOTA, percent: 58.59, warning: false, full: false }
const report = {
  usage,
  byType: [
    { type: 'IMAGES', bytes: 720 * MB, count: 120 },
    { type: 'DOCUMENTS', bytes: 390 * MB, count: 140 },
    { type: 'OTHER', bytes: 90 * MB, count: 15 },
  ],
  byProject: [],
  largest: [],
}

describe('espacio usado', () => {
  it('porcentaje hacia abajo, sin pasar de 100 %', () => {
    expect(formatPercent(usage)).toBe('58 %')
    expect(formatPercent({ ...usage, percent: 89.9 })).toBe('89 %')
    expect(formatPercent({ ...usage, percent: 104 })).toBe('100 %')
    expect(formatPercent({ usedBytes: 1024, quotaBytes: WORKSPACE_QUOTA, percent: 0 })).toBe('menos de 1 %')
    expect(formatPercent({ usedBytes: 0, quotaBytes: WORKSPACE_QUOTA, percent: 0 })).toBe('0 %')
    // Sin `percent`, se calcula
    expect(formatPercent({ usedBytes: 1024 * MB, quotaBytes: WORKSPACE_QUOTA })).toBe('50 %')
  })

  it('tamaños en GB desde 0,1 GB', () => {
    expect(formatGigabytes(1200 * MB)).toBe('1,2 GB')
    expect(formatGigabytes(WORKSPACE_QUOTA)).toBe('2 GB')
    expect(formatGigabytes(848 * MB)).toBe('0,8 GB')
    expect(formatGigabytes(90 * MB)).toBe('90 MB')
    expect(formatGigabytes(0)).toBe('0 B')
  })

  it('libre: lo que falta para la cuota, nunca negativo', () => {
    expect(freeBytes(usage)).toBe(848 * MB)
    expect(freeBytes({ usedBytes: WORKSPACE_QUOTA + MB, quotaBytes: WORKSPACE_QUOTA })).toBe(0)
    expect(freeBytes(undefined)).toBe(0)
  })

  it('segmentos por tipo en orden fijo, del ancho de su parte de la cuota', () => {
    const segments = kindSegments(report)
    expect(segments.map((segment) => [segment.label, segment.value, segment.width])).toEqual([
      ['Imágenes', '720 MB', '35.16%'],
      ['Documentos', '390 MB', '19.04%'],
      ['Otros', '90 MB', '4.39%'],
    ])
    expect(segments[0].color).toContain('dark:')
  })

  it('tipos que faltan quedan en cero y el ancho nunca pasa de 100 %', () => {
    const segments = kindSegments({ usage: { usedBytes: 3 * WORKSPACE_QUOTA, quotaBytes: WORKSPACE_QUOTA }, byType: [{ type: 'OTHER', bytes: 3 * WORKSPACE_QUOTA, count: 1 }] })
    expect(segments.map((segment) => segment.width)).toEqual(['0%', '0%', '100%'])
    expect(kindSegments({ usage: { usedBytes: 0, quotaBytes: 0 }, byType: [] }).every((segment) => segment.width === '0%')).toBe(true)
  })

  it('texto de la barra para lectores de pantalla', () => {
    expect(usageBarLabel(report)).toBe('Imágenes 720 MB, documentos 390 MB, otros 90 MB; quedan 0,8 GB')
  })
})

describe('por proyecto y archivos', () => {
  it('el proyecto que más ocupa llena la barra', () => {
    const bars = projectBars([
      { project: { id: 'p1', name: 'Sitio web 2026', identifier: 'WEB', color: 'TEAL' }, bytes: 900 * MB, count: 214 },
      { project: { id: 'p2', name: 'App Móvil Clientes', identifier: 'AMC', color: 'AMBER' }, bytes: 300 * MB, count: 1 },
    ])
    expect(bars.map((bar) => [bar.size, bar.files, bar.width])).toEqual([
      ['0,9 GB', '214 archivos', '100%'],
      ['0,3 GB', '1 archivo', '33.33%'],
    ])
    expect(projectBars([])).toEqual([])
    expect(projectBars([{ project: { id: 'p1' }, bytes: 0, count: 0 }])[0].width).toBe('0%')
  })

  it('archivos en singular y plural', () => {
    expect(filesCount(0)).toBe('0 archivos')
    expect(filesCount(1)).toBe('1 archivo')
    expect(filesCount(61)).toBe('61 archivos')
  })

  it('fecha de subida: hoy, ayer o la fecha corta', () => {
    const now = new Date(2026, 9, 30, 12, 0)
    expect(uploadedWhen(new Date(2026, 9, 30, 8, 0), now)).toBe('hoy')
    expect(uploadedWhen(new Date(2026, 9, 29, 23, 0), now)).toBe('ayer')
    expect(uploadedWhen('2026-10-14T10:00:00', now)).toMatch(/^14 oct/)
    expect(uploadedWhen(null, now)).toBe('')
  })
})
