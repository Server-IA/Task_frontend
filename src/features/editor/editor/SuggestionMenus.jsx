import { UserAvatar } from '@/components/common/UserAvatar'
import { normalizeForSearch } from '@/features/mentions/mentions'
import { t } from '@/i18n'
import { ROLE_LABELS } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { EditorIcon, ICON_STROKE } from './icons'

/**
 * Opciones del menú «/». `needs` indica qué hace falta para mostrarla (personas para mencionar, workspace para
 * buscar tareas); `run` recibe la cadena de comandos ya sin el «/…» escrito.
 */
const SLASH_GROUPS = [
  {
    title: t('Bloques'),
    items: [
      { id: 'h1', label: t('Título 1'), desc: t('Sección grande'), hint: '#', glyph: 'H1', keywords: 'titulo encabezado heading title', run: (chain) => chain.setHeading({ level: 1 }) },
      { id: 'h2', label: t('Título 2'), desc: t('Sección'), hint: '##', glyph: 'H2', keywords: 'titulo encabezado heading title', run: (chain) => chain.setHeading({ level: 2 }) },
      { id: 'h3', label: t('Título 3'), desc: t('Subsección'), hint: '###', glyph: 'H3', keywords: 'titulo encabezado heading title', run: (chain) => chain.setHeading({ level: 3 }) },
      { id: 'bullet', label: t('Lista'), desc: t('Puntos simples'), hint: '-', icon: 'bullet', keywords: 'lista vinetas puntos list bullets bulleted unordered', run: (chain) => chain.toggleBulletList() },
      { id: 'ordered', label: t('Lista numerada'), desc: t('Pasos en orden'), hint: '1.', icon: 'ordered', keywords: 'lista numerada numeros pasos numbered ordered list steps', run: (chain) => chain.toggleOrderedList() },
      { id: 'task', label: t('Lista de tareas'), desc: t('Casillas para marcar'), hint: '[ ]', icon: 'task', keywords: 'lista de tareas casillas todo checklist task list checkboxes', run: (chain) => chain.toggleTaskList() },
      { id: 'quote', label: t('Cita'), desc: t('Texto citado o decisión'), hint: '>', icon: 'quote', keywords: 'cita historia usuario quote blockquote user story', run: (chain) => chain.toggleBlockquote() },
      { id: 'code', label: t('Código'), desc: t('Bloque con lenguaje'), hint: '```', icon: 'codeBlock', keywords: 'codigo code bloque block snippet', run: (chain) => chain.toggleCodeBlock() },
      { id: 'table', label: t('Tabla'), desc: t('Eliges columnas y filas'), hint: '', icon: 'table', keywords: 'tabla table cuadro filas columnas grid rows columns' },
      { id: 'divider', label: t('Separador'), desc: t('Línea horizontal'), hint: '---', icon: 'divider', keywords: 'separador linea hr divider line rule horizontal', run: (chain) => chain.setHorizontalRule() },
    ],
  },
  {
    title: t('Insertar'),
    items: [
      { id: 'mention', label: t('Mencionar persona'), desc: t('Le llega a su bandeja'), hint: '@', icon: 'mention', needs: 'people', keywords: 'mencionar persona arroba mention person people at' },
      { id: 'taskLink', label: t('Enlazar tarea'), desc: t('Busca por código o título'), hint: 'WEB-', icon: 'taskLink', needs: 'tasks', keywords: 'enlazar tarea referencia codigo link task reference code' },
      { id: 'image', label: t('Imagen'), desc: t('Elige una, o pega una captura'), icon: 'image', needs: 'images', keywords: 'imagen foto captura subir image picture photo screenshot upload' },
    ],
  },
]

/**
 * Grupos del menú «/» que coinciden con lo escrito después de la barra.
 * @param {string} query
 * @param {{ people: boolean, tasks: boolean, taskHint?: string, images?: boolean }} features
 */
export function slashGroups(query, features) {
  const needle = normalizeForSearch(query.trim())
  return SLASH_GROUPS.map((group) => ({
    ...group,
    items: group.items
      .filter((item) => !item.needs || features[item.needs])
      .filter((item) => !needle || normalizeForSearch(`${item.label} ${item.keywords ?? ''} ${item.glyph ?? ''}`).includes(needle))
      .map((item) => (item.id === 'taskLink' && features.taskHint ? { ...item, hint: `${features.taskHint}-` } : item)),
  })).filter((group) => group.items.length > 0)
}

