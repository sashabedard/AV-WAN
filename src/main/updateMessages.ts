// Messages de la vérification manuelle des mises à jour (menu Aide). Sans Electron : testable.
export type ManualCheck =
  | { kind: 'not-packaged' }
  | { kind: 'store' }
  | { kind: 'up-to-date'; current: string }
  | { kind: 'downloading'; version: string }
  | { kind: 'ready'; version: string }
  | { kind: 'error'; message: string }

export function manualCheckMessage(r: ManualCheck): { message: string; detail?: string } {
  switch (r.kind) {
    case 'not-packaged':
      return { message: 'Les mises à jour ne sont vérifiées que dans l’app installée.' }
    case 'store':
      return { message: 'Les mises à jour d’AV·WAN passent par le Microsoft Store.', detail: 'Microsoft Store › Bibliothèque › Obtenir les mises à jour.' }
    case 'up-to-date':
      return { message: `AV·WAN est à jour (${r.current}).` }
    case 'downloading':
      return { message: `La version ${r.version} se télécharge.`, detail: 'Un bandeau proposera de redémarrer quand elle sera prête.' }
    case 'ready':
      return { message: `La version ${r.version} est prête.`, detail: 'Redémarrez AV·WAN pour l’installer.' }
    case 'error':
      return { message: 'Impossible de vérifier les mises à jour.', detail: r.message }
  }
}

export function updateErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|net::ERR_/.test(raw)) return 'Pas de connexion à Internet, ou GitHub est inaccessible.'
  if (/\b404\b/.test(raw)) return 'Aucune version publiée n’a été trouvée.'
  if (/\b403\b/.test(raw)) return 'GitHub limite temporairement les vérifications. Réessayez plus tard.'
  return `Erreur inattendue du service de mises à jour. (${(raw.split('\n')[0] ?? raw).slice(0, 80)})`
}
