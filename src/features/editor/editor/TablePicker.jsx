import { useState } from 'react'
import { cn } from '@/lib/utils'

/** Cuadrícula para elegir el tamaño con el mouse; con los campos se puede pedir una tabla más grande. */
export const TABLE_GRID = { cols: 8, rows: 6 }
export const TABLE_MAX = { cols: 12, rows: 50 }

/** Lo escrito en un campo → un entero entre 1 y `max`; `null` si no es un número. */
export function tableSize(text, max) {
  if (!/^\d+$/.test(String(text).trim())) return null
  return Math.min(Math.max(Number(text), 1), max)
}

/**
 * Elegir el tamaño de la tabla antes de insertarla: se pasa el mouse por la cuadrícula y se hace clic, o se escriben
 * las columnas y las filas. Las filas cuentan el encabezado (la primera).
 * @param {{ style: React.CSSProperties, onInsert: (size: { cols: number, rows: number }) => void, onClose: () => void }} props
 */
export function TablePicker({ style, onInsert, onClose }) {
  const [text, setText] = useState({ cols: '3', rows: '3' })
  const cols = tableSize(text.cols, TABLE_MAX.cols)
  const rows = tableSize(text.rows, TABLE_MAX.rows)
  const valid = cols != null && rows != null

  const insert = () => {
    if (valid) onInsert({ cols, rows })
  }
  const field =
    'h-8 w-14 rounded-[9px] border bg-background px-2 text-center font-mono text-[13px] tabular-nums text-foreground outline-none focus:border-ring focus:shadow-[0_0_0_3px_var(--accent-soft)] dark:bg-input/30'

  return (
    // Un div y no un form: el editor puede estar dentro de otro formulario (Nueva tarea, plantillas)
    <div
      role="dialog"
      aria-label="Insertar tabla"
      style={style}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onClose()
          return
        }
        if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
        event.preventDefault()
        event.stopPropagation()
        insert()
      }}
      className="tf-pop absolute z-40 flex w-[252px] max-w-full flex-col gap-2.5 rounded-[14px] border bg-popover p-3 text-[13px] leading-snug text-popover-foreground shadow-[0_18px_44px_rgb(35_32_27/0.22)]"
    >
      <div
        aria-hidden="true"
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${TABLE_GRID.cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: TABLE_GRID.rows * TABLE_GRID.cols }, (_, index) => {
          const col = (index % TABLE_GRID.cols) + 1
          const row = Math.floor(index / TABLE_GRID.cols) + 1
          const selected = valid && col <= cols && row <= rows
          return (
            <button
              key={index}
              type="button"
              tabIndex={-1}
              // No le quita el foco al campo: Enter sigue insertando
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setText({ cols: String(col), rows: String(row) })}
              onClick={() => onInsert({ cols: col, rows: row })}
              className={cn(
                'aspect-[4/3] rounded-[5px] border transition-colors duration-75',
                selected ? (row === 1 ? 'border-accent-text bg-accent-text/70' : 'border-accent-text/60 bg-accent-soft') : 'bg-background hover:border-dash dark:bg-input/30',
              )}
            />
          )
        })}
      </div>
      <div className="flex items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Columnas
          <input
            inputMode="numeric"
            autoFocus
            value={text.cols}
            aria-invalid={cols == null}
            onFocus={(event) => event.target.select()}
            onChange={(event) => setText((current) => ({ ...current, cols: event.target.value.replace(/[^\d]/g, '').slice(0, 2) }))}
            className={field}
          />
        </label>
        <span aria-hidden="true" className="pb-1.5 text-muted-foreground">
          ×
        </span>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Filas
          <input
            inputMode="numeric"
            value={text.rows}
            aria-invalid={rows == null}
            onFocus={(event) => event.target.select()}
            onChange={(event) => setText((current) => ({ ...current, rows: event.target.value.replace(/[^\d]/g, '').slice(0, 2) }))}
            className={field}
          />
        </label>
        <button
          type="button"
          disabled={!valid}
          onClick={insert}
          className="ml-auto flex h-8 items-center gap-1.5 rounded-[9px] bg-primary px-3 font-semibold text-primary-foreground hover:brightness-95 disabled:opacity-50"
        >
          Insertar <kbd className="text-[11px]">↵</kbd>
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        La primera fila es el encabezado. Hasta {TABLE_MAX.cols} columnas y {TABLE_MAX.rows} filas; después puedes agregar o quitar desde «Tabla».
      </p>
    </div>
  )
}
