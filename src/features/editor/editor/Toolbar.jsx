import { ArrowRight, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { EditorIcon, ICON_STROKE } from './icons'

/** Tipos de bloque del selector («Texto», «Título 2»…), con su atajo. */
export const BLOCK_TYPES = [
  { value: 'text', label: 'Texto', run: (chain) => chain.clearNodes() },
  { value: 'h1', label: 'Título 1', kbd: '#', run: (chain) => chain.clearNodes().setHeading({ level: 1 }) },
  { value: 'h2', label: 'Título 2', kbd: '##', run: (chain) => chain.clearNodes().setHeading({ level: 2 }) },
  { value: 'h3', label: 'Título 3', kbd: '###', run: (chain) => chain.clearNodes().setHeading({ level: 3 }) },
  { value: 'bullet', label: 'Lista', kbd: '-', run: (chain) => chain.toggleBulletList() },
  { value: 'ordered', label: 'Lista numerada', kbd: '1.', run: (chain) => chain.toggleOrderedList() },
  { value: 'task', label: 'Lista de tareas', kbd: '[ ]', run: (chain) => chain.toggleTaskList() },
  { value: 'quote', label: 'Cita', kbd: '>', run: (chain) => chain.toggleBlockquote() },
  { value: 'code', label: 'Código', kbd: '```', run: (chain) => chain.toggleCodeBlock() },
]

/** El tipo del bloque donde está el cursor. */
export function currentBlockType(editor) {
  if (editor.isActive('codeBlock')) return 'code'
  for (const level of [1, 2, 3]) if (editor.isActive('heading', { level })) return `h${level}`
  if (editor.isActive('taskList')) return 'task'
  if (editor.isActive('orderedList')) return 'ordered'
  if (editor.isActive('bulletList')) return 'bullet'
  if (editor.isActive('blockquote')) return 'quote'
  return 'text'
}

const MARKS = [
  { name: 'bold', label: 'Negrita', kbd: 'ctrl B', run: (chain) => chain.toggleBold() },
  { name: 'italic', label: 'Cursiva', kbd: 'ctrl I', run: (chain) => chain.toggleItalic() },
  { name: 'strike', label: 'Tachado', kbd: 'ctrl shift X', run: (chain) => chain.toggleStrike() },
  { name: 'code', label: 'Código', kbd: 'ctrl E', run: (chain) => chain.toggleCode() },
]
const LISTS = [
  { name: 'bullet', label: 'Lista', kbd: 'ctrl shift 8', active: 'bulletList', run: (chain) => chain.toggleBulletList() },
  { name: 'ordered', label: 'Lista numerada', kbd: 'ctrl shift 7', active: 'orderedList', run: (chain) => chain.toggleOrderedList() },
  { name: 'task', label: 'Lista de tareas', kbd: 'ctrl shift 9', active: 'taskList', run: (chain) => chain.toggleTaskList() },
]
const BLOCKS = [
  { name: 'quote', label: 'Cita', kbd: 'ctrl shift B', active: 'blockquote', run: (chain) => chain.toggleBlockquote() },
  { name: 'codeBlock', label: 'Bloque de código', kbd: 'ctrl alt C', active: 'codeBlock', run: (chain) => chain.toggleCodeBlock() },
  { name: 'table', label: 'Tabla', kbd: '', run: (chain) => chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }) },
  { name: 'divider', label: 'Separador', kbd: '---', run: (chain) => chain.setHorizontalRule() },
]
export const IMAGE_SOON = 'Imágenes: solo en la descripción y los comentarios de una tarea'

