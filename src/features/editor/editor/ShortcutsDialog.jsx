import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { t } from '@/i18n'

const SECTIONS = [
  {
    title: t('Formato'),
    rows: [
      [t('Negrita'), 'ctrl B'],
      [t('Cursiva'), 'ctrl I'],
      [t('Tachado'), 'ctrl shift X'],
      [t('Código'), 'ctrl E'],
      [t('Enlace'), 'ctrl K'],
    ],
  },
  {
    title: t('Bloques'),
    rows: [
      [t('Lista numerada'), 'ctrl shift 7'],
      [t('Lista'), 'ctrl shift 8'],
      [t('Lista de tareas'), 'ctrl shift 9'],
      [t('Cita'), 'ctrl shift B'],
      [t('Bloque de código'), 'ctrl alt C'],
      [t('Meter / sacar de la lista'), 'tab · shift tab'],
      [t('Salto de línea'), 'shift ↵'],
    ],
  },
  {
    title: t('Escribiendo Markdown'),
    rows: [
      [t('Títulos'), '# ## ###'],
      [t('Lista · numerada · tareas'), '- · 1. · [ ]'],
      [t('Cita · código · separador'), '> · ``` · ---'],
      [t('Negrita · cursiva'), t('**texto** · *texto*')],
      [t('Código · tachado'), t('`texto` · ~~texto~~')],
    ],
  },
  {
    title: t('Insertar y terminar'),
    rows: [
      [t('Insertar bloque'), '/'],
      [t('Mencionar'), '@'],
      [t('Terminar'), 'esc · ctrl ↵'],
      [t('Estos atajos'), 'ctrl /'],
    ],
  },
]

/** Ayuda de atajos del editor (ctrl /). */
export function ShortcutsDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 sm:max-w-[640px]" onCloseAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t('Atajos del editor')}</DialogTitle>
          <DialogDescription>{t('Se guarda como Markdown: lo que escribas con estos símbolos se convierte al instante.')}</DialogDescription>
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
