// Écran d'accueil et bandeau de récupération.
export const welcome = {
  title: 'Accueil',
  tagline: 'Planifier. Brancher. Documenter.',
  newProject: 'Nouveau projet',
  exampleProject: 'Projet exemple : installation interactive',
  open: 'Ouvrir…',
  recent: 'Fichiers récents',
  pun: 'Que le réseau soit avec toi.',
  recovery: {
    title: 'Travail non enregistré',
    restore: 'Restaurer',
    ignore: 'Ignorer',
    restoreLabel: (p: { name: string }) => `Restaurer ${p.name}`,
    ignoreLabel: (p: { name: string }) => `Ignorer ${p.name}`
  }
} as const