/** Botón de la barra: no le quita el foco al editor. */
export function ToolButton({ icon, label, kbd, pressed, disabled, onClick, size = 30, className, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed === undefined ? undefined : Boolean(pressed)}
      aria-disabled={disabled || undefined}
      title={kbd ? `${label} · ${kbd}` : label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={disabled ? undefined : onClick}
      style={{ width: children ? undefined : size, height: size }}
      className={cn(
        'flex shrink-0 items-center justify-center gap-1.5 rounded-lg transition-colors duration-100',
        pressed ? 'bg-accent-soft text-accent-text' : 'text-foreground hover:bg-muted',
        disabled && 'cursor-not-allowed text-dash hover:bg-transparent',
        children && 'px-2 text-[12.5px] font-medium',
        className,
      )}
    >
      {icon && <EditorIcon name={icon} size={size < 30 ? 15 : 16} strokeWidth={ICON_STROKE[icon] ?? 2} />}
      {children}
    </button>
  )
}

/**
 * «Imagen»: abre el selector de archivos (también se puede pegar o soltar). Sin `onImage` (un editor fuera de una
 * tarea), deshabilitado con su aviso al pasar el mouse.
 */
export function ImageButton({ size, onImage }) {
  if (onImage) return <ToolButton icon="image" label="Imagen · también puedes pegar o soltar" size={size} onClick={onImage} />
  return <ImageSoonButton size={size} />
}

/** Botón de imagen deshabilitado, con su aviso al pasar el mouse. */
export function ImageSoonButton({ size }) {
  return (
    <span className="group/img relative flex">
      <ToolButton icon="image" label="Imagen (solo en las tareas)" disabled size={size} />
      <span
        role="tooltip"
        className="pointer-events-none absolute top-[calc(100%+8px)] right-[-6px] z-40 hidden w-max rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg group-hover/img:block"
      >
        {IMAGE_SOON}
      </span>
    </span>
  )
}

const Group = ({ children, first }) => (
  <span className={cn('flex items-center gap-0.5', !first && 'ml-0.5 border-l pl-1.5')}>{children}</span>
)

/**
 * Barra de formato. `variant`: `full` (página de la tarea), `panel` (panel lateral: lo menos usado va en «⋯ Más»)
 * o `compact` (Nueva tarea y plantillas). Muestra además las acciones del contexto: la tabla donde está el cursor
 * o «Pasar al checklist» en una casilla.
 */
