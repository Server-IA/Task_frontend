import { useEffect, useRef, useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/common/Loaders'
import { Segmented } from '@/components/common/Segmented'
import { formatSize } from '@/features/files/fileTypes'
import { cn } from '@/lib/utils'
import { MAX_ZOOM, MIN_ZOOM, clampOffset, clampZoom, cropRect, loadImage, renderCrop, zoomOffset } from './cropImage'

/** Área de recorte: 320 px, con el marco de 260 px en el centro. */
const STAGE = 320
const FRAME = 260
const INSET = (STAGE - FRAME) / 2
const STEP = 10
const ZOOM_STEP = 0.1

const SHAPES = [
  { value: 'circle', label: 'Círculo' },
  { value: 'square', label: 'Cuadrado' },
]

/** Tamaños de la vista previa (perfil, miembros, tarjetas) y su redondeo en «Cuadrado». */
const PREVIEWS = [
  { size: 72, radius: 22 },
  { size: 34, radius: 10 },
  { size: 24, radius: 7 },
]

/**
 * «Ajusta tu foto»: la foto elegida se mueve arrastrándola y se acerca con la rueda o el control; se guarda una copia
 * cuadrada de 512 × 512 (la original no se sube).
 * @param {{ file: File | null, onCancel: () => void, onSave: (blob: Blob) => void, onPickAnother: () => void,
 *           onError: (message: string) => void }} props
 */
export function AvatarCropDialog({ file, onCancel, onSave, onPickAnother, onError }) {
  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-[560px]"
        // El foco va al área de recorte (las flechas mueven la foto y ↵ guarda), no a «Cerrar»
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {file && <CropEditor key={`${file.name}:${file.size}:${file.lastModified}`} file={file} onCancel={onCancel} onSave={onSave} onPickAnother={onPickAnother} onError={onError} />}
      </DialogContent>
    </Dialog>
  )
}

