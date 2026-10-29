import { describe, expect, it } from 'vitest'
import { filterPeople, joinNames, mentionedIds, mentionName, parseMentions, toPlainText } from './mentions'

const ANA = '11111111-2222-3333-4444-555555555555'
const LUIS = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

describe('tokens de mención', () => {
  it('separa el texto y las menciones guardadas', () => {
    expect(parseMentions(`Hola @[Ana Gómez](${ANA}), ¿lo revisas?`)).toEqual([
      { type: 'text', text: 'Hola ' },
      { type: 'mention', name: 'Ana Gómez', userId: ANA },
      { type: 'text', text: ', ¿lo revisas?' },
    ])
  })

  it('deja como texto lo que no es un token válido', () => {
    expect(parseMentions('correo@test.com y @[Ana](no-es-un-id)')).toEqual([
      { type: 'text', text: 'correo@test.com y @[Ana](no-es-un-id)' },
    ])
  })

  it('muestra una mención cortada al final de un extracto', () => {
    expect(parseMentions('Revisa esto @[Ana Gó…')).toEqual([
      { type: 'text', text: 'Revisa esto ' },
      { type: 'mention', name: 'Ana Gó…', userId: null },
    ])
    expect(toPlainText(`Ok @[Luis Muñoz](aaaaaaaa-bbbb…`)).toBe('Ok @Luis Muñoz…')
  })

  it('texto legible e ids sin repetir', () => {
    const body = `@[Ana](${ANA}) y @[Luis](${LUIS}) y otra vez @[Ana](${ANA})`
    expect(toPlainText(body)).toBe('@Ana y @Luis y otra vez @Ana')
    expect(mentionedIds(body)).toEqual([ANA, LUIS])
  })

  it('une nombres para los avisos', () => {
    expect(joinNames(['Luis'])).toBe('Luis')
    expect(joinNames(['Luis', 'Ana'])).toBe('Luis y Ana')
    expect(joinNames(['Luis', 'Ana', 'Carlos'])).toBe('Luis, Ana y Carlos')
  })

  it('el nombre del token no lleva «]» ni saltos de línea', () => {
    expect(mentionName('Ana ]Gómez\n')).toBe('Ana Gómez')
  })
})

describe('autocompletar', () => {
  it('filtra sin tildes y pone primero a quien empieza así', () => {
    const people = [
      { fullName: 'Carlos Ruiz', email: 'carlos@test.com' },
      { fullName: 'Luis Muñoz', email: 'luis@test.com' },
      { fullName: 'Ana Gómez', email: 'ana@test.com' },
    ]
    expect(filterPeople(people, 'mu').map((p) => p.fullName)).toEqual(['Luis Muñoz'])
    expect(filterPeople(people, 'gomez').map((p) => p.fullName)).toEqual(['Ana Gómez'])
    expect(filterPeople(people, 'r').map((p) => p.fullName)).toEqual(['Carlos Ruiz'])
    expect(filterPeople(people, '').length).toBe(3)
  })
})
