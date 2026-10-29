import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const SECTIONS = [
  {
    title: 'Formato',
    rows: [
      ['Negrita', 'ctrl B'],
      ['Cursiva', 'ctrl I'],
      ['Tachado', 'ctrl shift X'],
      ['Código', 'ctrl E'],
      ['Enlace', 'ctrl K'],
    ],
  },
  {
    title: 'Bloques',
    rows: [
      ['Lista numerada', 'ctrl shift 7'],
      ['Lista', 'ctrl shift 8'],
      ['Lista de tareas', 'ctrl shift 9'],
      ['Cita', 'ctrl shift B'],
      ['Bloque de código', 'ctrl alt C'],
      ['Meter / sacar de la lista', 'tab · shift tab'],
      ['Salto de línea', 'shift ↵'],
    ],
  },
  {
    title: 'Escribiendo Markdown',
    rows: [
      ['Títulos', '# ## ###'],
      ['Lista · numerada · tareas', '- · 1. · [ ]'],
      ['Cita · código · separador', '> · ``` · ---'],
      ['Negrita · cursiva', '**texto** · *texto*'],
      ['Código · tachado', '`texto` · ~~texto~~'],
    ],
  },
  {
    title: 'Insertar y terminar',
    rows: [
      ['Insertar bloque', '/'],
      ['Mencionar', '@'],
      ['Terminar', 'esc · ctrl ↵'],
      ['Estos atajos', 'ctrl /'],
    ],
  },
]

/** Ayuda de atajos del editor (ctrl /). */
export function ShortcutsDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 sm:max-w-[640px]" onCloseAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Atajos del editor</DialogTitle>
          <DialogDescription>Se guarda como Markdown: lo que escribas con estos símbolos se convierte al instante.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h3 className="mb-1.5 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">{section.title}</h3>
              <dl className="flex flex-col gap-1 text-[13px]">
                {section.rows.map(([label, keys]) => (
                  <div key={label} className="flex items-baseline justify-between gap-3">
                    <dt>{label}</dt>
                    <dd className="font-mono text-xs text-muted-foreground">{keys}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
