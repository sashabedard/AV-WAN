// Boîtes de dialogue du processus principal, filtres d’export, nom de fichier par défaut.
export const dialogs = {
  quitWithoutSaving: 'Quitter sans enregistrer',
  unsavedMessage: 'Des modifications ne sont pas enregistrées.',
  unsavedDetail: 'Elles seront perdues si vous quittez maintenant.',
  aboutTitle: (p: { app: string }) => `À propos d’${p.app}`,
  aboutVersion: (p: { version: string }) => `Version ${p.version}`,
  replace: 'Remplacer',
  replaceCsvMessage: 'Remplacer les fichiers CSV existants ?',
  projectFilter: 'Projet AV·WAN',
  filterPdf: 'Document PDF',
  filterCsv: 'Fichiers CSV',
  filterXlsx: 'Classeur Excel',
  defaultProjectName: 'Nouveau projet',
  fallbackFileName: 'projet',
  reservedSuffix: 'projet'
} as const
