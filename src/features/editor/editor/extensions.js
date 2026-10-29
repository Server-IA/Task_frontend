import { Extension, InputRule, Node } from '@tiptap/core'
import { Code } from '@tiptap/extension-code'
import { CodeBlock } from '@tiptap/extension-code-block'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extensions'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Suggestion from '@tiptap/suggestion'
import { taskRefRanges } from '../markdown/taskRefs'
import { CodeBlockNodeView } from './CodeBlockNodeView'

/**
 * Extensiones del editor. Todo lo que depende de React (abrir el menú «/», la lista de personas, el enlace,
 * terminar) pasa por `bridge`: un ref cuyo `current` actualiza el componente en cada render.
 * @typedef {{ current: Record<string, any> }} Bridge
 */

export const SLASH_KEY = new PluginKey('tfSlash')
export const MENTION_KEY = new PluginKey('tfMention')

/** Mención «@Nombre»: se guarda como `@[Nombre](id)`. */
const Mention = Node.create({
  name: 'mention',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,
  addOptions() {
    return { meId: null }
  },
  addAttributes() {
    return {
      id: { default: null, parseHTML: (element) => element.getAttribute('data-id') },
      label: { default: '', parseHTML: (element) => element.getAttribute('data-label') ?? element.textContent.replace(/^@/, '') },
    }
  },
  parseHTML() {
    return [{ tag: 'span[data-mention]' }]
  },
  renderHTML({ node }) {
    const me = this.options.meId && node.attrs.id === this.options.meId
    return [
      'span',
      { 'data-mention': '', 'data-id': node.attrs.id, 'data-label': node.attrs.label, class: 'tf-mention', ...(me ? { 'data-me': '' } : {}) },
      `@${node.attrs.label}`,
    ]
  },
  renderText({ node }) {
    return `@${node.attrs.label}`
  },
})

