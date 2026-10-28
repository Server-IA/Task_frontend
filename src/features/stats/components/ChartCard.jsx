import { useId, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Tarjeta de un gráfico: título, dato secundario y, si recibe `table`, el botón «Ver tabla» que cambia
 * el gráfico por una tabla accesible con los mismos datos.
 * @param {{ title: React.ReactNode, meta?: React.ReactNode, table?: DataTableProps, footer?: React.ReactNode,
 *           children: React.ReactNode, className?: string }} props
 */
export function ChartCard({ title, meta, table, footer, children, className }) {
  const [showTable, setShowTable] = useState(false)
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className={cn('tf-panel flex min-w-0 flex-col gap-2.5 px-4.5 py-4', className)}>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h2 id={titleId} className="text-[15px] font-semibold">
          {title}
        </h2>
        {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
        {table && (
          <button
            type="button"
            aria-pressed={showTable}
            onClick={() => setShowTable((value) => !value)}
            className="ml-auto rounded text-xs text-accent-text hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {showTable ? 'Ver gráfico' : 'Ver tabla'}
          </button>
        )}
      </div>
      {showTable ? <DataTable {...table} /> : children}
      {footer}
    </section>
  )
}

/**
 * @typedef {{ caption: string, columns: { key: string, label: string, numeric?: boolean }[],
 *             rows: Record<string, React.ReactNode>[] }} DataTableProps
 */

/** Tabla simple con los datos de un gráfico (la alternativa accesible a mirar las barras). */
export function DataTable({ caption, columns, rows }) {
  return (
    <div className="tf-fade overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-column font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={cn('px-3 py-2 text-left font-semibold', column.numeric && 'text-right')}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t">
              {columns.map((column) => (
                <td key={column.key} className={cn('px-3 py-1.5', column.numeric && 'text-right font-mono tabular-nums')}>
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Globo con el dato bajo el puntero (o el foco del teclado). Se coloca sobre `x`, `y` (píxeles dentro del
 * contenedor del gráfico); con `containerWidth` no se sale por los lados. Sin él, `x` puede ser un porcentaje.
 */
export function ChartTooltip({ x, y, containerWidth, children }) {
  const left = containerWidth ? Math.min(Math.max(x, 70), containerWidth - 70) : x
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[10px] bg-foreground px-2.5 py-2 text-xs whitespace-nowrap text-background shadow-lg"
      style={{ left, top: y - 8 }}
    >
      {children}
    </div>
  )
}

/** Primera línea del globo: contexto en monoespaciada y atenuado («semana del 13 oct»). */
export function TooltipLabel({ children }) {
  return <span className="block font-mono text-[11px] opacity-75">{children}</span>
}
