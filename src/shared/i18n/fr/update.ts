// Vérification des mises à jour (menu Aide).
export const update = {
  notPackaged: 'Les mises à jour ne sont vérifiées que dans l’app installée.',
  store: 'Les mises à jour d’AV·WAN passent par le Microsoft Store.',
  storeDetail: 'Microsoft Store › Bibliothèque › Obtenir les mises à jour.',
  upToDate: (p: { current: string }) => `AV·WAN est à jour (${p.current}).`,
  downloading: (p: { version: string }) => `La version ${p.version} se télécharge.`,
  downloadingDetail: 'Un bandeau proposera de redémarrer quand elle sera prête.',
  ready: (p: { version: string }) => `La version ${p.version} est prête.`,
  readyDetail: 'Redémarrez AV·WAN pour l’installer.',
  checkFailed: 'Impossible de vérifier les mises à jour.',
  offline: 'Pas de connexion à Internet, ou GitHub est inaccessible.',
  noRelease: 'Aucune version publiée n’a été trouvée.',
  rateLimited: 'GitHub limite temporairement les vérifications. Réessayez plus tard.',
  unexpected: (p: { reason: string }) => `Erreur inattendue du service de mises à jour. (${p.reason})`
} as const
