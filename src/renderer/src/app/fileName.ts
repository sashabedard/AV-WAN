// Nom du fichier affiché (barre, titre de la fenêtre, messages), à partir d'un chemin macOS ou Windows.
import { currentMessages } from '../i18n/useT'

export function fileNameOf(path: string | null): string {
  if (!path) return currentMessages().app.untitled
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}
