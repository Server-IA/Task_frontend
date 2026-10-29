import { describe, expect, it } from 'vitest'
import { storySummary } from './storySummary'

describe('storySummary', () => {
  it('el esqueleto vacío de la plantilla no muestra nada (no «Como quiero para»)', () => {
    expect(storySummary('> **Como**\n> **quiero**\n> **para**')).toBe('')
  })

  it('con la historia escrita, muestra «Como … quiero … para …»', () => {
    expect(storySummary('> **Como** admin\n> **quiero** exportar\n> **para** auditar\n\nMás contexto')).toBe(
      'Como admin, quiero exportar, para auditar',
    )
  })

  it('a medio escribir, solo las partes con texto', () => {
    expect(storySummary('> **Como** admin\n> **quiero**\n> **para**')).toBe('Como admin')
  })

  it('sin la cita (o con la cita vacía), el texto del resto de la descripción', () => {
    expect(storySummary('Algo **importante**')).toBe('Algo importante')
    expect(storySummary('> **Como**\n> **quiero**\n> **para**\n\nNotas del cliente')).toBe('Notas del cliente')
    expect(storySummary('')).toBe('')
  })
})