function CropEditor({ file, onSave, onPickAnother, onError }) {
  const [loaded, setLoaded] = useState(null)
  const [view, setView] = useState({ zoom: MIN_ZOOM, offset: { x: 0, y: 0 } })
  const [shape, setShape] = useState('circle')
  const [saving, setSaving] = useState(false)
  const stageRef = useRef(null)
  const drag = useRef(null)
  const errorRef = useRef(onError)

  useEffect(() => {
    errorRef.current = onError
  })

  useEffect(() => {
    stageRef.current?.focus()
  }, [])

  useEffect(() => {
    let current = null
    let cancelled = false
    loadImage(file).then(
      (result) => {
        if (cancelled) return URL.revokeObjectURL(result.url)
        current = result
        setLoaded(result)
      },
      (error) => !cancelled && errorRef.current(error.message),
    )
    return () => {
      cancelled = true
      if (current) URL.revokeObjectURL(current.url)
    }
  }, [file])

  const size = loaded ? { width: loaded.width, height: loaded.height } : null

  /** Cambia el zoom manteniendo el mismo punto de la foto en el centro. */
  const zoomTo = (next) =>
    setView((current) => {
      const zoom = clampZoom(next(current.zoom))
      return { zoom, offset: zoomOffset(size, { frame: FRAME, offset: current.offset, from: current.zoom, to: zoom }) }
    })
  const moveBy = (dx, dy) =>
    setView((current) => ({ ...current, offset: clampOffset(size, { zoom: current.zoom, frame: FRAME, offset: { x: current.offset.x + dx, y: current.offset.y + dy } }) }))

  // La rueda acerca y aleja (el listener no es pasivo para que la página no se desplace)
  const zoomRef = useRef(zoomTo)
  useEffect(() => {
    zoomRef.current = zoomTo
  })
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined
    const onWheel = (event) => {
      event.preventDefault()
      zoomRef.current((zoom) => zoom * Math.exp(-event.deltaY * 0.0015))
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [loaded])

  const save = async () => {
    if (!loaded || saving) return
    setSaving(true)
    try {
      const blob = await renderCrop(loaded.image, cropRect(size, { zoom: view.zoom, frame: FRAME, offset: view.offset }))
      onSave(blob)
    } catch (error) {
      toast.error(error.message || 'No se pudo preparar la foto.')
      setSaving(false)
    }
  }

  const rect = size ? cropRect(size, { zoom: view.zoom, frame: FRAME, offset: view.offset }) : null
  /** Estilo para dibujar el recorte en un cuadrado de `side` px. */
  const placed = (side) => {
    const scale = side / rect.size
    return { width: size.width * scale, height: size.height * scale, left: -rect.sx * scale, top: -rect.sy * scale }
  }
  const onStage = rect ? placed(FRAME) : null
  const percent = Math.round(view.zoom * 100)
  const meta = [file.name, formatSize(file.size), loaded && `${loaded.width} × ${loaded.height}`].filter(Boolean).join(' · ')

  return (
    <div
      onKeyDown={(event) => {
        // ↵ guarda (salvo sobre un botón o enlace, que hacen lo suyo)
        if (event.key === 'Enter' && !event.target.closest('button, a')) {
          event.preventDefault()
          save()
        }
      }}
    >
      <div className="flex items-center gap-2.5 border-b px-[18px] py-4">
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-[17px] font-semibold">Ajusta tu foto</DialogTitle>
          <DialogDescription className="mt-0.5 truncate font-mono text-[11.5px]">{meta}</DialogDescription>
        </div>
        <DialogClose asChild>
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Cerrar">
            <X className="size-4" />
          </Button>
        </DialogClose>
      </div>

      <div className="flex gap-5 p-[18px]">
        <div className="flex flex-col gap-3">
          <div
            ref={stageRef}
            role="group"
            tabIndex={0}
            aria-label="Área de recorte: arrastra para mover la foto"
            aria-roledescription="recorte"
            className={cn(
              'relative shrink-0 touch-none overflow-hidden rounded-[14px] bg-[#1E1C19] outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
              loaded ? 'cursor-grab active:cursor-grabbing' : 'animate-pulse',
            )}
            style={{ width: STAGE, height: STAGE }}
            onPointerDown={(event) => {
              if (!loaded || event.button !== 0) return
              event.currentTarget.setPointerCapture?.(event.pointerId)
              drag.current = { x: event.clientX, y: event.clientY, offset: view.offset }
            }}
            onPointerMove={(event) => {
              const start = drag.current
              if (!start) return
              const offset = { x: start.offset.x + event.clientX - start.x, y: start.offset.y + event.clientY - start.y }
              setView((current) => ({ ...current, offset: clampOffset(size, { zoom: current.zoom, frame: FRAME, offset }) }))
            }}
            onPointerUp={() => {
              drag.current = null
            }}
            onPointerCancel={() => {
              drag.current = null
            }}
            onKeyDown={(event) => {
              if (!loaded) return
              const step = event.shiftKey ? STEP * 4 : STEP
              const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
              if (moves[event.key]) moveBy(...moves[event.key])
              else if (event.key === '+' || event.key === '=') zoomTo((zoom) => zoom + ZOOM_STEP)
              else if (event.key === '-') zoomTo((zoom) => zoom - ZOOM_STEP)
              else return
              event.preventDefault()
            }}
          >
            {loaded && (
              <>
                <img
                  src={loaded.url}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute max-w-none"
                  style={{ ...onStage, left: INSET + onStage.left, top: INSET + onStage.top }}
                />
                <span
                  aria-hidden="true"
                  className={cn('absolute shadow-[0_0_0_200px_rgb(18_17_15/0.6)] outline-2 -outline-offset-1 outline-white', shape === 'circle' ? 'rounded-full' : 'rounded-none')}
                  style={{ left: INSET, top: INSET, width: FRAME, height: FRAME }}
                />
                <span aria-hidden="true" className="absolute border border-dashed border-white/55" style={{ left: INSET, top: INSET, width: FRAME, height: FRAME }} />
                {[1, 2].map((third) => (
                  <span key={`v${third}`} aria-hidden="true" className="absolute w-px bg-white/30" style={{ left: INSET + (FRAME * third) / 3, top: INSET, height: FRAME }} />
                ))}
                {[1, 2].map((third) => (
                  <span key={`h${third}`} aria-hidden="true" className="absolute h-px bg-white/30" style={{ top: INSET + (FRAME * third) / 3, left: INSET, width: FRAME }} />
                ))}
              </>
            )}
          </div>
          <div className="flex items-center gap-2.5" style={{ width: STAGE }}>
            <button type="button" className="text-muted-foreground hover:text-foreground disabled:opacity-50" aria-label="Alejar" disabled={!loaded} onClick={() => zoomTo((zoom) => zoom - ZOOM_STEP)}>
              <Minus className="size-3.5" strokeWidth={2.2} />
            </button>
            <input
              type="range"
              aria-label="Zoom"
              aria-valuetext={`${percent} %`}
              min={MIN_ZOOM * 100}
              max={MAX_ZOOM * 100}
              step={1}
              value={percent}
              disabled={!loaded}
              onChange={(event) => zoomTo(() => Number(event.target.value) / 100)}
              className="h-1 min-w-0 flex-1 cursor-pointer accent-ring"
            />
            <button type="button" className="text-muted-foreground hover:text-foreground disabled:opacity-50" aria-label="Acercar" disabled={!loaded} onClick={() => zoomTo((zoom) => zoom + ZOOM_STEP)}>
              <Plus className="size-3.5" strokeWidth={2.2} />
            </button>
            <span className="w-11 text-right font-mono text-[11.5px] text-muted-foreground">{percent} %</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold">Forma</span>
            <Segmented
              label="Forma de la vista previa"
              value={shape}
              onChange={setShape}
              options={SHAPES}
              size="sm"
              className="rounded-[10px] border-transparent bg-muted p-[3px]"
              itemClassName="flex-1 rounded-lg py-[5px] text-[12.5px] text-muted-foreground"
              thumbClassName="rounded-lg bg-card shadow-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold">Vista previa</span>
            <div className="flex items-end gap-3">
              {PREVIEWS.map(({ size: side, radius }) => (
                <span
                  key={side}
                  role="img"
                  aria-label={`Vista previa ${side} px`}
                  className="relative block shrink-0 overflow-hidden bg-muted"
                  style={{ width: side, height: side, borderRadius: shape === 'circle' ? '50%' : radius }}
                >
                  {loaded && <img src={loaded.url} alt="" draggable={false} className="absolute max-w-none" style={placed(side)} />}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs leading-normal text-muted-foreground">
            Arrastra para mover y usa la rueda o el control para acercar. Se guarda una copia cuadrada de 512 × 512 en WebP; la original no se sube.
          </p>
          <button type="button" className="self-start text-[12.5px] font-medium text-accent-text underline underline-offset-2 hover:no-underline" onClick={onPickAnother}>
            Elegir otra imagen
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t bg-subtle px-[18px] py-3">
        <span className="mr-auto font-mono text-[11px] text-muted-foreground">
          <kbd className="text-foreground">↵</kbd> guardar · <kbd className="text-foreground">esc</kbd> cancelar
        </span>
        <DialogClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
        <Button onClick={save} disabled={!loaded || saving}>
          {saving && <Spinner />}
          Guardar foto
        </Button>
      </div>
    </div>
  )
}
