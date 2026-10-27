import { cn } from '@/lib/utils'

/** Pares fondo/texto para la pastilla del proyecto; el color depende del identificador para que sea estable. */
const COLORS = [
  'bg-[#2EC4A0] text-[#0B2A22]',
  'bg-[#FFC145] text-[#3A2A00]',
  'bg-[#8CCBFF] text-[#0B2540]',
  'bg-[#FFA6CB] text-[#3D0F24]',
  'bg-[#B6A6FF] text-[#1C1240]',
  'bg-[#F6A35C] text-[#3A1E05]',
  'bg-[#9BE7B4] text-[#0E3A1E]',
]

export function projectColor(text = '') {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return COLORS[Math.abs(hash) % COLORS.length]
}

/** Pastilla con el identificador del proyecto en monoespaciada («WEB»). */
export function ProjectIcon({ project, className }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center justify-center rounded-[5px] px-1.5 font-mono text-[10px] font-semibold',
        projectColor(project?.identifier),
        className,
      )}
    >
      {project?.identifier ?? '?'}
    </span>
  )
}
