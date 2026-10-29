/** Íconos de la barra de formato y del menú «/» (los trazos del diseño, 24×24). */
export const ICON_PATHS = {
  bold: 'M7 5h6a3.5 3.5 0 0 1 0 7H7z M7 12h7a3.5 3.5 0 0 1 0 7H7z',
  italic: 'M19 4h-9 M14 20H5 M15 4L9 20',
  strike: 'M16 5H10a3 3 0 0 0-1.5 5.6 M14.5 13.5A3 3 0 0 1 13 19H6 M4 12h16',
  code: 'M16 18l6-6-6-6 M8 6l-6 6 6 6',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  bullet: 'M9 6h11 M9 12h11 M9 18h11 M4 6h.01 M4 12h.01 M4 18h.01',
  ordered: 'M10 6h11 M10 12h11 M10 18h11 M4 4.5h1V9 M3.5 9h2.5 M3.5 14.5a1.2 1.2 0 0 1 2.3.4c0 1-2.3 1.6-2.3 3.1h2.5',
  task: 'M3.5 4.5h5v5h-5z M3.5 14.5h5v5h-5z M4.8 17l1.2 1.2 2-2.4 M12 7h9 M12 17h9',
  quote:
    'M10 11H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5c0 2.5-1.5 4-4 5 M20 11h-4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5c0 2.5-1.5 4-4 5',
  codeBlock: 'M4 4h16v16H4z M10 10l-2 2 2 2 M14 10l2 2-2 2',
  divider: 'M3 12h18 M8 6h8 M8 18h8',
  image: 'M4 5h16v14H4z M4 16l4.5-4.5 4 4 3-3L20 17 M9 9.5h.01',
  table: 'M3 5h18v14H3z M3 10h18 M3 15h18 M9 5v14',
  mention: 'M16 12a4 4 0 1 1-8 0a4 4 0 0 1 8 0z M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1',
  taskLink: 'M5 4v10a3 3 0 0 0 3 3h11 M15 13l4 4-4 4',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
}

/** @param {{ name: keyof typeof ICON_PATHS, size?: number, strokeWidth?: number | string, className?: string }} props */
export function EditorIcon({ name, size = 16, strokeWidth = 2, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}

/** Grosor del trazo de cada ícono en el diseño. */
export const ICON_STROKE = { bold: 2.4, bullet: 2.2, quote: 1.8, more: 3 }
