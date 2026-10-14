// Les erreurs du système de fichiers arrivent en anglais (« ENOENT: no such file… ») : on les dit en français.
const MESSAGES: Record<string, string> = {
  ENOENT: 'Fichier ou dossier introuvable',
  EACCES: 'Accès refusé',
  EPERM: 'Opération non permise',
  EISDIR: 'C’est un dossier, pas un fichier',
  ENOTDIR: 'Un élément du chemin n’est pas un dossier',
  ENOSPC: 'Plus d’espace sur le disque',
  EROFS: 'Disque en lecture seule',
  EBUSY: 'Fichier occupé par une autre application',
  EMFILE: 'Trop de fichiers ouverts',
  EEXIST: 'Le fichier existe déjà'
}

export function frenchFsMessage(e: unknown): string {
  const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : ''
  const known = MESSAGES[code]
  if (known) return `${known} (${code}).`
  return e instanceof Error ? e.message : String(e)
}

export async function frenchErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (e) {
    throw new Error(frenchFsMessage(e))
  }
}
