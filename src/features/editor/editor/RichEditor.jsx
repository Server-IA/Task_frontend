import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getMarkRange } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { exitSuggestion } from '@tiptap/suggestion'
import { toast } from 'sonner'
import { IMAGE_ACCEPT, isImageFile, pastedName, renameFile, validateFile } from '@/features/files/fileTypes'
import { uploadQueue } from '@/features/files/uploadQueue'
import { filterPeople, mentionName } from '@/features/mentions/mentions'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/sessionStore'
import { normalizeHref } from '../markdown/links'
import { markdownToDoc } from '../markdown/parse'
import { docToMarkdown } from '../markdown/serialize'
import { removeMovedTaskItems, takeTaskItems } from '../markdown/taskItems'
import { isTaskCode } from '../markdown/taskRefs'
import { BubbleBar } from './BubbleBar'
import { buildExtensions, MENTION_KEY, SLASH_KEY } from './extensions'
import { codeReplacement, findText } from './findText'
import { syncUploadingImages } from './imageExtension'
import { LinkPopover } from './LinkPopover'
import { caretRect, popupPosition } from './popups'
import { ShortcutsDialog } from './ShortcutsDialog'
import { MentionMenu, slashGroups, SlashMenu } from './SuggestionMenus'
import { TaskSearchPopover } from './TaskSearchPopover'
import { currentBlockType, Toolbar } from './Toolbar'