/** Resalta los códigos de tarea («WEB-12») mientras se escribe, fuera del código. */
const TaskRefHighlight = Extension.create({
  name: 'taskRefHighlight',
  addProseMirrorPlugins() {
    const build = (doc) => {
      const decorations = []
      doc.descendants((node, pos, parent) => {
        if (node.type.name === 'codeBlock') return false
        if (!node.isText || parent?.type.name === 'codeBlock') return true
        if (node.marks.some((mark) => mark.type.name === 'code' || mark.type.name === 'link')) return true
        for (const [from, to] of taskRefRanges(node.text)) {
          decorations.push(Decoration.inline(pos + from, pos + to, { class: 'tf-taskref' }))
        }
        return true
      })
      return DecorationSet.create(doc, decorations)
    }
    return [
      new Plugin({
        key: new PluginKey('tfTaskRefs'),
        state: {
          init: (_, state) => build(state.doc),
          apply: (tr, old) => (tr.docChanged ? build(tr.doc) : old),
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})

/**
 * «- [ ] » como en Markdown: «[ ] » (o «[x] ») al principio de un punto de una lista lo vuelve lista de tareas.
 * (La regla de TaskItem solo funciona fuera de una lista.)
 */
const TaskFromBullet = Extension.create({
  name: 'taskFromBullet',
  addInputRules() {
    return [
      new InputRule({
        find: /^\s*\[([ xX]?)\]\s$/,
        handler: ({ state, range, match, chain }) => {
          const $from = state.doc.resolve(range.from)
          if ($from.parent.type.name !== 'paragraph' || $from.node(-1)?.type.name !== 'listItem') return null
          chain()
            .deleteRange(range)
            .toggleTaskList()
            .updateAttributes('taskItem', { checked: match[1]?.toLowerCase() === 'x' })
            .run()
          return undefined
        },
      }),
    ]
  },
})

/**
 * Código en línea: Enter al final no lo lleva a la línea siguiente, y → al final sale del código con `exitMark` (sin
 * el espacio que agrega TipTap con `exitable`).
 */
const InlineCode = Code.extend({ exitable: false, keepOnSplit: false })

/** Marcas de las que se sale con → al final de la línea; del código, en cualquier lugar (como en Notion o Plane). */
const EXIT_AT_LINE_END = new Set(['bold', 'italic', 'strike'])

/**
 * → con el cursor al final de una marca: lo que se escriba después va sin ella (el cursor no se mueve; un segundo →
 * sí lo mueve). Para el código, en cualquier lugar donde la letra siguiente no sea código; para negrita, cursiva y
 * tachado, solo al final de la línea (en medio del texto, → sigue moviendo el cursor como siempre).
 * @param {import('@tiptap/pm/state').EditorState} state
 * @param {(tr: import('@tiptap/pm/state').Transaction) => void} [dispatch]
 */
export function exitMark(state, dispatch) {
  const { selection } = state
  if (!selection.empty) return false
  const $pos = selection.$from
  if (!$pos.parent.isTextblock || $pos.parent.type.spec.code) return false
  const active = state.storedMarks ?? $pos.marks()
  const atLineEnd = $pos.parentOffset === $pos.parent.content.size
  const next = $pos.nodeAfter?.marks ?? []
  const leaving = active.filter(
    (mark) => (mark.type.name === 'code' || (atLineEnd && EXIT_AT_LINE_END.has(mark.type.name))) && !mark.isInSet(next),
  )
  if (!leaving.length) return false
  dispatch?.(state.tr.setStoredMarks(active.filter((mark) => !leaving.includes(mark))))
  return true
}

const MarkExit = Extension.create({
  name: 'tfMarkExit',
  priority: 1000,
  addKeyboardShortcuts() {
    return { ArrowRight: ({ editor }) => exitMark(editor.state, editor.view.dispatch) }
  },
})

/** Atajos propios (antes que los de StarterKit). */
function shortcuts(bridge) {
  return Extension.create({
    name: 'tfShortcuts',
    priority: 1000,
    addKeyboardShortcuts() {
      return {
        // Terminar / enviar; nunca un salto de línea (ese va con mayús + enter)
        'Mod-Enter': () => {
          bridge.current.onSubmit?.()
          return true
        },
        'Mod-k': () => {
          bridge.current.openLink?.()
          return true
        },
        'Mod-Shift-x': () => this.editor.commands.toggleStrike(),
        'Mod-/': () => {
          bridge.current.openHelp?.()
          return true
        },
      }
    },
  })
}

/** Menú de sugerencias («/» o «@»): el estado y las teclas los maneja el componente. */
function suggestion({ name, key, char, bridge, allow, allowSpaces = false }) {
  return Extension.create({
    // Otro nombre que el nodo (la mención también se llama «mention»)
    name: `${name}Suggestion`,
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          pluginKey: key,
          char,
          allowSpaces,
          allow: (props) => {
            const { state, range } = props
            const $from = state.doc.resolve(range.from)
            if ($from.parent.type.name === 'codeBlock' || $from.marks().some((mark) => mark.type.name === 'code')) return false
            return allow ? allow(props) : true
          },
          items: () => [],
          command: ({ editor, range, props }) => bridge.current[name]?.select(editor, range, props),
          render: () => ({
            onStart: (props) => bridge.current[name]?.open(props),
            onUpdate: (props) => bridge.current[name]?.open(props),
            onExit: () => bridge.current[name]?.close(),
            onKeyDown: ({ event }) => bridge.current[name]?.keyDown(event) ?? false,
          }),
        }),
      ]
    },
  })
}

/**
 * @param {{ bridge: Bridge, placeholder?: string, meId?: string | null }} options
 */
export function buildExtensions({ bridge, placeholder, meId }) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      underline: false,
      code: false,
      codeBlock: false,
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: 'https',
        isAllowedUri: (url, { defaultValidate }) => defaultValidate(url) && !/^\s*(javascript|data|vbscript):/i.test(url),
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer', class: null },
      },
      dropcursor: { color: 'var(--ring)', width: 2 },
    }),
    InlineCode,
    MarkExit,
    CodeBlock.extend({
      addNodeView() {
        return ReactNodeViewRenderer(CodeBlockNodeView)
      },
    }).configure({ defaultLanguage: null, enableTabIndentation: true }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: false, allowTableNodeSelection: true }),
    TableRow,
    TableHeader,
    TableCell,
    Mention.configure({ meId }),
    TaskRefHighlight,
    TaskFromBullet,
    Placeholder.configure({ placeholder: placeholder ?? '', showOnlyCurrent: true, includeChildren: false }),
    shortcuts(bridge),
    suggestion({ name: 'slash', key: SLASH_KEY, char: '/', bridge }),
    suggestion({
      name: 'mention',
      key: MENTION_KEY,
      char: '@',
      bridge,
      allowSpaces: true,
      // Como en los comentarios: hasta 40 letras, sin empezar con espacio ni dos espacios seguidos
      allow: ({ state, range }) => {
        const query = state.doc.textBetween(range.from, range.to).slice(1)
        return query.length <= 40 && !/^\s|\s{2}/.test(query)
      },
    }),
  ]
}
