// Nom du fichier affiché (barre, titre de la fenêtre, messages), à partir d'un chemin macOS ou Windows.
export function fileNameOf(path: string | null): string {
  if (!path) return 'Sans titre'
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}