export function Toolbar({ editor, state, variant = 'full', sticky = false, onLink, onHelp, onMoveTasks, onImage, className }) {
  const run = (action) => action(editor.chain().focus()).run()
  const size = variant === 'compact' ? 28 : 30
  const blockType = BLOCK_TYPES.find((type) => type.value === state.blockType) ?? BLOCK_TYPES[0]
  const markButtons = (variant === 'compact' ? MARKS.filter((mark) => mark.name !== 'strike') : MARKS).map((mark) => (
    <ToolButton key={mark.name} icon={mark.name === 'code' ? 'code' : mark.name} label={mark.label} kbd={mark.kbd} size={size} pressed={state.marks[mark.name]} onClick={() => run(mark.run)} />
  ))
  const listButtons = LISTS.map((list) => (
    <ToolButton key={list.name} icon={list.name} label={list.label} kbd={list.kbd} size={size} pressed={state.blockType === list.name} onClick={() => run(list.run)} />
  ))
  const blockButtons = BLOCKS.map((block) => (
    <ToolButton key={block.name} icon={block.name} label={block.label} kbd={block.kbd} size={size} pressed={block.active ? state.active[block.active] : false} onClick={() => run(block.run)} />
  ))

  return (
    <div
      role="toolbar"
      aria-label="Formato"
      className={cn(
        'flex flex-wrap items-center gap-0.5 border-b bg-card',
        variant === 'compact' ? 'px-1.5 py-1' : 'px-2 py-1.5',
        sticky && 'sticky top-0 z-20 rounded-t-[13px]',
        className,
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Tipo de bloque: ${blockType.label}`}
            className={cn(
              'mr-1 flex items-center gap-1.5 rounded-lg bg-muted pr-2 pl-2.5 font-medium hover:bg-column',
              variant === 'compact' ? 'h-7 text-[12.5px]' : 'h-[30px] text-[13px]',
            )}
          >
            {blockType.label}
            <ChevronDown className="size-3 text-muted-foreground" strokeWidth={2.4} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-48" onCloseAutoFocus={(event) => event.preventDefault()}>
          {BLOCK_TYPES.map((type) => (
            <DropdownMenuItem key={type.value} onSelect={() => run(type.run)} className={cn(type.value === state.blockType && 'bg-accent-soft text-accent-text')}>
              {type.label}
              {type.kbd && <DropdownMenuShortcut className="font-mono">{type.kbd}</DropdownMenuShortcut>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Group first>
        {markButtons}
        <ToolButton icon="link" label="Enlace" kbd="ctrl K" size={size} pressed={state.marks.link} onClick={onLink} />
      </Group>
      <Group>{listButtons}</Group>

      {variant === 'panel' && onImage && (
        <Group>
          <ImageButton size={size} onImage={onImage} />
        </Group>
      )}
      {variant === 'panel' ? (
        <Group>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Más formatos" title="Más formatos" className="flex h-[30px] items-center gap-1 rounded-lg px-2 text-[12.5px] font-medium hover:bg-muted">
                <span aria-hidden="true">⋯</span> Más
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-56" onCloseAutoFocus={(event) => event.preventDefault()}>
              {BLOCKS.map((block) => (
                <DropdownMenuItem key={block.name} onSelect={() => run(block.run)}>
                  <EditorIcon name={block.name} size={15} strokeWidth={ICON_STROKE[block.name] ?? 2} />
                  {block.label}
                  {block.kbd && <DropdownMenuShortcut className="font-mono">{block.kbd}</DropdownMenuShortcut>}
                </DropdownMenuItem>
              ))}
              {!onImage && (
                <DropdownMenuItem disabled title={IMAGE_SOON}>
                  <EditorIcon name="image" size={15} />
                  Imagen
                  <DropdownMenuShortcut>en tareas</DropdownMenuShortcut>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onHelp}>
                Atajos de teclado
                <DropdownMenuShortcut className="font-mono">ctrl /</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Group>
      ) : (
        <Group>{variant === 'compact' ? blockButtons.slice(0, 3) : blockButtons}</Group>
      )}
      {(variant === 'full' || (variant === 'compact' && onImage)) && (
        <Group>
          <ImageButton size={size} onImage={onImage} />
        </Group>
      )}

      {state.inTable && <TableMenu editor={editor} size={size} />}
      {state.inTask && onMoveTasks && (
        <Group>
          <ToolButton label="Pasar al checklist de la tarea" size={size} onClick={onMoveTasks}>
            <ArrowRight className="size-3.5" />
            checklist
          </ToolButton>
        </Group>
      )}

      {variant === 'full' && (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onHelp}
          aria-label="Atajos de teclado"
          title="Atajos · ctrl /"
          className="ml-auto flex h-[30px] items-center rounded-lg px-2 font-mono text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          ctrl /
        </button>
      )}
    </div>
  )
}

function TableMenu({ editor, size }) {
  const run = (action) => action(editor.chain().focus()).run()
  return (
    <Group>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" style={{ height: size }} className="flex items-center gap-1 rounded-lg bg-accent-soft px-2 text-[12.5px] font-medium text-accent-text">
            <EditorIcon name="table" size={14} />
            Tabla
            <ChevronDown className="size-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-52" onCloseAutoFocus={(event) => event.preventDefault()}>
          <DropdownMenuItem onSelect={() => run((chain) => chain.addRowAfter())}>Agregar fila debajo</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run((chain) => chain.addColumnAfter())}>Agregar columna a la derecha</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => run((chain) => chain.deleteRow())}>Quitar fila</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run((chain) => chain.deleteColumn())}>Quitar columna</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => run((chain) => chain.deleteTable())}>
            Quitar tabla
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Group>
  )
}
