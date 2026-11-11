import { toast } from 'sonner'
import { t } from '@/i18n'
import { flash } from '@/lib/flash'
import { canAnimate } from '@/lib/intro'
import { isStory } from './issueTypes'

/**
 * Las dos animaciones de una tarea que tienen que notarse esté donde esté: la que se acaba de crear y la que se acaba
 * de completar. Las dos se hacen solo con `transform` y `opacity` (un elemento cada vez), y sin animaciones («menos
 * movimiento») queda el resaltado y el aviso.
 */

const EASE = 'cubic-bezier(0.5, 0, 0.2, 1)'
const CHIP_HEIGHT = 46
/** Lo que se espera (ms) a que la tarea nueva aparezca en la lista o el tablero: llega con la recarga. */
const WAIT_FOR_ROW = 1500
/** Lo que tarda el diálogo en encogerse hasta la ficha (ms). */
const SHRINK = 300

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const finished = (animation) => animation.finished.then(() => {}, () => {})

/** Espera a que `selector` exista dentro de `root`, hasta `ms`; `null` si no llega (la tarea no entra en la vista actual). */
async function waitFor(root, selector, ms) {
  const start = performance.now()
  for (;;) {
    const element = root.isConnected ? root.querySelector(selector) : null
    if (element) return element
    if (performance.now() - start > ms) return null
    await nextFrame()
  }
}

/**
 * Si el elemento no se ve entero (más abajo en la lista, al final de una columna del tablero, en una columna fuera de
 * la pantalla), lo trae a la vista moviendo solo los contenedores que la persona puede desplazar. `scrollIntoView` no
 * sirve aquí: también mueve los contenedores con `overflow: hidden`, y el tablero quedaba corrido, sin encabezados.
 */
function reveal(element) {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const page = parent === document.documentElement
    const { overflowX, overflowY } = getComputedStyle(parent)
    const rect = element.getBoundingClientRect()
    const bounds = page ? { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth } : parent.getBoundingClientRect()
    const scrollsY = (page || /auto|scroll/.test(overflowY)) && parent.scrollHeight > parent.clientHeight + 1
    const scrollsX = (page || /auto|scroll/.test(overflowX)) && parent.scrollWidth > parent.clientWidth + 1
    if (scrollsY && (rect.top < bounds.top || rect.bottom > bounds.bottom)) {
      parent.scrollTop += rect.top + rect.height / 2 - (bounds.top + bounds.bottom) / 2
    }
    if (scrollsX && (rect.left < bounds.left || rect.right > bounds.right)) {
      parent.scrollLeft += rect.left + rect.width / 2 - (bounds.left + bounds.right) / 2
    }
  }
}

/**
 * Al crear una tarea: el diálogo se encoge hasta ser una ficha con el código y el título, y la ficha viaja suavemente
 * hasta el lugar donde quedó la tarea (su fila en la lista o su tarjeta en el tablero), que se trae a la vista si
 * hacía falta y queda resaltada. Si la tarea no aparece en la vista actual (un filtro la deja fuera), la ficha se
 * desvanece: el aviso de «creada» ya lo dice.
 * @param {DOMRect | null | undefined} from dónde estaba el diálogo
 * @param {{ id: string, code: string, title: string }} issue
 * @param {ParentNode | null} [within] dónde buscar la tarea: el panel que queda abierto debajo del diálogo (una subtarea
 *   creada desde el detalle de su tarea va a su fila en ese panel, no a la lista que el panel tapa); sin él, la página
 */
