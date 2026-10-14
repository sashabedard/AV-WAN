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
  EEXIST: 'Le fichier existe déjà',
  EINVAL: 'Nom ou chemin invalide',
  ENAMETOOLONG: 'Nom de fichier trop long',
  ENOTEMPTY: 'Le dossier n’est pas vide',
  EXDEV: 'Déplacement impossible entre deux disques'
}

export function frenchFsMessage(e: unknown): string {
  const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : ''
  const known = MESSAGES[code]
  if (known) return `${known} (${code}).`
  if (/^E[A-Z0-9]+$/.test(code)) return `Erreur du système de fichiers (${code}).`
  const load = e instanceof Error ? /ERR_[A-Z0-9_]+/.exec(e.message) : null
  if (load) return `Chargement de la fenêtre d’impression impossible (${load[0]}).`
  return e instanceof Error ? e.message : String(e)
}

export async function frenchErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (e) {
    throw new Error(frenchFsMessage(e))
  }
}
