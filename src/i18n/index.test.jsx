import { render } from '@testing-library/react'
import { enUS, es } from 'date-fns/locale'
import { afterEach, describe, expect, it } from 'vitest'
import { dateLocale, getLanguage, localeTag, setLanguageForTests, stateName, stateNameToSave, t, tc, tn, tx } from './index'

afterEach(() => setLanguageForTests('es'))

describe('idiomas', () => {
  it('en español el texto es la clave: se devuelve tal cual, con sus variables', () => {
    expect(getLanguage()).toBe('es')
    expect(t('Idioma')).toBe('Idioma')
    expect(t('Espera {seconds} s', { seconds: 12 })).toBe('Espera 12 s')
    expect(tn(1, '{count} tarea', '{count} tareas')).toBe('1 tarea')
    expect(tn(3, '{count} tarea', '{count} tareas')).toBe('3 tareas')
    expect(tc('filtro', 'Todo')).toBe('Todo')
    expect(dateLocale()).toBe(es)
    expect(localeTag()).toBe('es')
  })

  it('en inglés busca la traducción y, si falta, deja el español', () => {
    setLanguageForTests('en')
    expect(t('Idioma')).toBe('Language')
    expect(t('Un texto que nadie tradujo {x}', { x: 1 })).toBe('Un texto que nadie tradujo 1')
    expect(dateLocale()).toBe(enUS)
    expect(localeTag()).toBe('en')
  })

  it('una variable que no llega se queda como está escrita', () => {
    expect(t('Hola {name}', {})).toBe('Hola {name}')
  })

  it('tx pone elementos de React dentro de la frase', () => {
    const { container } = render(<p>{tx('Abre {link} para seguir con {count} tareas', { link: <a href="/x">el enlace</a>, count: 3 })}</p>)
    expect(container.querySelector('p').textContent).toBe('Abre el enlace para seguir con 3 tareas')
    expect(container.querySelector('a')).toHaveAttribute('href', '/x')
  })
})

describe('nombres de los estados', () => {
  it('los de fábrica se ven en el idioma elegido; los propios, como los escribieron', () => {
    expect(['Backlog', 'Todo', 'In Progress', 'Done', 'Cancelled'].map(stateName)).toEqual([
      'Pendiente',
      'Sin empezar',
      'En curso',
      'Completado',
      'Cancelado',
    ])
    expect(stateName({ name: 'in progress' })).toBe('En curso')
    expect(stateName({ name: 'In Review' })).toBe('In Review')
    expect(stateName(null)).toBe('')
    setLanguageForTests('en')
    expect(['Backlog', 'Todo', 'In Progress', 'Done', 'Cancelled'].map(stateName)).toEqual(['Backlog', 'Todo', 'In Progress', 'Done', 'Cancelled'])
  })

  it('al editar, un nombre de fábrica que no se tocó se guarda como estaba', () => {
    expect(stateNameToSave('Todo', 'Sin empezar')).toBe('Todo')
    expect(stateNameToSave('Todo', 'Por hacer')).toBe('Por hacer')
    expect(stateNameToSave('In Review', 'In Review')).toBe('In Review')
  })
})