/** Texto pegado que parece Markdown (títulos, listas, código, tablas, negritas, enlaces). */
const looksLikeMarkdown = (text) =>
  /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s?|```|\|.+\|\s*$)/m.test(text) || /\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\s]+\)|`[^`\n]+`|~~[^~\n]+~~/.test(text)

/** Casillas (numeradas en el orden del documento) cuyo primer párrafo toca el rango. */
function taskIndexesIn(doc, from, to) {
  const indexes = []
  let index = 0
  doc.descendants((node, pos) => {
    if (node.type.name !== 'taskItem') return true
    const start = pos + 1
    const end = start + (node.firstChild?.nodeSize ?? 0)
    if (start <= to && end >= from) indexes.push(index)
    index += 1
    return true
  })
  return indexes
}

/**
 * Puente entre las extensiones (que corren fuera de React) y el componente: `current` tiene los manejadores del
 * último render.
 */
function createBridge() {
  return {
    current: {},
    set(handlers) {
      this.current = handlers
    },
  }
}

/**
 * Posición del documento después de `index` letras (las menciones y los saltos de línea cuentan como una), la
 * inversa de `textIndexFromPoint` de la vista de lectura.
 */
function posFromTextIndex(doc, index) {
  let count = 0
  let found = null
  doc.descendants((node, pos) => {
    if (found != null) return false
    if (node.isText) {
      if (count + node.text.length >= index) found = pos + (index - count)
      else count += node.text.length
    } else if (node.isInline && node.isLeaf) {
      if (count + 1 > index) found = pos
      else count += 1
    }
    return found == null
  })
  return found
}

/**
 * Editor de texto con formato que guarda Markdown (descripciones, comentarios, Nueva tarea y plantillas).
 * Se carga aparte (React.lazy, ver LazyRichEditor): ProseMirror no entra en el paquete principal.
 *
 * - `value` / `onChange(markdown)`: si `value` cambia desde afuera (aplicar una plantilla, «Deshacer») el
 *   contenido se reemplaza; lo que el editor emite no lo reinicia.
 * - `toolbar`: `full`, `panel` (lo menos usado en «⋯ Más»), `compact` o `false` (solo «/» y la barra flotante).
 * - `people`: personas para «@»; `slug` habilita «Enlazar tarea» (busca en el workspace).
 * - `onSubmit` recibe ctrl ↵; `onEscape`, la tecla Escape cuando no hay ningún menú abierto (sin ella, Escape
 *   sigue su camino: por ejemplo, cierra el diálogo).
 * - `onCreateSubtask(texto, reemplazar)` y `onMoveTasks(casillas)` agregan «Crear subtarea» y «Pasar al checklist».
 * - `initialCaret`: dónde dejar el cursor al abrir: `{ index }` (letras desde el principio, ver caret.js) o
 *   `{ x, y }` relativos al texto (el clic que abrió el editor); `{}` = al final.
 * - `apiRef.current`: `{ focus, getMarkdown, setMarkdown, replaceText }`.
 * - `onCommandChange(abierto)`: avisa cuando se abre o se cierra un menú de comando (el «/», las personas de «@» o
 *   la búsqueda de tareas). Mientras hay uno abierto, lo escrito está a medias (por ejemplo, para no guardarlo solo).
 * - `imageUpload`: `{ target, onOtherFiles? }` habilita las imágenes (pegar, soltar, «Imagen» y «/imagen»): entran
 *   donde está el cursor con su vista previa y suben por detrás (`target`, ver features/files/uploads.js); al terminar,
 *   quedan como `![nombre](/files/<id>)`. Los archivos que no son imágenes van a `onOtherFiles` (en la descripción, a
 *   Adjuntos); sin él, se avisa que solo se aceptan imágenes. `onUploadsChange(n)` avisa cuántas siguen subiendo.
 */
export default function RichEditor({
  value = '',
  onChange,
  size = 'md',
  toolbar = false,
  stickyToolbar = false,
  placeholder = 'Escribe, o pulsa / para insertar',
  people = [],
  slug,
  projectIdentifier,
  autoFocus = false,
  initialCaret,
  onSubmit,
  onEscape,
  onCreateSubtask,
  onMoveTasks,
  apiRef,
  onCommandChange,
  imageUpload,
  onUploadsChange,
  ariaLabel = 'Descripción',
  className,
  contentClassName,
}) {
  const meId = useSessionStore((state) => state.user?.id)
  const fileInputRef = useRef(null)
  // Las subidas de este editor en la cola de la app
  const [uploadScope] = useState(() => `editor:${Math.random().toString(36).slice(2)}`)
  // Puente con las extensiones (lo llaman desde afuera de React); se llena en cada render
  const [bridge] = useState(createBridge)
  const lastValueRef = useRef(value)
  const [root, setRoot] = useState(null)
  const [slash, setSlash] = useState(null)
  const [slashActive, setSlashActive] = useState(null)
  const [mention, setMention] = useState(null)
  const [mentionActive, setMentionActive] = useState(0)
  const [link, setLink] = useState(null)
  const [taskSearch, setTaskSearch] = useState(null)
  const [help, setHelp] = useState(false)
  const [pointerDown, setPointerDown] = useState(false)
  const [creating, setCreating] = useState(false)
  const [caret] = useState(initialCaret)
  const [extensions] = useState(() => buildExtensions({ bridge, placeholder, meId }))
  const [initialContent] = useState(() => markdownToDoc(value))

  const editor = useEditor(
    {
      extensions,
      content: initialContent,
      autofocus: autoFocus && !caret ? 'end' : false,
      editorProps: {
        attributes: {
          class: cn('tf-md', size === 'sm' && 'tf-md-sm', contentClassName),
          'aria-label': ariaLabel,
        },
        handlePaste: (view, event) => bridge.current.paste?.(event) ?? false,
        handleDrop: (view, event, slice, moved) => bridge.current.drop?.(view, event, moved) ?? false,
        handleClick: (view, pos) => bridge.current.click?.(pos) ?? false,
        // Copiar desde el editor deja Markdown como texto plano
        clipboardTextSerializer: (slice) => docToMarkdown({ type: 'doc', content: slice.content.toJSON() ?? [] }),
      },
      onUpdate: ({ editor: current }) => bridge.current.update?.(current),
    },
    [],
  )

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) return null
      const { selection } = current.state
      return {
        from: selection.from,
        to: selection.to,
        empty: selection.empty,
        isText: selection instanceof TextSelection,
        sameBlock: selection.$from.parent === selection.$to.parent,
        focused: current.isFocused,
        blockType: currentBlockType(current),
        marks: {
          bold: current.isActive('bold'),
          italic: current.isActive('italic'),
          strike: current.isActive('strike'),
          code: current.isActive('code'),
          link: current.isActive('link'),
        },
        active: { blockquote: current.isActive('blockquote'), codeBlock: current.isActive('codeBlock') },
        inTable: current.isActive('table'),
        inTask: current.isActive('taskItem'),
      }
    },
  })

  // Si el valor cambia desde afuera (plantilla, «Deshacer», otra versión), se reemplaza el contenido
  useEffect(() => {
    if (!editor || value === lastValueRef.current) return
    lastValueRef.current = value
    editor.commands.setContent(markdownToDoc(value), { emitUpdate: false })
  }, [editor, value])

  // El cursor donde se hizo clic para entrar a editar
  useEffect(() => {
    if (!editor || !caret) return undefined
    const frame = requestAnimationFrame(() => {
      if (editor.isDestroyed) return
      // `caret` es relativo al texto (sin el relleno del editor)
      const box = editor.view.dom.getBoundingClientRect()
      const style = getComputedStyle(editor.view.dom)
      const left = box.left + parseFloat(style.paddingLeft) + (caret.x ?? 0)
      const top = box.top + parseFloat(style.paddingTop) + (caret.y ?? 0)
      const pos = caret.index != null ? posFromTextIndex(editor.state.doc, caret.index) : null
      const found = pos == null && caret.x != null ? editor.view.posAtCoords({ left, top })?.pos : null
      editor.chain().focus(pos ?? found ?? 'end', { scrollIntoView: false }).run()
    })
    return () => cancelAnimationFrame(frame)
  }, [editor, caret])

  useEffect(() => {
    if (!apiRef || !editor) return undefined
    apiRef.current = {
      focus: () => editor.commands.focus(),
      getMarkdown: () => docToMarkdown(editor.getJSON()),
      setMarkdown: (markdown) => {
        lastValueRef.current = markdown
        editor.commands.setContent(markdownToDoc(markdown), { emitUpdate: false })
      },
      replaceText: (search, replacement) => {
        if (editor.isDestroyed) return false
        const range = findText(editor.state.doc, search)
        if (!range) return false
        editor.chain().insertContentAt(range, replacement).run()
        return true
      },
      /** Inserta imágenes donde está el cursor (lo demás va a `imageUpload.onOtherFiles`). */
      insertFiles: (files) => bridge.current.insertFiles?.(files) ?? false,
      openImagePicker: () => fileInputRef.current?.click(),
      /** Imágenes que siguen subiendo. */
      pendingUploads: () => syncUploadingImages(editor, uploadQueue.get),
    }
    return () => {
      apiRef.current = null
    }
  }, [apiRef, editor, bridge])

  // Las imágenes que suben: al terminar pasan a su referencia y al cancelarse se quitan; se avisa cuántas faltan
  const onUploadsChangeRef = useRef(onUploadsChange)
  useLayoutEffect(() => {
    onUploadsChangeRef.current = onUploadsChange
  })
  useEffect(() => {
    if (!editor) return undefined
    let last = -1
    let scheduled = false
    const sync = () => {
      scheduled = false
      const pending = syncUploadingImages(editor, uploadQueue.get)
      if (pending !== last) {
        last = pending
        onUploadsChangeRef.current?.(pending)
      }
    }
    // Después de cada cambio del documento (deshacer puede devolver una imagen que ya terminó de subir)
    const later = () => {
      if (scheduled) return
      scheduled = true
      queueMicrotask(sync)
    }
    sync()
    const unsubscribe = uploadQueue.subscribe(sync)
    editor.on('update', later)
    return () => {
      unsubscribe()
      editor.off('update', later)
    }
  }, [editor])

  // Mientras se arrastra para seleccionar, la barra flotante espera a que se suelte el botón
  useEffect(() => {
    if (!pointerDown) return undefined
    const up = () => setPointerDown(false)
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [pointerDown])

  // Escape: primero cierra el menú abierto; si no hay ninguno, termina (onEscape). Va en la captura de la ventana
  // para llegar antes que el panel o el diálogo que contiene al editor.
  useEffect(() => {
    if (!root || !editor) return undefined
    const onKeyDown = (event) => {
      if (event.key !== 'Escape' || !root.contains(event.target)) return
      if (slash) exitSuggestion(editor.view, SLASH_KEY)
      else if (mention) exitSuggestion(editor.view, MENTION_KEY)
      else if (link || taskSearch) {
        setLink(null)
        setTaskSearch(null)
        editor.commands.focus()
      } else if (onEscape) onEscape()
      else return
      event.preventDefault()
      event.stopPropagation()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [root, editor, slash, mention, link, taskSearch, onEscape])

  // Un clic fuera del editor cierra el enlace y la búsqueda de tareas
  useEffect(() => {
    if (!root || (!link && !taskSearch)) return undefined
    const onDown = (event) => {
      if (root.contains(event.target)) return
      setLink(null)
      setTaskSearch(null)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [root, link, taskSearch])

  const features = { people: people.length > 0, tasks: Boolean(slug), taskHint: projectIdentifier, images: Boolean(imageUpload) }
  const groups = slash ? slashGroups(slash.query, features) : []
  const slashItems = groups.flatMap((group) => group.items).filter((item) => !item.disabled)
  const slashCurrent = slashItems.some((item) => item.id === slashActive) ? slashActive : slashItems[0]?.id
  const candidates = mention ? filterPeople(people.filter((person) => person.id !== meId), mention.query) : []
  const mentionIndex = Math.min(mentionActive, Math.max(candidates.length - 1, 0))
  // Un menú de comando a la vista: lo escrito es un comando a medias («/lista de», «@Lu»)
  const commandOpen = Boolean((slash && groups.length > 0) || (mention && candidates.length > 0) || taskSearch)
  const onCommandChangeRef = useRef(onCommandChange)
  useLayoutEffect(() => {
    onCommandChangeRef.current = onCommandChange
  })
  const commandWasOpen = useRef(false)
  useEffect(() => {
    if (commandOpen === commandWasOpen.current) return
    commandWasOpen.current = commandOpen
    onCommandChangeRef.current?.(commandOpen)
  }, [commandOpen])

  const openLink = (pos) => {
    if (!editor) return
    const { state: editorState } = editor
    let { from, to } = editorState.selection
    if (typeof pos === 'number') from = to = pos
    const linkType = editorState.schema.marks.link
    const $from = editorState.doc.resolve(from)
    const range = getMarkRange($from, linkType)
    let existing = null
    if (range && from >= range.from && to <= range.to) {
      from = range.from
      to = range.to
      existing = [...($from.nodeAfter?.marks ?? []), ...$from.marks()].find((mark) => mark.type === linkType)
    }
    setLink({
      key: Date.now(),
      from,
      to,
      text: editorState.doc.textBetween(from, to, ' '),
      href: existing?.attrs.href ?? '',
      existing: Boolean(existing),
    })
  }

  const applyLink = ({ text, href }) => {
    const { from, to } = link
    const target = href.trim()
    const chain = editor.chain().focus()
    if (isTaskCode(target)) {
      // Un código de tarea queda como texto: la vista lo dibuja como pastilla
      chain.insertContentAt({ from, to }, `${target.toUpperCase()} `).run()
    } else {
      const url = normalizeHref(target)
      const label = text.trim() || url
      if (from < to && label === link.text) {
        chain.setTextSelection({ from, to }).setLink({ href: url }).setTextSelection(to).run()
      } else {
        chain.insertContentAt({ from, to }, { type: 'text', text: label, marks: [{ type: 'link', attrs: { href: url } }] }).run()
      }
    }
    setLink(null)
  }

  const removeLink = () => {
    editor.chain().focus().setTextSelection({ from: link.from, to: link.to }).unsetLink().setTextSelection(link.to).run()
    setLink(null)
  }

  const moveTasks = () => {
    const { from, to } = editor.state.selection
    const indexes = taskIndexesIn(editor.state.doc, from, to)
    if (!indexes.length) return
    const before = editor.getJSON()
    const { doc, items } = takeTaskItems(before, indexes)
    editor.commands.setContent(doc, { emitUpdate: true })
    editor.commands.focus()
    const after = editor.state.doc
    // Las casillas cuyos pasos no se crearon (los últimos: se crean en orden) vuelven: a su lugar si no se escribió
    // nada más; si no, al final. Así ningún paso queda ni en ambos lados ni en ninguno
    const restore = (created) => {
      if (created >= items.length || editor.isDestroyed) return
      if (editor.state.doc.eq(after)) {
        editor.commands.setContent(removeMovedTaskItems(before, indexes, created), { emitUpdate: true })
        return
      }
      editor.commands.insertContentAt(editor.state.doc.content.size, {
        type: 'taskList',
        content: items.slice(created).map((item) => ({
          type: 'taskItem',
          attrs: { checked: item.checked },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: item.text }] }],
        })),
      })
    }
    Promise.resolve(onMoveTasks(items)).then(
      (created) => restore(typeof created === 'number' ? created : 0),
      () => restore(0),
    )
  }

  const createSubtask = async () => {
    const { from, to } = editor.state.selection
    const raw = editor.state.doc.textBetween(from, to, ' ')
    const text = raw.replace(/\s+/g, ' ').trim().slice(0, 255)
    if (!text) return
    // El rango sigue a los cambios que haya mientras se crea la subtarea
    let range = { from: from + (raw.length - raw.trimStart().length), to: to - (raw.length - raw.trimEnd().length) }
    const track = ({ transaction }) => {
      range = { from: transaction.mapping.map(range.from, 1), to: transaction.mapping.map(range.to, -1) }
    }
    editor.on('transaction', track)
    setCreating(true)
    try {
      await onCreateSubtask(text, (replacement) => {
        if (editor.isDestroyed || range.from >= range.to) return false
        editor.chain().insertContentAt(range, codeReplacement(editor.state.doc, range, replacement)).run()
        return true
      })
    } finally {
      editor.off('transaction', track)
      setCreating(false)
    }
  }

  // Lo que las extensiones llaman desde afuera de React, siempre con los valores de este render
  useLayoutEffect(() => {
    bridge.set({
      onSubmit: () => onSubmit?.(),
      openLink: () => openLink(),
      openHelp: () => setHelp(true),
      update: (current) => {
        const markdown = docToMarkdown(current.getJSON())
        lastValueRef.current = markdown
        onChange?.(markdown)
      },
      insertFiles: (files, pos) => {
        if (!editor || !imageUpload) return false
        const list = [...files]
        const nodes = []
        for (const original of list.filter(isImageFile)) {
          const file = renameFile(original, pastedName(original))
          const check = validateFile(file, { imagesOnly: true })
          if (!check.ok) {
            toast.error(`${check.error} No se pegó.`)
            continue
          }
          const uploadId = uploadQueue.add(file, { target: imageUpload.target, scope: uploadScope, contentType: check.contentType })
          nodes.push({ type: 'image', attrs: { src: URL.createObjectURL(file), alt: file.name, uploadId } })
        }
        if (nodes.length) {
          const chain = editor.chain().focus()
          ;(typeof pos === 'number' ? chain.insertContentAt(pos, nodes) : chain.insertContent(nodes)).run()
          imageUpload.onInserted?.(nodes.length)
        }
        const others = list.filter((file) => !isImageFile(file))
        if (others.length) {
          if (imageUpload.onOtherFiles) imageUpload.onOtherFiles(others)
          else toast.error(others.length === 1 ? `«${others[0].name}» no es una imagen` : 'Algunos archivos no son imágenes', { description: 'Aquí solo se pueden pegar imágenes PNG, JPG, GIF o WebP.' })
        }
        return true
      },
      drop: (view, event, moved) => {
        const files = event.dataTransfer?.files
        if (moved || !files?.length || !imageUpload) return false
        // Lo soltado sobre el editor entra aquí (y no llega a la zona de Adjuntos del panel)
        event.preventDefault()
        event.stopPropagation()
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        bridge.current.insertFiles?.(files, pos)
        return true
      },
      paste: (event) => {
        const text = event.clipboardData?.getData('text/plain')
        const html = event.clipboardData?.getData('text/html') ?? ''
        const files = event.clipboardData?.files
        // Una captura o una imagen copiada (sin texto: Word y Excel copian además una imagen del texto, que no se pega)
        if (files?.length && imageUpload && !text?.trim()) return bridge.current.insertFiles?.(files) ?? false
        if (!text || !editor || editor.isActive('codeBlock') || editor.isActive('code')) return false
        // Copiado de otro editor como este: ProseMirror ya lo pega con su formato
        if (html.includes('data-pm-slice') || !looksLikeMarkdown(text)) return false
        editor.chain().focus().insertContent(markdownToDoc(text).content).run()
        return true
      },
      click: (pos) => {
        if (!editor) return false
        const $pos = editor.state.doc.resolve(pos)
        const linkType = editor.schema.marks.link
        if ([...($pos.nodeAfter?.marks ?? []), ...$pos.marks()].some((mark) => mark.type === linkType)) openLink(pos)
        return false
      },
      slash: {
        matches: (query) => slashGroups(query, features).length > 0,
        open: (props) => setSlash(props),
        close: () => {
          setSlash(null)
          setSlashActive(null)
        },
        keyDown: (event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (!slashItems.length) return false
            const at = slashItems.findIndex((item) => item.id === slashCurrent)
            const next = (at + (event.key === 'ArrowDown' ? 1 : -1) + slashItems.length) % slashItems.length
            setSlashActive(slashItems[next].id)
            document.getElementById(`slash-${slashItems[next].id}`)?.scrollIntoView({ block: 'nearest' })
            return true
          }
          if (event.key === 'Enter' || event.key === 'Tab') {
            const item = slashItems.find((option) => option.id === slashCurrent)
            if (!item) return false
            slash.command(item)
            return true
          }
          return false
        },
        select: (current, range, item) => {
          const chain = current.chain().focus().deleteRange(range)
          if (item.id === 'mention') chain.insertContent('@').run()
          else if (item.id === 'image') {
            chain.run()
            fileInputRef.current?.click()
          } else if (item.id === 'taskLink') {
            chain.run()
            const pos = current.state.selection.from
            setTaskSearch({ key: Date.now(), pos })
          } else item.run(chain).run()
        },
      },
      mention: {
        open: (props) => setMention(props),
        close: () => {
          setMention(null)
          setMentionActive(0)
        },
        keyDown: (event) => {
          if (!candidates.length) return false
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            setMentionActive((mentionIndex + (event.key === 'ArrowDown' ? 1 : -1) + candidates.length) % candidates.length)
            return true
          }
          if ((event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.shiftKey) || event.key === 'Tab') {
            mention.command(candidates[mentionIndex])
            return true
          }
          return false
        },
        select: (current, range, person) => {
          current
            .chain()
            .focus()
            .insertContentAt(range, [
              { type: 'mention', attrs: { id: person.id, label: mentionName(person.fullName) } },
              { type: 'text', text: ' ' },
            ])
            .run()
        },
      },
    })
  })

  if (!editor || !state) return null

  const taskCount = !state.empty && onMoveTasks ? taskIndexesIn(editor.state.doc, state.from, state.to).length : 0
  const showBubble = state.focused && !state.empty && state.isText && !pointerDown && !state.active.codeBlock && !link && !taskSearch
  let bubbleStyle = null
  if (showBubble && root) {
    const start = caretRect(editor.view, state.from)
    const box = root.getBoundingClientRect()
    if (start) bubbleStyle = { left: Math.max(0, Math.min(start.left - box.left - 8, box.width - 340)), bottom: box.bottom - start.top + 10 }
  }

  return (
    <div
      ref={setRoot}
      className={cn('relative', className)}
      onMouseDown={(event) => {
        if (!event.target.closest?.('.ProseMirror')) return
        setPointerDown(true)
        if (link || taskSearch) {
          setLink(null)
          setTaskSearch(null)
        }
      }}
    >
      {toolbar && (
        <Toolbar
          editor={editor}
          state={state}
          variant={toolbar}
          sticky={stickyToolbar}
          onLink={() => openLink()}
          onHelp={() => setHelp(true)}
          onMoveTasks={onMoveTasks ? moveTasks : undefined}
          onImage={imageUpload ? () => fileInputRef.current?.click() : undefined}
        />
      )}
      <EditorContent editor={editor} />
      {imageUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          hidden
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) => {
            if (event.target.files?.length) bridge.current.insertFiles?.(event.target.files)
            event.target.value = ''
          }}
        />
      )}

      {bubbleStyle && (
        <BubbleBar
          editor={editor}
          state={state}
          style={bubbleStyle}
          onLink={() => openLink()}
          onCreateSubtask={onCreateSubtask && state.sameBlock ? createSubtask : undefined}
          creating={creating}
          onMoveTasks={taskCount > 0 ? moveTasks : undefined}
          taskCount={taskCount}
        />
      )}
      {slash && groups.length > 0 && (
        <SlashMenu
          groups={groups}
          active={slashCurrent}
          onSelect={(item) => slash.command(item)}
          onHover={setSlashActive}
          style={popupPosition(slash.clientRect?.(), root, { width: 330, height: 420 })}
        />
      )}
      {mention && candidates.length > 0 && (
        <MentionMenu
          people={candidates}
          active={mentionIndex}
          onSelect={(person) => mention.command(person)}
          onHover={setMentionActive}
          style={popupPosition(mention.clientRect?.(), root, { width: 300, height: 300 })}
        />
      )}
      {link && (
        <LinkPopover
          key={link.key}
          initial={link}
          style={popupPosition(caretRect(editor.view, Math.min(link.from, editor.state.doc.content.size)), root, { width: 380, height: 260, gap: 8 })}
          onApply={applyLink}
          onRemove={removeLink}
          onClose={() => {
            setLink(null)
            editor.commands.focus()
          }}
        />
      )}
      {taskSearch && (
        <TaskSearchPopover
          key={taskSearch.key}
          slug={slug}
          style={popupPosition(caretRect(editor.view, Math.min(taskSearch.pos, editor.state.doc.content.size)), root, { width: 360, height: 340 })}
          onSelect={(issue) => {
            setTaskSearch(null)
            editor.chain().focus().insertContent(`${issue.code} `).run()
          }}
          onClose={() => {
            setTaskSearch(null)
            editor.commands.focus()
          }}
        />
      )}
      <ShortcutsDialog
        open={help}
        onOpenChange={(open) => {
          setHelp(open)
          if (!open) editor.commands.focus()
        }}
      />
    </div>
  )
}
