// Barre du haut.
export const topbar = {
  langGroup: (p: { name: string }) => `Langue : ${p.name}`,
  menu: 'Menu',
  menuTitle: 'Fichier, Édition, Affichage, Aide',
  unsaved: 'Modifications non enregistrées',
  readOnly: 'Lecture seule',
  export: 'Exporter',
  exportTitle: 'Exporter le PDF, le CSV ou le classeur Excel (⌘E)'
} as const
