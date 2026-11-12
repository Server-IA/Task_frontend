import { toast } from 'sonner'
import { t } from '@/i18n'

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
      label: t('Copiar mi texto'),
      onClick: () => {
        navigator.clipboard
          ?.writeText(text)
          .then(() => toast.success(t('Tu texto quedó copiado')))
          .catch(() => {})
      },
    },
  })
}
