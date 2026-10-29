import { ArrowRight } from 'lucide-react'
import { Spinner } from '@/components/common/Loaders'
import { EditorIcon } from './icons'
import { ToolButton } from './Toolbar'

/**
 * Barra sobre el texto seleccionado: negrita, cursiva, tachado, código y enlace; «Crear subtarea» (con la
 * selección como título) y «Pasar al checklist» si la selección toca casillas.
 */
export function BubbleBar({ editor, state, style, onLink, onCreateSubtask, creating, onMoveTasks, taskCount }) {
  const run = (action) => action(editor.chain().focus()).run()
  return (
    <div
      role="toolbar"
      aria-label="Formato del texto seleccionado"
      style={style}
      onMouseDown={(event) => event.preventDefault()}
      className="tf-pop absolute z-40 flex items-center gap-0.5 rounded-xl border bg-popover p-1 whitespace-nowrap text-popover-foreground shadow-[0_14px_34px_rgb(35_32_27/0.22)]"
    >
      <ToolButton icon="bold" label="Negrita" kbd="ctrl B" pressed={state.marks.bold} onClick={() => run((chain) => chain.toggleBold())} />
      <ToolButton icon="italic" label="Cursiva" kbd="ctrl I" pressed={state.marks.italic} onClick={() => run((chain) => chain.toggleItalic())} />
      <ToolButton icon="strike" label="Tachado" kbd="ctrl shift X" pressed={state.marks.strike} onClick={() => run((chain) => chain.toggleStrike())} />
      <ToolButton icon="code" label="Código" kbd="ctrl E" pressed={state.marks.code} onClick={() => run((chain) => chain.toggleCode())} />
      <ToolButton icon="link" label="Enlace" kbd="ctrl K" pressed={state.marks.link} onClick={onLink} />
      {(onCreateSubtask || onMoveTasks) && <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />}
      {onCreateSubtask && (
        <button
          type="button"
          disabled={creating}
          onClick={onCreateSubtask}
          title="Crea una subtarea con el texto seleccionado y deja su código aquí"
          className="flex h-[30px] items-center gap-1.5 rounded-lg bg-accent-soft pr-2.5 pl-2 text-[13px] font-semibold text-accent-text hover:brightness-[0.97] disabled:opacity-70"
        >
          {creating ? <Spinner className="size-3.5" /> : <EditorIcon name="taskLink" size={15} />}
          Crear subtarea
        </button>
      )}
      {onMoveTasks && (
        <button
          type="button"
          onClick={onMoveTasks}
          title="Pasa las casillas seleccionadas al checklist de la tarea"
          className="flex h-[30px] items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium hover:bg-muted"
        >
          <ArrowRight className="size-3.5" />
          {taskCount === 1 ? 'Pasar al checklist' : `Pasar ${taskCount} al checklist`}
        </button>
      )}
    </div>
  )
}