const footer = (action) => (
  <p className="flex gap-3 border-t px-3.5 py-2 font-mono text-[11px] text-muted-foreground">
    <span>
      <kbd className="text-foreground">↑↓</kbd> {t('elegir')}
    </span>
    <span>
      <kbd className="text-foreground">↵</kbd> {action}
    </span>
    <span>
      <kbd className="text-foreground">esc</kbd> {t('cerrar')}
    </span>
  </p>
)

/** Menú «/»: bloques e inserciones. `active` es el id de la opción marcada. */
export function SlashMenu({ groups, active, onSelect, onHover, style }) {
  return (
    <div
      role="listbox"
      aria-label={t('Insertar bloque')}
      style={style}
      onMouseDown={(event) => event.preventDefault()}
      className="tf-pop absolute z-40 flex max-h-[min(420px,60vh)] w-[330px] max-w-full flex-col overflow-hidden rounded-[14px] border bg-popover text-popover-foreground shadow-[0_18px_44px_rgb(35_32_27/0.22)]"
    >
      <div className="min-h-0 overflow-y-auto">
        {groups.map((group, groupIndex) => (
          <div key={group.title} role="group" aria-label={group.title} className={cn('flex flex-col p-1.5', groupIndex > 0 && 'border-t')}>
            <p className="px-2 pt-1.5 pb-1 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">{group.title}</p>
            {group.items.map((item) => {
              const selected = item.id === active
              return (
                <div
                  key={item.id}
                  id={`slash-${item.id}`}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={item.disabled || undefined}
                  title={item.disabled ? t('Imágenes: llega con la subida de archivos') : undefined}
                  onClick={() => !item.disabled && onSelect(item)}
                  onMouseMove={() => !item.disabled && !selected && onHover(item.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-[9px] px-2 py-1.25',
                    item.disabled ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer',
                    selected && 'bg-accent-soft text-accent-text',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-lg border font-mono text-[11.5px] font-semibold',
                      selected ? 'bg-card' : 'bg-subtle',
                    )}
                  >
                    {item.glyph ?? <EditorIcon name={item.icon} size={15} strokeWidth={ICON_STROKE[item.icon] ?? 2} />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col leading-[1.3]">
                    <span className="text-[13.5px] font-medium">{item.label}</span>
                    <span className="text-[11.5px] text-muted-foreground">{item.desc}</span>
                  </span>
                  {item.hint && <span className="font-mono text-[11px] text-muted-foreground">{item.hint}</span>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      {footer(t('insertar'))}
    </div>
  )
}

/** Personas para mencionar (igual que en los comentarios). */
export function MentionMenu({ people, active, onSelect, onHover, style }) {
  return (
    <div
      style={style}
      onMouseDown={(event) => event.preventDefault()}
      className="tf-pop absolute z-40 w-[300px] max-w-full overflow-hidden rounded-[14px] border bg-popover text-popover-foreground shadow-[0_18px_44px_rgb(35_32_27/0.22)]"
    >
      <p className="px-3 pt-2 pb-1 font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">{t('Personas del proyecto')}</p>
      <ul role="listbox" aria-label={t('Mencionar a')} className="flex flex-col gap-0.5 px-1.5 pb-1.5">
        {people.map((person, index) => (
          <li
            key={person.id}
            role="option"
            aria-selected={index === active}
            onClick={() => onSelect(person)}
            onMouseMove={() => index !== active && onHover(index)}
            className={cn('flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-sm', index === active && 'bg-accent-soft')}
          >
            <UserAvatar user={person} size="sm" />
            <span className={cn('min-w-0 flex-1 truncate', index === active ? 'font-semibold' : 'font-medium')}>{person.fullName}</span>
            {person.role && <span className="shrink-0 text-xs text-muted-foreground">{person.roleName ?? ROLE_LABELS[person.role]}</span>}
          </li>
        ))}
      </ul>
      {footer(t('mencionar'))}
    </div>
  )
}
