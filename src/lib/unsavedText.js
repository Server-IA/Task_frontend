import { toast } from 'sonner'

/**
 * Aviso persistente con un texto que no se pudo guardar y «Copiar mi texto», para que no se pierda.
 * @param {string} title
 * @param {string} description
 * @param {string} text lo que había escrito la persona
 */
export function warnUnsavedText(title, description, text) {
  toast.warning(title, {
    description,
    duration: Infinity,
    action: {
      label: 'Copiar mi texto',
      onClick: () => {
        navigator.clipboard
          ?.writeText(text)
          .then(() => toast.success('Tu texto quedó copiado'))
          .catch(() => {})
      },
    },
  })
}
