// Écran « Quoi de neuf » : une fois au premier lancement de chaque nouvelle version. La dernière version vue
// est un réglage de l'app (localStorage, comme le thème), jamais dans le document.
type SeenStorage = Pick<Storage, 'getItem' | 'setItem'>

export const WHATS_NEW_KEY = 'avwan.lastSeenVersion'

// Vrai si `version` n'a pas encore été présentée ; la note comme vue dans le même geste.
// Jamais pendant les tests e2e, ni sans stockage (il reviendrait à chaque lancement).
export function takeWhatsNew(version: string, storage: SeenStorage | null, isE2E: boolean): boolean {
  if (isE2E || !storage) return false
  try {
    if (storage.getItem(WHATS_NEW_KEY) === version) return false
    storage.setItem(WHATS_NEW_KEY, version)
    return true
  } catch {
    return false
  }
}
