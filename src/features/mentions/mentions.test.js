import { describe, expect, it } from 'vitest'
import {
  filterPeople,
  findMentionQuery,
  insertMention,
  joinNames,
  mentionedIds,
  mentionToken,
  parseMentions,
  splitDisplayMentions,
  toEditable,
  toPlainText,
  toStored,
} from './mentions'

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
    expect(mentionToken('Ana ]Gómez\n', ANA)).toBe(`@[Ana Gómez](${ANA})`)
  })
})

describe('edición con menciones', () => {
  it('ida y vuelta: guardado → editable → guardado', () => {
    const body = `Listo @[Ana Gómez](${ANA}), sigue @[Luis](${LUIS}).`
    const { text, mentions } = toEditable(body)
    expect(text).toBe('Listo @Ana Gómez, sigue @Luis.')
    expect(toStored(text, mentions)).toBe(body)
  })

  it('prefiere el nombre más largo y no toma un nombre pegado a otra palabra', () => {
    const mentions = [
      { name: 'Ana', userId: LUIS },
      { name: 'Ana Gómez', userId: ANA },
    ]
    expect(toStored('@Ana Gómez y @Anabel', mentions)).toBe(`@[Ana Gómez](${ANA}) y @Anabel`)
    expect(splitDisplayMentions('hola @Ana', mentions)).toEqual([
      { type: 'text', text: 'hola ' },
      { type: 'mention', name: 'Ana', userId: LUIS },
    ])
  })

  it('si se borra parte del nombre deja de ser mención', () => {
    expect(toStored('@Ana Góm', [{ name: 'Ana Gómez', userId: ANA }])).toBe('@Ana Góm')
  })
})

describe('autocompletar', () => {
  it('encuentra la @ que se está escribiendo', () => {
    expect(findMentionQuery('Lo reviso con @', 15)).toEqual({ start: 14, query: '' })
    expect(findMentionQuery('hola @an', 8)).toEqual({ start: 5, query: 'an' })
    expect(findMentionQuery('@Ana G', 6)).toEqual({ start: 0, query: 'Ana G' })
  })

  it('no abre la lista en correos, tras un espacio inicial ni en otra línea', () => {
    expect(findMentionQuery('ana@test', 8)).toBeNull()
    expect(findMentionQuery('hola @ ana', 10)).toBeNull()
    expect(findMentionQuery('@ana\nhola', 9)).toBeNull()
  })

  it('inserta «@Nombre » en lugar de la búsqueda', () => {
    const result = insertMention('Hola @an, mira', { start: 5, end: 8 }, { id: ANA, fullName: 'Ana Gómez' })
    expect(result.text).toBe('Hola @Ana Gómez , mira')
    expect(result.caret).toBe(16)
    expect(result.mention).toEqual({ name: 'Ana Gómez', userId: ANA })
    expect(insertMention('@lu y', { start: 0, end: 3 }, { id: LUIS, fullName: 'Luis' }).text).toBe('@Luis y')
  })

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
