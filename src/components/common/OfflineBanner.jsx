import { useSyncExternalStore } from 'react'
import { onlineManager } from '@tanstack/react-query'
import { WifiOff } from 'lucide-react'

const subscribe = (callback) => onlineManager.subscribe(callback)
const isOnline = () => onlineManager.isOnline()

/**
 * Aviso mientras el navegador está sin conexión. Sin red, React Query pone en pausa lo que pide (no da error): una
 * página que todavía no había cargado se vería vacía («Todavía no hay actividad») y un cambio quedaría esperando sin
 * decir nada. El aviso explica las dos cosas; al volver la conexión, todo se recarga y lo pendiente se guarda solo.
 * La región `status` está siempre (vacía con conexión) para que el lector de pantalla anuncie el aviso al aparecer.
 */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, isOnline, () => true)
  return (
    <div role="status" className="contents">
      {!online && (
        <div className="mb-3.5 flex shrink-0 items-center gap-2.5 rounded-xl border border-late/30 bg-late-soft px-3.5 py-2 text-[13px] text-late">
          <WifiOff className="size-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">Sin conexión.</span> Lo que ves puede no estar al día y los cambios se guardan
            cuando vuelva la conexión.
          </span>
        </div>
      )}
    </div>
  )
}