export async function landNewTask(from, issue, within = null) {
  const selector = `[data-issue-id="${issue.id}"]`
  if (!canAnimate() || !from || from.width === 0) {
    flash('created', issue.id, 2200)
    return
  }
  const width = Math.min(460, from.width - 48)
  const left = from.left + (from.width - width) / 2
  const top = from.top + (from.height - CHIP_HEIGHT) / 2

  // La caja del diálogo, que se encoge hasta el tamaño de la ficha y se desvanece…
  const shell = document.createElement('div')
  shell.className = 'tf-ghost'
  shell.setAttribute('aria-hidden', 'true')
  Object.assign(shell.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` })
  // …y la ficha de la tarea, que aparece en su centro
  const chip = document.createElement('div')
  chip.className = 'tf-task-chip'
  chip.setAttribute('aria-hidden', 'true')
  Object.assign(chip.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${CHIP_HEIGHT}px` })
  const code = document.createElement('span')
  code.textContent = issue.code
  const title = document.createElement('strong')
  title.textContent = issue.title
  chip.append(code, title)
  chip.style.opacity = '0'
  document.body.append(shell, chip)
  // La caja ya tapa al diálogo, pero el movimiento empieza dos cuadros después: en el primero la página está ocupada
  // cerrando el diálogo, y una animación que arranca ahí se ve a saltos
  await nextFrame()
  await nextFrame()
  chip.style.opacity = ''

  const shrink = shell.animate(
    [
      { transformOrigin: '0 0', transform: 'none', opacity: 1 },
      { transformOrigin: '0 0', transform: `translate(${left - from.left}px, ${top - from.top}px) scale(${width / from.width}, ${CHIP_HEIGHT / from.height})`, opacity: 0 },
    ],
    { duration: SHRINK, easing: EASE, fill: 'forwards' },
  )
  finished(shrink).then(() => shell.remove())
  const appear = chip.animate(
    [
      { opacity: 0, transform: 'scale(1.12)' },
      { opacity: 1, transform: 'none' },
    ],
    { duration: SHRINK, easing: EASE, fill: 'both' },
  )

  const [target] = await Promise.all([waitFor(within ?? document, selector, WAIT_FOR_ROW), finished(appear)])
  if (!target || !target.isConnected) {
    // No está en esta vista: la ficha se va hacia abajo
    await finished(chip.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(12px)' }], { duration: 220, easing: 'ease-in', fill: 'forwards' }))
    chip.remove()
    flash('created', issue.id, 2200)
    return
  }
  reveal(target)
  await nextFrame()
  const rect = target.getBoundingClientRect()
  // Una fila: la ficha queda sobre ella, centrada a lo alto. Una tarjeta del tablero: sobre su parte de arriba
  const scale = Math.min(1, rect.width / width)
  const landTop = rect.height > CHIP_HEIGHT * 1.6 ? rect.top + 4 : rect.top + (rect.height - CHIP_HEIGHT * scale) / 2
  const dx = rect.left - left
  const dy = landTop - top
  const duration = Math.round(Math.min(640, Math.max(420, 360 + Math.hypot(dx, dy) * 0.3)))
  const landed = `translate(${dx}px, ${dy}px) scale(${scale})`
  const flight = chip.animate(
    [
      { transformOrigin: '0 0', transform: 'none', opacity: 1 },
      { transformOrigin: '0 0', transform: landed, opacity: 1, offset: 0.8 },
      { transformOrigin: '0 0', transform: landed, opacity: 0 },
    ],
    { duration, easing: EASE, fill: 'forwards' },
  )
  // La tarea se resalta cuando la ficha llega (antes del desvanecido final)
  setTimeout(() => flash('created', issue.id, 2000), duration * 0.72)
  await finished(flight)
  chip.remove()
}

/** El check verde que se dibuja en el aviso de «completada». */
function DoneMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="tf-state-done size-[18px] shrink-0">
      <circle cx="8" cy="8" r="7" fill="var(--ok-dot)" />
      <path d="M5 8.2l2 2 4-4.2" pathLength="1" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Una tarea acaba de pasar a un estado completado. Se nota en dos sitios: su fila o tarjeta se enciende en verde donde
 * haya quedado (ver `tf-done-flash`) y, como al completarla suele cambiar de grupo o de columna y salir de la vista,
 * un aviso con el check dibujándose lo confirma siempre. Un aviso reemplaza al anterior: completar varias seguidas no
 * los apila. Las historias tienen sus propios avisos al cerrarse: solo se encienden.
 * @param {{ id: string, code: string, title: string }} issue
 */
export function signalCompleted(issue) {
  flash('completed', issue.id, 1900)
  if (isStory(issue)) return
  toast(t('{code} completada', { code: issue.code }), { id: 'issue-completed', description: issue.title, duration: 2600, icon: <DoneMark /> })
}

/** Si el cambio dejó la tarea completada y antes no lo estaba. */
export const becameCompleted = (before, after) => after?.state?.group === 'COMPLETED' && Boolean(before) && before.state?.group !== 'COMPLETED'
